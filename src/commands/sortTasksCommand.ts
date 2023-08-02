import { TextEditor, TextEditorEdit, window } from 'vscode';
import { TheTask } from '../TheTask';
import { $state } from '../extension';
import { SortProperty, sortTasks } from '../sort';
import { getTaskAtLineExtension } from '../utils/taskUtils';
import { getFullRangeFromLines } from '../utils/vscodeUtils';

/**
 * Sort tasks in editor. Default sort is by due date. Same due date sorted by priority.
 */
export function sortTasksInEditorCommand(editor: TextEditor, edit: TextEditorEdit, sortProperty: SortProperty): void {
	const selection = editor.selection;
	let lineStart = selection.start.line;
	let lineEnd = selection.end.line;

	if (selection.isEmpty) {
		lineStart = 0;
		lineEnd = editor.document.lineCount - 1;
	}

	if ($state.documentStartLine && lineStart <= $state.documentStartLine) {
		lineStart = $state.documentStartLine;
	}

	// Fetch only the top-level tasks within the selection to avoid messing up
	// nested tasks after sorting and to retain the tree structure.
	const tasks: TheTask[] = [];
	for (let i = lineStart; i <= lineEnd; i++) {
		let task = getTaskAtLineExtension(i);
		if (task) {
			tasks.push(task);
			// Jump past all subtasks of this task
			while (task.subtasks.length) {
				task = task.subtasks[task.subtasks.length - 1];
				i = task.lineNumber;
			}
		}
		// Raise an error if the selection doesn't fully cover all subtasks of a task
		if (i > lineEnd) {
			window.showErrorMessage('Cannot sort a partial selection');
			return;
		}
	}

	const sortedTasks = sortTasks({
		tasks,
		sortProperty,
	});
	if (!sortedTasks.length) {
		return;
	}
	const result = sortedTasks.map(t => t.rawTextWithNestedTasks()).join('\n');
	edit.replace(getFullRangeFromLines(editor.document, lineStart, lineEnd), result);
}
