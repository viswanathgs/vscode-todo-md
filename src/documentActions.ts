// Given `vscode.TextDocument` and `lineNumber: number` do different things with the file
// TODO: maybe this file should be a class?

import { applyEdit } from 'src/commands';
import { extensionConfig, state } from 'src/extension';
import vscode, { WorkspaceEdit } from 'vscode';

export function hideTask(document: vscode.TextDocument, lineNumber: number) {
	const wEdit = new WorkspaceEdit();
	const line = document.lineAt(lineNumber);
	wEdit.insert(document.uri, new vscode.Position(lineNumber, line.range.end.character), ' {h}');
	applyEdit(wEdit, document);
}

export function deleteTask(document: vscode.TextDocument, lineNumber: number) {
	const wEdit = new WorkspaceEdit();
	wEdit.delete(document.uri, document.lineAt(lineNumber).rangeIncludingLineBreak);
	applyEdit(wEdit, document);
}

export function getActiveDocument() {
	if (state.activeDocument === undefined) {
		vscode.window.showErrorMessage('No active document');
		throw new Error('No active document');
	}
	return state.activeDocument;
}

export async function getDocumentForDefaultFile() {
	return await vscode.workspace.openTextDocument(vscode.Uri.file(extensionConfig.defaultFile));
}
