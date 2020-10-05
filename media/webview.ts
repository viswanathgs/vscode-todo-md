/* eslint-disable no-undef */
// TODO: enable typescipt-eslint for this file

import { defaultSortTasks } from '../src/sort';
import type { TheTask } from '../src/TheTask';
import { DueState, IExtensionConfig, WebviewMessage } from '../src/types';

interface VscodeWebviewApi {
	getState(): any;
	setState(state: any): void;
	postMessage(message: WebviewMessage): void;
}
/** @ts-ignore */
const vscode: VscodeWebviewApi = acquireVsCodeApi();

const state: {
	tasks: TheTask[];
	config: IExtensionConfig['webview'];
	tags: string[];
	projects: string[];
	contexts: string[];
} = {
	tasks: [],
	tags: [],
	projects: [],
	contexts: [],
	config: {
		showCompleted: true,
		showPriority: true,
		fontSize: '13px',
		padding: '0px',
	},
};
let filteredTasksGlobal: TheTask[] = [];

const filterInputEl = document.getElementById('filterInput') as HTMLInputElement;// TODO: use $ for elements?
filterInputEl.focus();

filterInputEl.addEventListener('input', e => {
	updateTasks();// TODO: update webview counter
});
filterInputEl.addEventListener('change', e => {
	updateTasks();// TODO: update webview counter
});

// @ts-expect-error
const awesomplete = new Awesomplete(filterInputEl, {
	list: [],
	autoFirst: true,
	minChars: 0,
	maxItems: 5,
	// @ts-ignore
	tabSelect: true,
});

filterInputEl.addEventListener('keydown', e => {
	if (e.altKey && e.key === 'd') {
		const firstMatch = filteredTasksGlobal[0];
		if (!firstMatch) {
			showNotification('No matches');
			return;
		}
		vscode.postMessage({
			type: 'toggleDone',
			value: firstMatch.lineNumber
		});
	} else if (e.key === 'Tab' || e.key === 'Enter') {
		var event = new Event('change');
		filterInputEl.dispatchEvent(event);
		// 🐛 Tab in Awesomplete moves focus away from input
		setTimeout(() => {
			filterInputEl.focus();
		}, 0);// TODO: move this to select event
	}
})

window.addEventListener('click', event => {
	const target = event.target;
	if (target instanceof HTMLElement) {
		const closestTask = target.closest('.list-item');
		if (closestTask) {
			const lineNumber = Number(closestTask.attributes['data-id'].value);
			if (target.classList.contains('checkbox')) {
				vscode.postMessage({
					type: 'toggleDone',
					value: lineNumber,
				});
			} else if (event.altKey) {
				vscode.postMessage({
					type: 'goToTask',
					value: lineNumber,
				})
			}

			if (target.classList.contains('tag')) {
				filterInputEl.value = `#${target.textContent}`;
				filterInputEl.focus();
				updateTasks();
			} else if (target.classList.contains('project')) {
				filterInputEl.value = `+${target.textContent}`;
				filterInputEl.focus();
				updateTasks();
			} else if (target.classList.contains('context')) {
				filterInputEl.value = `@${target.textContent}`;
				filterInputEl.focus();
				updateTasks();
			} else if (target.classList.contains('decrement-count')) {
				vscode.postMessage({
					type: 'decrementCount',
					value: lineNumber,
				})
			} else if (target.classList.contains('increment-count')) {
				vscode.postMessage({
					type: 'incrementCount',
					value: lineNumber,
				});
			}
		}
	}
});

window.addEventListener('focus', () => {
	setTimeout(() => {
		filterInputEl.focus();
	}, 100);
})

function showNotification(text: string) {
	vscode.postMessage({
		type: 'showNotification',
		value: text,
	});
}
function updateTasks() {
	const list = document.querySelector('.list') as HTMLElement;
	list.textContent = '';

	let filteredTasks = state.tasks;
	if (filterInputEl.value !== '') {
		const filterValueLowercase = filterInputEl.value.toLowerCase();
		filteredTasks = filteredTasks.filter(task => task.rawText.toLowerCase().includes(filterValueLowercase));
	}
	if (!state.config.showCompleted) {
		filteredTasks = filteredTasks.filter(task => !task.done);
	}
	const sortedTasks = defaultSortTasks(filteredTasks);
	for (const task of sortedTasks) {
		list.appendChild(renderTask(task));
	}
	filteredTasksGlobal = sortedTasks;
}

