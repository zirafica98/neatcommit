# NeatCommit VS Code Extension

Shows NeatCommit analysis results (issues) in the VS Code Problems panel and as underlines in the editor.

**The extension is not published on the VS Code Marketplace** – it won't appear in search. You can install it manually or run from source.

## Installation

### Option A: Install from .vsix file

**From the project root (Elementer):**
```bash
npm run package:extension
```
This runs `npm install` and `npm run package` in `packages/vscode-extension`. The file `neatcommit-vscode-0.1.0.vsix` is created in `packages/vscode-extension/`.

**Or manually in the extension folder:**
```bash
cd packages/vscode-extension
npm install
npm run package
```
Then in VS Code: **Extensions** (Ctrl+Shift+X) → ellipsis (⋯) → **Install from VSIX...** → select `packages/vscode-extension/neatcommit-vscode-0.1.0.vsix`.

### Option B: Run from source (development)

1. Open `packages/vscode-extension` in VS Code.
2. Run `npm install` and `npm run compile`.
3. Press **F5** (or Run → Start Debugging) – a new VS Code window opens with the extension loaded.

### Publishing to the Marketplace (optional)

To have the extension appear in VS Code search, you need to publish it to the [Visual Studio Marketplace](https://marketplace.visualstudio.com/) (Microsoft account, `vsce publish`). That is a separate step and is not done in this repo.

## Configuration

1. **neatcommit.apiUrl** – Backend API URL (default: `https://api.neatcommit.com`). For local development use e.g. `http://localhost:3000`.
2. **neatcommit.token** – JWT for the API. Required to load results.

### How to get the JWT (token)

1. Log in to the NeatCommit dashboard and open **Settings** (in the app menu).
2. In the **API Token** section click **Copy API token** – the token is copied to the clipboard.
3. In VS Code: **File → Preferences → Settings**, search for "NeatCommit", paste the token into **NeatCommit: Token**. Or in `settings.json`: `"neatcommit.token": "eyJ..."`.

The token is your current session JWT and expires when you log out; copy a new one from Settings when needed.

## Usage

**Nothing runs automatically.** Trigger analysis in one of these ways:

1. **Analyze current branch (recommended while coding)**  
   Click **NeatCommit** in the status bar (bottom-right), or run **NeatCommit: Analyze current branch** from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).  
   This runs analysis on your **current branch** vs the default branch (e.g. `main`), **without opening a PR**. The extension triggers the analysis, waits for it to finish, then shows issues in the **Problems** panel and as underlines in the editor. Use this for live feedback while coding.

2. **Load last review**  
   Run **NeatCommit: Load last review** from the Command Palette to load the most recent **completed** review for this repo (e.g. from a PR). No new analysis is run.

Requirements: open a workspace that is a Git repo with a **GitHub** `origin` remote.

## Limitations

- Only GitHub is supported (detection via `remote.origin.url`).
- The **latest completed** review for the current repo is shown; there is no way to pick a PR or branch from the extension.
