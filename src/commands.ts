import { commands, window, workspace, Range, TextEditor, TextDocument, TextLine } from 'vscode';
import * as vscode from 'vscode';

import { state, updateState, globalState } from './extension';
import { config } from './extension';
import { appendTaskToFile, getRandomInt } from './utils';
import { sortTasks, SortProperty } from './sort';
import { getFullRangeFromLines, openFileInEditor, insertSnippet, setContext } from './vscodeUtils';
import { getDateInISOFormat } from './timeUtils';
import { updateTasksTreeView } from './treeViewProviders/treeViews';
import { Task } from './parse';
import { TaskTreeItem } from './treeViewProviders/taskProvider';

const FILTER_ACTIVE_CONTEXT_KEY = 'todomd:filterActive';

export function registerCommands() {
	commands.registerTextEditorCommand(`todomd.toggleDone`, (editor, edit, treeItem?: TaskTreeItem) => {
		const ln = treeItem ? treeItem.task.ln : editor.selection.active.line;
		const task = getTaskAtLine(ln);
		if (!task) {
			return;
		}
		if (task.count) {
			incrementCountForTask(editor.document, ln, task);
		} else {
			toggleTaskAtLine(ln, editor.document);
		}
	});
	commands.registerTextEditorCommand(`todomd.archiveCompletedTasks`, editor => {
		if (!config.defaultArchiveFile) {
			noArchiveFileMessage();
			return;
		}
		const completedTasks = state.tasks.filter(t => t.done && !t.isRecurring);
		if (!completedTasks.length) {
			return;
		}
		const wEdit = new vscode.WorkspaceEdit();
		for (const task of completedTasks) {
			const line = editor.document.lineAt(task.ln);
			archiveTask(wEdit, editor.document.uri, line);
		}
		workspace.applyEdit(wEdit);
	});
	commands.registerTextEditorCommand(`todomd.archiveSelectedCompletedTasks`, editor => {
		if (!config.defaultArchiveFile) {
			noArchiveFileMessage();
			return;
		}
		const selection = editor.selection;
		const wEdit = new vscode.WorkspaceEdit();
		for (let i = selection.start.line; i <= selection.end.line; i++) {
			const task = getTaskAtLine(i);
			if (!task || !task.done) {
				continue;
			}
			const line = editor.document.lineAt(i);
			archiveTask(wEdit, editor.document.uri, line);
		}
		workspace.applyEdit(wEdit);
	});
	commands.registerTextEditorCommand(`todomd.sortByPriority`, (editor, edit) => {
		const selection = editor.selection;
		if (selection.isEmpty) {
			vscode.window.showInformationMessage('Select tasks to sort');
			return;
		}
		const lineStart = selection.start.line;
		const lineEnd = selection.end.line;
		const tasks: any[] = [];
		for (let i = lineStart; i <= lineEnd; i++) {
			const task: any = getTaskAtLine(i);
			if (task) {
				task.line = editor.document.lineAt(i).text;
				tasks.push(task);
			}
		}
		const sortedTasks: any[] = sortTasks(tasks, SortProperty.priority);
		const result = sortedTasks.map(t => t.line).join('\n');
		edit.replace(getFullRangeFromLines(editor.document, lineStart, lineEnd), result);
	});
	commands.registerCommand(`todomd.getNextTask`, async () => {
		const document = await updateState();
		let tasks = state.tasks.filter(t => !t.done);
		if (!tasks.length) {
			vscode.window.showInformationMessage('No tasks');
			return;
		}
		const dueTasks = tasks.filter(t => t.isDue);
		if (dueTasks.length) {
			tasks = dueTasks;
		} else {
			tasks = tasks.filter(t => !t.due);
		}

		const sortedTasks = sortTasks(tasks, SortProperty.priority);
		vscode.window.showInformationMessage(sortedTasks[0].title);
	});
	commands.registerCommand(`todomd.getRandomTask`, () => {
		const document = updateState();
		let tasks = state.tasks.filter(t => !t.done);
		if (!tasks.length) {
			vscode.window.showInformationMessage('No tasks');
			return;
		}
		const dueTasks = tasks.filter(t => t.isDue);
		let resultTask;
		if (dueTasks.length) {
			resultTask = dueTasks[getRandomInt(0, dueTasks.length - 1)];
		} else {
			tasks = tasks.filter(t => !t.due);
			resultTask = tasks[getRandomInt(0, tasks.length - 1)];
		}
		vscode.window.showInformationMessage(resultTask.title);
	});
	commands.registerCommand(`todomd.addTask`, async () => {
		if (state.theRightFileOpened) {
			return;
		}
		if (config.defaultFile) {
			const text = await window.showInputBox();
			if (!text) {
				return;
			}
			appendTaskToFile(text, config.defaultFile);
		}
	});
	commands.registerCommand(`todomd.openDefaultArvhiveFile`, () => {
		openFileInEditor(config.defaultArchiveFile);
	});
	commands.registerCommand(`todomd.completeTask`, async () => {
		const document = await updateState();
		const array = [];
		for (const task of state.tasks) {
			if (task.done) {
				continue;
			}
			array.push(task.title);
		}
		const result = await window.showQuickPick(array);
		if (!result) {
			return;
		}
		const task = state.tasks.find(t => t.title === result);
		if (!task) {
			return;
		}
		if (task.count) {
			incrementCountForTask(document, task.ln, task);
		} else {
			toggleTaskAtLine(task.ln, document);
		}
	});
	commands.registerTextEditorCommand(`todomd.filter`, async editor => {
		const filterStr = await vscode.window.showInputBox({
			prompt: 'Examples: #Tag, @Context, +Project',
		});
		if (!filterStr) {
			return;
		}
		setContext(FILTER_ACTIVE_CONTEXT_KEY, true);
		state.taskTreeViewFilterValue = filterStr;
		updateTasksTreeView();
	});
	commands.registerCommand(`todomd.clearFilter`, editor => {
		setContext(FILTER_ACTIVE_CONTEXT_KEY, false);
		state.taskTreeViewFilterValue = '';
		updateTasksTreeView();
	});
	commands.registerCommand(`todomd.insertTodayDate`, editor => {
		insertSnippet(getDateInISOFormat(new Date()));
	});
	commands.registerCommand(`todomd.clearGlobalState`, () => {
	// @ts-ignore No API
		globalState._value = {};
		globalState.update('hack', 'toClear');// TODO: is this required to clear state?
	});
	commands.registerCommand(`todomd.goToLine`, (lineNumber: number) => {
		const range = new vscode.Range(lineNumber, 0, lineNumber, 0);
		const { activeTextEditor } = window;
		if (!activeTextEditor) {
			return;
		}
		vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
		activeTextEditor.selection = new vscode.Selection(range.start, range.end);
		activeTextEditor.revealRange(range, vscode.TextEditorRevealType.Default);
	});
	commands.registerTextEditorCommand('todomd.resetAllRecurringTasks', editor => {
		resetAllRecurringTasks(editor);
	});
}
function archiveTask(wEdit: vscode.WorkspaceEdit, uri: vscode.Uri, line: vscode.TextLine) {
	appendTaskToFile(line.text, config.defaultArchiveFile);
	wEdit.delete(uri, line.rangeIncludingLineBreak);
}
function noArchiveFileMessage() {
	vscode.window.showWarningMessage('No default archive file specified');
}

