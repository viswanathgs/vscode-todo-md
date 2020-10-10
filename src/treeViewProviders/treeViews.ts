import { updateWebviewView } from 'src/webview/webviewView';
import vscode, { TreeView } from 'vscode';
import { extensionConfig, EXTENSION_NAME, state } from '../extension';
import { filterItems } from '../filter';
import { ContextProvider } from '../treeViewProviders/contextProvider';
import { ProjectProvider } from '../treeViewProviders/projectProvider';
import { TagProvider } from '../treeViewProviders/tagProvider';
import { TaskProvider } from '../treeViewProviders/taskProvider';
import { VscodeContext } from '../types';
import { setContext } from '../vscodeUtils';

export const tagProvider = new TagProvider([]);
export const projectProvider = new ProjectProvider([]);
export const contextProvider = new ContextProvider([]);
export const taskProvider = new TaskProvider([]);
export const archivedProvider = new TaskProvider([]);

const generic1Provider = new TaskProvider([]);
const generic2Provider = new TaskProvider([]);
const generic3Provider = new TaskProvider([]);

let tagsView: vscode.TreeView<any>;
let projectView: vscode.TreeView<any>;
let contextView: vscode.TreeView<any>;
let tasksView: vscode.TreeView<any>;
let archivedView: vscode.TreeView<any>;
let generic1View: vscode.TreeView<any>;
let generic2View: vscode.TreeView<any>;
let generic3View: vscode.TreeView<any>;

export function createAllTreeViews() {
	tagsView = vscode.window.createTreeView(`${EXTENSION_NAME}.tags`, {
		treeDataProvider: tagProvider,
		showCollapseAll: true,
	});

	projectView = vscode.window.createTreeView(`${EXTENSION_NAME}.projects`, {
		treeDataProvider: projectProvider,
		showCollapseAll: true,
	});

	contextView = vscode.window.createTreeView(`${EXTENSION_NAME}.contexts`, {
		treeDataProvider: contextProvider,
		showCollapseAll: true,
	});

	tasksView = vscode.window.createTreeView(`${EXTENSION_NAME}.tasks`, {
		treeDataProvider: taskProvider,
	});

	archivedView = vscode.window.createTreeView(`${EXTENSION_NAME}.archived`, {
		treeDataProvider: archivedProvider,
	});

	if (extensionConfig.treeViews.length) {
		const generic1 = extensionConfig.treeViews[0];
		if (generic1) {
			if (typeof generic1.filter !== 'string' || typeof generic1.title !== 'string') {
				vscode.window.showWarningMessage('Tree View must have filter and title and they must be strings.');
			} else {
				generic1View = vscode.window.createTreeView('todomd.generic1', {
					treeDataProvider: generic1Provider,
				});
				setContext(VscodeContext.generic1FilterExists, true);
			}
		}

		const generic2 = extensionConfig.treeViews[1];
		if (generic2) {
			if (typeof generic2.filter !== 'string' || typeof generic2.title !== 'string') {
				vscode.window.showWarningMessage('Tree View must have filter and title and they must be strings.');
			} else {
				generic2View = vscode.window.createTreeView('todomd.generic2', {
					treeDataProvider: generic2Provider,
				});
				setContext(VscodeContext.generic2FilterExists, true);
			}
		}

		const generic3 = extensionConfig.treeViews[2];
		if (generic3) {
			if (typeof generic3.filter !== 'string' || typeof generic3.title !== 'string') {
				vscode.window.showWarningMessage('Tree View must have filter and title and they must be strings.');
			} else {
				generic3View = vscode.window.createTreeView('todomd.generic3', {
					treeDataProvider: generic3Provider,
				});
				setContext(VscodeContext.generic3FilterExists, true);
			}
		}
	} else {
		setContext(VscodeContext.generic1FilterExists, false);
		setContext(VscodeContext.generic2FilterExists, false);
		setContext(VscodeContext.generic3FilterExists, false);
	}
}
/**
 * Update all tree views (including webviews)
 * Items are taken from `state`
 */
export function updateAllTreeViews(): void {
	tagProvider.refresh(state.tagsForTreeView);
	setViewTitle(tagsView, 'tags', state.tagsForTreeView.length);

	updateTasksTreeView();

	projectProvider.refresh(state.projectsForTreeView);
	setViewTitle(projectView, 'projects', state.projectsForTreeView.length);

	contextProvider.refresh(state.contextsForTreeView);
	setViewTitle(contextView, 'contexts', state.contextsForTreeView.length);

	if (generic1View) {
		const filteredTasks = filterItems(getTasksForTreeView(), extensionConfig.treeViews[0].filter);
		generic1Provider.refresh(filteredTasks);
		setViewTitle(generic1View, extensionConfig.treeViews[0].title, filteredTasks.length);
	}
	if (generic2View) {
		const filteredTasks = filterItems(getTasksForTreeView(), extensionConfig.treeViews[1].filter);
		generic2Provider.refresh(filteredTasks);
		setViewTitle(generic2View, extensionConfig.treeViews[1].title, filteredTasks.length);
	}
	if (generic3View) {
		const filteredTasks = filterItems(getTasksForTreeView(), extensionConfig.treeViews[2].filter);
		generic3Provider.refresh(filteredTasks);
		setViewTitle(generic3View, extensionConfig.treeViews[2].title, filteredTasks.length);
	}
	// ──────────────────────────────────────────────────────────────────────
	updateWebviewView();
}

export function updateTasksTreeView() {
	let tasksForProvider;
	if (state.taskTreeViewFilterValue) {
		tasksForProvider = filterItems(getTasksForTreeView(), state.taskTreeViewFilterValue);
	} else {
		tasksForProvider = getTasksForTreeView();
	}
	taskProvider.refresh(tasksForProvider);
	setViewTitle(tasksView, 'tasks', tasksForProvider.length, state.taskTreeViewFilterValue);
}

export function updateArchivedTasksTreeView() {
	const archivedTasks = state.archivedTasks;
	archivedProvider.refresh(archivedTasks);
	setViewTitle(archivedView, 'archived', archivedTasks.length);
}

function getTasksForTreeView() {
	return state.tasks.filter(task => {
		if (task.specialTags.isHidden) {
			return false;
		}
		if (!task.specialTags.threshold) {
			return true;
		}
		return new Date(task.specialTags.threshold).getTime() < Date.now();
	});
}

function setViewTitle(view: TreeView<any>, title: string, counter: number, filterValue = '') {
	view.title = `${title} (${counter}) ${filterValue}`;
}
