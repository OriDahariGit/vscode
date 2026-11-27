# Review Notes
Select code → right-click "Review Notes: Add Comment on Selection" (or Ctrl/Cmd+Alt+C) → type comment.
All comments go to REVIEW_COMMENTS.md in the workspace root, grouped by file.

## Run it
Open this folder in VS Code and press F5 (Extension Development Host).

## Install permanently
npx @vscode/vsce package   # creates review-notes-0.1.0.vsix
code --install-extension review-notes-0.1.0.vsix
