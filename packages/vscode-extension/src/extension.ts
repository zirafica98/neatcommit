/**
 * NeatCommit VS Code extension – fetch last review for current repo and show issues as Diagnostics.
 */

import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as path from 'path';

const DIAGNOSTIC_SOURCE = 'neatcommit';

function getGitOwnerRepo(workspaceRoot: string): { owner: string; repo: string } | null {
  try {
    const url = execSync('git config --get remote.origin.url', {
      cwd: workspaceRoot,
      encoding: 'utf-8',
    }).trim();
    // https://github.com/owner/repo.git or git@github.com:owner/repo.git
    const match = url.match(/(?:github\.com[:/]|git@github\.com:)([^/]+)\/([^/]+?)(?:\.git)?$/i);
    if (match) return { owner: match[1], repo: match[2] };
  } catch {
    // not a git repo or no origin
  }
  return null;
}

function severityToDiagnosticSeverity(severity: string): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return vscode.DiagnosticSeverity.Error;
    case 'MEDIUM':
      return vscode.DiagnosticSeverity.Warning;
    case 'LOW':
    default:
      return vscode.DiagnosticSeverity.Information;
  }
}

interface ApiIssue {
  id: string;
  filePath: string;
  line?: number | null;
  column?: number | null;
  severity: string;
  title: string;
  description: string;
}

interface ApiReview {
  id: string;
  status: string;
  repository?: { fullName: string } | null;
  issues?: ApiIssue[];
}

async function fetchReviews(apiUrl: string, token: string): Promise<ApiReview[]> {
  const base = apiUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/api/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.reviews || [];
}

async function fetchReviewDetail(apiUrl: string, token: string, reviewId: string): Promise<ApiReview> {
  const base = apiUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/api/reviews/${reviewId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function applyDiagnostics(
  diagnosticCollection: vscode.DiagnosticCollection,
  workspaceFolder: vscode.WorkspaceFolder,
  issues: ApiIssue[],
) {
  diagnosticCollection.clear();

  const byFile = new Map<string, vscode.Diagnostic[]>();

  for (const issue of issues) {
    if (!issue.filePath) continue;
    const fullPath = path.join(workspaceFolder.uri.fsPath, issue.filePath);
    const uri = vscode.Uri.file(fullPath);
    const line = Math.max(0, (issue.line ?? 1) - 1);
    const col = Math.max(0, (issue.column ?? 1) - 1);
    const range = new vscode.Range(line, col, line, Math.max(col + 1, 1));
    const severity = severityToDiagnosticSeverity(issue.severity);
    const message = `${issue.title}${issue.description ? ` – ${issue.description}` : ''}`;
    const diag = new vscode.Diagnostic(range, message, severity);
    diag.source = DIAGNOSTIC_SOURCE;
    diag.code = issue.id;

    const key = uri.toString();
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key)!.push(diag);
  }

  byFile.forEach((diagnostics, uriStr) => {
    diagnosticCollection.set(vscode.Uri.parse(uriStr), diagnostics);
  });
}

export function activate(context: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration('neatcommit');
  const apiUrl = cfg.get<string>('apiUrl') || 'https://api.neatcommit.com';
  const token = cfg.get<string>('token');

  const diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
  context.subscriptions.push(diagnosticCollection);

  const refresh = async () => {
    const t = cfg.get<string>('token') || token;
    if (!t) {
      await vscode.window.showWarningMessage(
        'NeatCommit: Set neatcommit.token in settings (JWT from dashboard) to load results.',
      );
      return;
    }

    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      await vscode.window.showWarningMessage('NeatCommit: Open a workspace folder first.');
      return;
    }

    const ownerRepo = getGitOwnerRepo(folder.uri.fsPath);
    if (!ownerRepo) {
      await vscode.window.showWarningMessage(
        'NeatCommit: Could not detect git remote (origin). Open a repo with a GitHub origin.',
      );
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: 'NeatCommit: Loading review…',
        },
        async () => {
          const reviews = await fetchReviews(apiUrl, t);
          const fullName = `${ownerRepo.owner}/${ownerRepo.repo}`;
          const latest = reviews.find((r) => r.repository?.fullName === fullName);
          if (!latest) {
            diagnosticCollection.clear();
            await vscode.window.showInformationMessage(
              `NeatCommit: No review found for ${fullName}. Run analysis from the dashboard or open a PR.`,
            );
            return;
          }
          if (latest.status !== 'completed') {
            diagnosticCollection.clear();
            await vscode.window.showInformationMessage(
              `NeatCommit: Latest review for ${fullName} is still ${latest.status}.`,
            );
            return;
          }
          const detail = await fetchReviewDetail(apiUrl, t, latest.id);
          const issues = detail.issues ?? [];
          applyDiagnostics(diagnosticCollection, folder, issues);
          await vscode.window.showInformationMessage(
            `NeatCommit: Loaded ${issues.length} issue(s) from last review.`,
          );
        },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      diagnosticCollection.clear();
      await vscode.window.showErrorMessage(`NeatCommit: ${msg}`);
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('neatcommit.refresh', refresh),
  );
}

export function deactivate() {}
