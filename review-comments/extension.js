const vscode = require('vscode');
const path = require('path');

const KEY = 'reviewNotes.comments';

function activate(context) {
  const load = () => context.workspaceState.get(KEY, []);
  const save = (c) => context.workspaceState.update(KEY, c);

  function outputUri() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return null;
    const name = vscode.workspace.getConfiguration('reviewNotes').get('outputFile', 'REVIEW_COMMENTS.md');
    return vscode.Uri.joinPath(folder.uri, name);
  }

  function render(comments) {
    const byFile = new Map();
    for (const c of comments) {
      if (!byFile.has(c.file)) byFile.set(c.file, []);
      byFile.get(c.file).push(c);
    }
    let md = '# Review Comments\n';
    for (const file of [...byFile.keys()].sort()) {
      md += `\n## ${file}\n`;
      const items = byFile.get(file).sort((a, b) => a.startLine - b.startLine);
      for (const c of items) {
        const range = c.startLine === c.endLine ? `L${c.startLine}` : `L${c.startLine}-${c.endLine}`;
        md += `\n### ${range}\n\n`;
        md += '```' + (c.lang || '') + '\n' + c.snippet + '\n```\n\n';
        md += c.comment.split('\n').map((l) => `> ${l}`).join('\n') + '\n';
      }
    }
    return md;
  }

  async function write(comments) {
    const uri = outputUri();
    if (!uri) return;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(render(comments), 'utf8'));
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('reviewNotes.addComment', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('Select some text first.');
        return;
      }
      if (!outputUri()) {
        vscode.window.showErrorMessage('Open a folder or workspace first.');
        return;
      }
      const comment = await vscode.window.showInputBox({
        prompt: 'Review comment',
        placeHolder: 'What should change?',
        ignoreFocusOut: true,
      });
      if (!comment) return;

      const sel = editor.selection;
      const doc = editor.document;
      const comments = load();
      comments.push({
        file: vscode.workspace.asRelativePath(doc.uri, false).split(path.sep).join('/'),
        startLine: sel.start.line + 1,
        endLine: sel.end.line + 1,
        snippet: doc.getText(sel),
        lang: doc.languageId,
        comment,
      });
      await save(comments);
      await write(comments);
      vscode.window.setStatusBarMessage(`Comment saved (${comments.length} total)`, 3000);
    }),

    vscode.commands.registerCommand('reviewNotes.openFile', async () => {
      const uri = outputUri();
      if (!uri) return;
      await write(load());
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
    }),

    vscode.commands.registerCommand('reviewNotes.clear', async () => {
      const pick = await vscode.window.showWarningMessage('Delete all review comments?', { modal: true }, 'Delete');
      if (pick !== 'Delete') return;
      await save([]);
      await write([]);
    })
  );
}

function deactivate() {}
module.exports = { activate, deactivate };
