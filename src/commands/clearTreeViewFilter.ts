import { $state } from '../extension';
import { tasksView, updateTasksTreeView } from '../treeViewProviders/treeViews';
import { VscodeContext } from '../types';
import { setContext } from '../utils/vscodeUtils';

export function clearTreeViewFilter() {
	tasksView.description = undefined;
	setContext(VscodeContext.FilterActive, false);
	$state.taskTreeViewFilterValue = '';
	updateTasksTreeView();
}