/**
 * NeatCommit VS Code extension – scaffold.
 * TODO: Fetch analysis for current repo/branch from API and show as Diagnostics in Problems panel.
 */

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration('neatcommit');
  const apiUrl = cfg.get<string>('apiUrl') || 'https://api.neatcommit.com';
  const token = cfg.get<string>('token');

  context.subscriptions.push(
    vscode.commands.registerCommand('neatcommit.refresh', async () => {
      if (!token) {
        await vscode.window.showWarningMessage('NeatCommit: Set neatcommit.token in settings to load results.');
        return;
      }
      await vscode.window.showInformationMessage('NeatCommit: Refresh not implemented yet. Use the dashboard or PR comments.');
    })
  );

  // Placeholder: clear diagnostics so extension doesn't error
  const diag = vscode.languages.createDiagnosticCollection('neatcommit');
  context.subscriptions.push(diag);
}

export function deactivate() {}