export async function resetAllRecurringTasks(editor: TextEditor): Promise<void> {
	const wEdit = new vscode.WorkspaceEdit();
	for (const task of state.tasks) {
		if (task.isRecurring && task.done) {
			const line = editor.document.lineAt(task.ln);
			removeDoneSymbol(wEdit, editor.document.uri, line);
			removeCompletionDate(wEdit, editor.document.uri, line);
		}
	}
	await workspace.applyEdit(wEdit);
	editor.document.save();
}
function incrementCountForTask(document: vscode.TextDocument, ln: number, task: Task) {
	const line = document.lineAt(ln);
	const wEdit = new vscode.WorkspaceEdit();
	const count = task.count;
	if (!count) {
		return;
	}
	const charIndexWithOffset = count.range.start.character + 'count:'.length + 1;
	const neededRange = new vscode.Range(ln, charIndexWithOffset, ln, charIndexWithOffset + String(count.current).length);
	let newValue = 0;
	if (count.current !== count.needed) {
		newValue = count.current + 1;
		if (newValue === count.needed) {
			insertCompletionDate(wEdit, document.uri, line);
		}
	} else {
		removeCompletionDate(wEdit, document.uri, line);
	}
	wEdit.replace(document.uri, neededRange, String(newValue));
	vscode.workspace.applyEdit(wEdit);
}
export async function toggleTaskAtLine(ln: number, document: TextDocument): Promise<void> {
	const firstNonWhitespaceCharacterIndex = document.lineAt(ln).firstNonWhitespaceCharacterIndex;
	const task = getTaskAtLine(ln);
	if (!task) {
		return;
	}
	const line = document.lineAt(ln);
	const workspaceEdit = new vscode.WorkspaceEdit();
	if (task.done) {
		if (!config.addCompletionDate) {
			if (line.text.trim().startsWith(config.doneSymbol)) {
				workspaceEdit.delete(document.uri, new vscode.Range(ln, firstNonWhitespaceCharacterIndex, ln, firstNonWhitespaceCharacterIndex + config.doneSymbol.length));
			}
		} else {
			removeCompletionDate(workspaceEdit, document.uri, line);
		}
	} else {
		if (config.addCompletionDate) {
			insertCompletionDate(workspaceEdit, document.uri, line);
		} else {
			workspaceEdit.insert(document.uri, new vscode.Position(ln, firstNonWhitespaceCharacterIndex), config.doneSymbol);
		}
	}
	await workspace.applyEdit(workspaceEdit);
	document.save();

	const secondWorkspaceEdit = new vscode.WorkspaceEdit();
	if (config.autoArchiveTasks) {
		if (!task.done || task.isRecurring) {
			const possiblyChangedLine = document.lineAt(ln);
			appendTaskToFile(possiblyChangedLine.text, config.defaultArchiveFile);
			secondWorkspaceEdit.delete(document.uri, possiblyChangedLine.rangeIncludingLineBreak);
		}
	}
	await workspace.applyEdit(secondWorkspaceEdit);// Not possible to apply conflicting ranges with just one edit
	document.save();
}
function insertCompletionDate(wEdit: vscode.WorkspaceEdit, uri: vscode.Uri, line: TextLine) {
	wEdit.insert(uri, new vscode.Position(line.lineNumber, line.range.end.character), ` {cm:${getDateInISOFormat(new Date(), config.completionDateIncludeTime)}}`);
}
function removeDoneSymbol(wEdit: vscode.WorkspaceEdit, uri: vscode.Uri, line: vscode.TextLine) {
	if (line.text.trim().startsWith(config.doneSymbol)) {
		wEdit.delete(uri, new Range(line.lineNumber, line.firstNonWhitespaceCharacterIndex, line.lineNumber, line.firstNonWhitespaceCharacterIndex + config.doneSymbol.length));
	}
}
function removeCompletionDate(wEdit: vscode.WorkspaceEdit, uri: vscode.Uri, line: TextLine) {
	const completionDateRegex = /\s{cm:\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?}\s?/;
	const match = completionDateRegex.exec(line.text);
	if (match) {
		wEdit.delete(uri, new Range(line.lineNumber, match.index, line.lineNumber, match.index + match[0].length));
	}
}
export function getTaskAtLine(lineNumber: number): Task | undefined {
	for (const line of state.tasks) {
		if (line.ln === lineNumber) {
			return line;
		}
	}
	return undefined;
}