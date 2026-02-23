"use strict";
/**
 * NeatCommit VS Code extension – fetch last review for current repo and show issues as Diagnostics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const child_process_1 = require("child_process");
const path = require("path");
const DIAGNOSTIC_SOURCE = 'neatcommit';
function getGitOwnerRepo(workspaceRoot) {
    try {
        const url = (0, child_process_1.execSync)('git config --get remote.origin.url', {
            cwd: workspaceRoot,
            encoding: 'utf-8',
        }).trim();
        const match = url.match(/(?:github\.com[:/]|git@github\.com:)([^/]+)\/([^/]+?)(?:\.git)?$/i);
        if (match)
            return { owner: match[1], repo: match[2] };
    }
    catch {
        // not a git repo or no origin
    }
    return null;
}
function getCurrentBranch(workspaceRoot) {
    try {
        const branch = (0, child_process_1.execSync)('git rev-parse --abbrev-ref HEAD', {
            cwd: workspaceRoot,
            encoding: 'utf-8',
        }).trim();
        return branch && branch !== 'HEAD' ? branch : null;
    }
    catch {
        return null;
    }
}
function severityToDiagnosticSeverity(severity) {
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
async function fetchReviews(apiUrl, token) {
    const base = apiUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/api/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const body = (await res.json().catch(() => ({})));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    const data = (await res.json());
    return data.reviews || [];
}
async function fetchReviewDetail(apiUrl, token, reviewId) {
    const base = apiUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/api/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const body = (await res.json().catch(() => ({})));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
}
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 min
async function triggerBranchAnalysis(apiUrl, token, owner, repo, ref) {
    const base = apiUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/api/analyze/trigger-branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ owner, repo, ref }),
    });
    const data = (await res.json().catch(() => ({})));
    if (res.status !== 202 || !data.reviewId) {
        throw new Error(data.error || `HTTP ${res.status}`);
    }
    return { reviewId: data.reviewId };
}
async function pollReviewUntilComplete(apiUrl, token, reviewId, onStatus) {
    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT_MS) {
        const detail = await fetchReviewDetail(apiUrl, token, reviewId);
        onStatus(detail.status);
        if (detail.status === 'completed' || detail.status === 'failed') {
            return detail;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    throw new Error('Analysis timed out');
}
function applyDiagnostics(diagnosticCollection, workspaceFolder, issues) {
    diagnosticCollection.clear();
    const byFile = new Map();
    for (const issue of issues) {
        if (!issue.filePath)
            continue;
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
        if (!byFile.has(key))
            byFile.set(key, []);
        byFile.get(key).push(diag);
    }
    byFile.forEach((diagnostics, uriStr) => {
        diagnosticCollection.set(vscode.Uri.parse(uriStr), diagnostics);
    });
}
function activate(context) {
    const cfg = vscode.workspace.getConfiguration('neatcommit');
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
    context.subscriptions.push(diagnosticCollection);
    const refresh = async () => {
        const apiUrl = cfg.get('apiUrl') || 'https://api.neatcommit.com';
        const t = cfg.get('token');
        if (!t) {
            await vscode.window.showWarningMessage('NeatCommit: Set neatcommit.token in settings (JWT from dashboard) to load results.');
            return;
        }
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            await vscode.window.showWarningMessage('NeatCommit: Open a workspace folder first.');
            return;
        }
        const ownerRepo = getGitOwnerRepo(folder.uri.fsPath);
        if (!ownerRepo) {
            await vscode.window.showWarningMessage('NeatCommit: Could not detect git remote (origin). Open a repo with a GitHub origin.');
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                title: 'NeatCommit: Loading review…',
            }, async () => {
                const reviews = await fetchReviews(apiUrl, t);
                const fullName = `${ownerRepo.owner}/${ownerRepo.repo}`;
                const latest = reviews.find((r) => r.repository?.fullName === fullName);
                if (!latest) {
                    diagnosticCollection.clear();
                    await vscode.window.showInformationMessage(`NeatCommit: No review found for ${fullName}. Run analysis from the dashboard or open a PR.`);
                    return;
                }
                if (latest.status !== 'completed') {
                    diagnosticCollection.clear();
                    await vscode.window.showInformationMessage(`NeatCommit: Latest review for ${fullName} is still ${latest.status}.`);
                    return;
                }
                const detail = await fetchReviewDetail(apiUrl, t, latest.id);
                const issues = detail.issues ?? [];
                applyDiagnostics(diagnosticCollection, folder, issues);
                await vscode.window.showInformationMessage(`NeatCommit: Loaded ${issues.length} issue(s) from last review.`);
            });
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnosticCollection.clear();
            await vscode.window.showErrorMessage(`NeatCommit: ${msg}`);
        }
    };
    const analyzeBranch = async () => {
        const apiUrl = cfg.get('apiUrl') || 'https://api.neatcommit.com';
        const t = cfg.get('token');
        if (!t) {
            await vscode.window.showWarningMessage('NeatCommit: Set neatcommit.token in settings to run analysis.');
            return;
        }
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            await vscode.window.showWarningMessage('NeatCommit: Open a workspace folder first.');
            return;
        }
        const ownerRepo = getGitOwnerRepo(folder.uri.fsPath);
        if (!ownerRepo) {
            await vscode.window.showWarningMessage('NeatCommit: Could not detect git remote (origin). Open a repo with a GitHub origin.');
            return;
        }
        const branch = getCurrentBranch(folder.uri.fsPath);
        if (!branch) {
            await vscode.window.showWarningMessage('NeatCommit: Could not detect current branch.');
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                title: 'NeatCommit: Analyzing current branch…',
                cancellable: false,
            }, async (progress) => {
                progress.report({ message: 'Triggering analysis…' });
                const { reviewId } = await triggerBranchAnalysis(apiUrl, t, ownerRepo.owner, ownerRepo.repo, branch);
                progress.report({ message: 'Waiting for results…' });
                const detail = await pollReviewUntilComplete(apiUrl, t, reviewId, (status) => {
                    progress.report({ message: `Status: ${status}…` });
                });
                if (detail.status === 'failed') {
                    diagnosticCollection.clear();
                    await vscode.window.showErrorMessage('NeatCommit: Analysis failed.');
                    return;
                }
                const issues = detail.issues ?? [];
                applyDiagnostics(diagnosticCollection, folder, issues);
                await vscode.window.showInformationMessage(`NeatCommit: Found ${issues.length} issue(s) on branch "${branch}".`);
            });
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnosticCollection.clear();
            await vscode.window.showErrorMessage(`NeatCommit: ${msg}`);
        }
    };
    context.subscriptions.push(vscode.commands.registerCommand('neatcommit.refresh', refresh), vscode.commands.registerCommand('neatcommit.analyzeBranch', analyzeBranch));
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'neatcommit.analyzeBranch';
    statusBarItem.text = '$(refresh) NeatCommit';
    statusBarItem.tooltip = 'Analyze current branch and show issues (no PR needed)';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map