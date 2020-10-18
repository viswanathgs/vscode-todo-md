import vscode, { DecorationRenderOptions } from 'vscode';
import { Priority, TheTask } from './TheTask';

export interface ItemForProvider {
	title: string;
	items: Items[];
}

export interface Items {// TODO: rename
	lineNumber: number;
	title: string;
}

export interface State {
	tasks: TheTask[];
	archivedTasks: TheTask[];
	tags: string[];
	projects: string[];
	contexts: string[];
	tagsForTreeView: ItemForProvider[];
	projectsForTreeView: ItemForProvider[];
	contextsForTreeView: ItemForProvider[];
	lastVisit?: Date;
	commentLines: vscode.Range[];

	theRightFileOpened: boolean;
	/**
	 * Tracks if `resetAllRecurringTasks()` was already called this day
	 */
	fileWasReset: boolean;
	newDayArrived: boolean;
	taskTreeViewFilterValue: string;
	extensionContext: vscode.ExtensionContext;
	activeDocument: vscode.TextDocument | undefined;
}

export const enum DueState {
	notDue,
	due,
	overdue,
	invalid,
}

export enum SortTags {
	alphabetic = 'alphabetic',
	frequency = 'frequency',
}
const enum AdvancedDecorations {
	project = 'project',
	context = 'context',
	comment = 'comment',
}
export interface IExtensionConfig {
	isDev: boolean;
	addCreationDate: boolean;
	addCompletionDate: boolean;
	completionDateIncludeTime: boolean;
	creationDateIncludeTime: boolean;
	defaultPriority: Priority;
	autoArchiveTasks: boolean;

	sortTagsView: SortTags;

	doneSymbol: string;
	activatePattern: string;

	tags: string[];
	projects: string[];
	contexts: string[];

	decorations: {
		[key in AdvancedDecorations]: DecorationRenderOptions;
	};

	savedFilters: {
		title: string;
		filter: string;
	}[];

	defaultFile: string;
	defaultArchiveFile: string;

	treeViews: {
		title: string;
		filter: string;
	}[];
	getNextNumberOfTasks: number;

	webview: {
		markdownEnabled: boolean;
		showCompleted: boolean;
		showRecurringCompleted: boolean;
		showPriority: boolean;
		fontSize: string;
		fontFamily: string;
		customCheckboxEnabled: boolean;
		checkboxStyle: string;
		padding: string;
	};
}

export const enum VscodeContext {
	isActive = 'todomd:isActive',
	isDev = 'todomd:isDev',
	filterActive = 'todomd:filterActive',
	generic1FilterExists = 'todomd:generic1FilterExists',
	generic2FilterExists = 'todomd:generic2FilterExists',
	generic3FilterExists = 'todomd:generic3FilterExists',
}

export type OptionalExceptFor<T, TRequired extends keyof T> = Partial<T> & Pick<T, TRequired>;

interface WebviewMessageBase {
	type: string;
	value: unknown;
}
// From extension to webview
interface WebviewMessageUpdateEverything extends WebviewMessageBase {
	type: 'updateEverything';
	value: {
		tasks: TheTask[];
		tags: string[];
		projects: string[];
		contexts: string[];
		defaultFileSpecified: boolean;
		activeDocumentOpened: boolean;
		config: IExtensionConfig['webview'];
	};
}
// From webview to extension
interface WebviewMessageToggleDone extends WebviewMessageBase {
	type: 'toggleDone';
	value: number;
}
interface WebviewMessageShowNotification extends WebviewMessageBase {
	type: 'showNotification';
	value: string;
}
interface WebviewMessageGoToTask extends WebviewMessageBase {
	type: 'goToTask';
	value: number;
}
interface WebviewMessageIncrementCount extends WebviewMessageBase {
	type: 'incrementCount';
	value: number;
}
interface WebviewMessageDecrementCount extends WebviewMessageBase {
	type: 'decrementCount';
	value: number;
}
interface WebviewMessageUpdateTitle extends WebviewMessageBase {
	type: 'updateTitle';
	value: string;
}
export type WebviewMessage = WebviewMessageUpdateEverything | WebviewMessageToggleDone | WebviewMessageShowNotification | WebviewMessageGoToTask | WebviewMessageIncrementCount | WebviewMessageDecrementCount | WebviewMessageUpdateTitle;