function renderTask(task: TheTask): HTMLElement {
	const taskListItem = document.createElement('div');
	taskListItem.classList.add('list-item');
	taskListItem.dataset.id = String(task.lineNumber);
	if (task.priority && state.config.showPriority) {
		switch (task.priority) {
			case 'A': taskListItem.classList.add('pri1'); break;
			case 'B': taskListItem.classList.add('pri2'); break;
			case 'C': taskListItem.classList.add('pri3'); break;
			case 'D': taskListItem.classList.add('pri4'); break;
			case 'E': taskListItem.classList.add('pri5'); break;
			case 'F': taskListItem.classList.add('pri6'); break;
		}
	}

	// const checkbox2 = document.createElement('span');
	// checkbox2.classList.add('checkbox', 'codicon', 'codicon-check');
	// taskListItem.appendChild(checkbox2);
	const checkbox = document.createElement('input');
	checkbox.classList.add('checkbox');
	checkbox.type = 'checkbox';
	if (task.done) {
		checkbox.checked = true;
	}
	taskListItem.appendChild(checkbox);

	if (task.due) {
		if (task.due.isDue === DueState.overdue) {
			taskListItem.classList.add('overdue');
		} else if (task.due.isDue === DueState.due) {
			taskListItem.classList.add('due');
		} else if (task.due.isDue === DueState.notDue) {
			taskListItem.classList.add('not-due');
		} else if (task.due.isDue === DueState.invalid) {
			taskListItem.classList.add('invalid');
		}
	}

	const title = document.createElement('span');
	let titleText = task.title;
	const linkElements = [];
	if (task.links.length) {
		for (const link of task.links) {
			const linkEl = document.createElement('a');
			linkEl.href = link.value;
			linkEl.text = ` ${link.value} `;
			linkElements.push(linkEl);
			titleText = titleText.slice(0, link.characterRange[0]) + titleText.slice(link.characterRange[1]);// TODO: fails to parse when special things are present such as priority (A) resulting in wrong substring
		}
	}
	title.textContent = titleText;
	taskListItem.appendChild(title);
	for (const linkEl of linkElements) {
		taskListItem.appendChild(linkEl);
	}
	if (task.tags.length) {
		for (const tag of task.tags) {
			const tagEl = document.createElement('span');
			tagEl.classList.add('tag');
			tagEl.textContent = tag;
			taskListItem.appendChild(tagEl);
		}
	}
	if (task.projects.length) {
		for (const project of task.projects) {
			const projectEl = document.createElement('span');
			projectEl.classList.add('project');
			projectEl.textContent = project;
			taskListItem.appendChild(projectEl);
		}
	}
	if (task.contexts.length) {
		for (const context of task.contexts) {
			const contextEl = document.createElement('span');
			contextEl.classList.add('context');
			contextEl.textContent = context;
			taskListItem.appendChild(contextEl);
		}
	}
	if (task.specialTags.count) {
		const countContainer = document.createElement('span');
		countContainer.classList.add('count-container');

		const minusButton = document.createElement('span');
		minusButton.classList.add('decrement-count');
		minusButton.textContent = '-';

		const plusButton = document.createElement('span');
		plusButton.classList.add('increment-count');
		plusButton.textContent = '+';

		const countEl = document.createElement('span');
		countEl.classList.add('count');
		countEl.textContent = `${task.specialTags.count.current} / ${task.specialTags.count.needed}`;

		countContainer.appendChild(minusButton);
		countContainer.appendChild(countEl);
		countContainer.appendChild(plusButton);

		taskListItem.appendChild(countContainer);
	}
	return taskListItem;
}
function updateFilterInputAutocomplete(tags: string[], projects: string[], contexts: string[]) {
	const autocompleteTags = tags.map(tag => `#${tag}`);
	const autocompleteProjects = projects.map(project => `+${project}`);
	const autocompleteContexts = contexts.map(context => `@${context}`);
	awesomplete.list = autocompleteTags.concat(autocompleteProjects, autocompleteContexts);
}
// Handle messages sent from the extension to the webview
window.addEventListener('message', event => {
	const message: WebviewMessage = event.data; // The json data that the extension sent
	switch (message.type) {
		case 'updateTasks': {
			state.tasks = message.value;
			updateTasks();
			break;
		}
		case 'updateEverything': {
			state.tasks = message.value.tasks;
			state.tags = message.value.tags;
			state.projects = message.value.projects;
			state.contexts = message.value.contexts;
			updateFilterInputAutocomplete(state.tags, state.projects, state.contexts);
			updateTasks();
			break;
		}
		case 'updateConfig': {
			state.config = message.value;
			document.body.style.setProperty('--font-size', state.config.fontSize);
			document.body.style.setProperty('--padding', state.config.padding);
			updateTasks();
			break;
		}
	}
});