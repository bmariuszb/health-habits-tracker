async function deleteUser(event) {
	event.preventDefault();
	const password = document.getElementById('password').value;
	// send delete request
	let res;
	try {
		res = await fetch('/users', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ password }),
		});
	} catch (error) {
		console.error('Error:', error);
	}

	const data = await res.json();
	if (data.redirectPath) {
		window.location.href = data.redirectPath;
	} else if (data.error) {
		const errorContainer = document.getElementById('error-container');
		errorContainer.textContent = data.error;
	}
}

async function logout() {
	let res;
	try {
		res = await fetch('/logout', {
			method: 'POST',
		})
	} catch (error) {
		console.error('Error:', error);
	}

	window.location.href = '/login';
}

async function login(event) {
	event.preventDefault();
	const username = document.getElementById('username').value;
	const password = document.getElementById('password').value;

	// send login request
	let res;
	try {
		res = await fetch('/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ username, password }),
		});

	} catch (error) {
		console.error('Error:', error);
	}

	if (res.ok) {
		window.location.href = '/';
		return;
	}

	const data = await res.json();
	if (data.error) {
		const errorContainer = document.getElementById('error-container');
		errorContainer.textContent = data.error;
	}
}

async function registerUser(event) {
	event.preventDefault();
	const username = document.getElementById('username').value;
	const password = document.getElementById('password').value;
	const confirmPassword = document.getElementById('confirmPassword').value;

	const errorContainer = document.getElementById('error-container');
	if (password !== confirmPassword) {
		errorContainer.textContent = "Passwords do not match";
		return;
	}

	let res;
	try {
		res = await fetch('/users', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ username, password }),
		});

	} catch(error) {
		errorContainer.textContent = error.message;
	};

	const data = await res.json();
	if (data.redirectPath) {
		window.location.href = data.redirectPath;
	} else if (data.error) {
		errorContainer.textContent = data.error;
	}
}

async function getSessions() {
	let res;
	try {
		res = await fetch('/sessions', { method: 'GET' });
	} catch (error) {
		console.error('Error fetching sessions:', error);
		return [];
	}

	const json = await res.json();

	if (!res.ok) {
		const errorContainer = document.getElementById('error-container');
		errorContainer.textContent = json.error;
		return [];
	}

	return json;
}

async function renderSessions() {
	const sessions = await getSessions();
	if (sessions.length === 0) {
		return;
	}

	const cookies = Object.fromEntries(document.cookie.split(';').map(cookie => cookie.trim().split('=')));
	const activeSessionId = cookies['id'];
	const form = document.getElementById('manageSessionsForm');

	// Clear existing sessions in the form
	form.innerHTML = '';

	// Create a table
	const table = document.createElement('table');
	table.classList.add('sessions-table');
	form.appendChild(table);

	// Create header row
	const headerRow = table.insertRow();
	const selectCell = headerRow.insertCell();
	selectCell.textContent = 'Select';
	const expireDateCell = headerRow.insertCell();
	expireDateCell.textContent = 'Expire Date';
	const ipAddressCell = headerRow.insertCell();
	ipAddressCell.textContent = 'IP Address';
	const userAgentCell = headerRow.insertCell();
	userAgentCell.textContent = 'User Agent';

	// Create rows for each session
	sessions.forEach(session => {
		const row = table.insertRow();

		// Checkbox
		const selectCell = row.insertCell();
		const sessionCheckbox = document.createElement('input');
		sessionCheckbox.type = 'checkbox';
		sessionCheckbox.name = 'sessionIds';
		sessionCheckbox.value = session.id;
		selectCell.appendChild(sessionCheckbox);

		// Expire Date
		const expireDateCell = row.insertCell();
		expireDateCell.textContent = new Date(session.exp_date._seconds * 1000).toLocaleString();

		// IP Address
		const ipAddressCell = row.insertCell();
		ipAddressCell.textContent = session.ip_address;
		if (session.id === activeSessionId) {
			row.classList.add('active-row');
		}

		// User Agent
		const userAgentCell = row.insertCell();
		userAgentCell.textContent = session.user_agent;
	});

	// Add the small text below the submit button
	const activeSessionText = document.createElement('div');
	activeSessionText.classList.add('active-session-text');
	activeSessionText.textContent = '*Green indicates the active session, deleting it will log you out';
	form.appendChild(activeSessionText);

	// Add a submit button
	const submitButton = document.createElement('button');
	submitButton.type = 'submit';
	submitButton.textContent = 'Delete';
	form.appendChild(submitButton);

	// Add error container
	const errorContainer = document.createElement('div');
	errorContainer.id = 'error-container';
	errorContainer.style.color = 'red';
	form.appendChild(errorContainer);
}

function getSelectedSessionIds() {
    const selectedSessionIds = [];
    const checkboxes = document.querySelectorAll('input[name="sessionIds"]:checked');
    checkboxes.forEach(checkbox => {
        selectedSessionIds.push(checkbox.value);
    });
    return selectedSessionIds;
}

async function deleteSession(event) {
	event.preventDefault();
	const selectedSessionIds = getSelectedSessionIds();
	let res;
	try {
		res = await fetch('/sessions', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ sessionIds: selectedSessionIds }),
		});
	} catch (error) {
		console.error('Error:', error);
	}

	const data = await res.json();
	if (res.ok) {
		if (data.redirectPath) {
			window.location.href = data.redirectPath;
			return;
		}
		window.location.reload();
		return;
	}
	if (data.error) {
		const errorContainer = document.getElementById('error-container');
		errorContainer.textContent = data.error;
	}
}

async function getActivities() {
	let res;
	try {
		res = await fetch('/activities', { method: 'GET' });
	} catch (error) {
		console.error('Error fetching sessions:', error);
		return [];
	}

	const json = await res.json();

	if (!res.ok) {
		const errorContainer = document.getElementById('error-container');
		errorContainer.textContent = json.error;
		return [];
	}

	return json.activities;
}

async function renderActivities() {
	const activities = await getActivities();
	if (activities.length === 0) {
		return;
	}

	// Clear existing activities in the form
	const form = document.getElementById('manageActivitiesForm');
	form.innerHTML = '';

	// Create a table
	const table = document.createElement('table');
	table.classList.add('activities-table');
	form.appendChild(table);

	// Create header row
	const headerRow = table.insertRow();
	const dateCell = headerRow.insertCell();
	dateCell.textContent = 'Date';
	const nameCell = headerRow.insertCell();
	nameCell.textContent = 'Name';
	const timeSpentCell = headerRow.insertCell();
	timeSpentCell.textContent = 'Time Spent';
	const weightCell = headerRow.insertCell();
	weightCell.textContent = 'Weight';
	const distanceCell = headerRow.insertCell();
	distanceCell.textContent = 'Distance';
	const stepsCell = headerRow.insertCell();
	stepsCell.textContent = 'Steps';
	const speedCell = headerRow.insertCell();
	speedCell.textContent = 'Speed';
	const deleteCellHeader = headerRow.insertCell();
	deleteCellHeader.textContent = 'Delete';

	// Create rows for each activity
	activities.forEach((activity, index) => {
		const row = table.insertRow();

		// Date
		const dateCell = row.insertCell();
		dateCell.textContent = new Date(activity.date).toLocaleDateString();

		// Name
		const nameCell = row.insertCell();
		nameCell.textContent = activity.name;

		// Time Spent
		const timeSpentCell = row.insertCell();
		timeSpentCell.textContent = activity.timeSpent;

		// Weight
		const weightCell = row.insertCell();
		weightCell.textContent = activity.weight || '';

		// Distance
		const distanceCell = row.insertCell();
		distanceCell.textContent = activity.distance || '';

		// Steps
		const stepsCell = row.insertCell();
		stepsCell.textContent = activity.steps || '';

		// Speed
		const speedCell = row.insertCell();
		speedCell.textContent = activity.speed || '';

		// Delete Button
		const deleteCell = row.insertCell();
		const deleteButton = document.createElement('button');
		deleteButton.textContent = 'Delete';
		deleteButton.setAttribute("onclick", `deleteActivity(${index});`);
		deleteCell.appendChild(deleteButton);
	});

	// Add error container
	const errorContainer = document.createElement('div');
	errorContainer.id = 'error-container';
	errorContainer.style.color = 'red';
	form.appendChild(errorContainer);
}

async function deleteActivity(index) {
	console.log(`Deleting activity at index ${index}`);
	let res;
	try {
		res = await fetch('/activities', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ index }),
		});
	} catch (error) {
		console.error('Error:', error);
	}

	if (res.ok) {
		return window.location.reload();
	}

}

async function addActivity(event) {
	event.preventDefault();
	const errorContainer = document.getElementById('error-container');
	const formData = new FormData(document.getElementById('addActivityForm'));
	const data = {};

	// Convert FormData to object
	formData.forEach((value, key) => {
		data[key] = value || "";
	});

	let res;
	try {
		res = await fetch('/activities', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});
	} catch (error) {
		errorContainer.textContent = error;
	}

	const json = await res.json();
	if (json.error) {
		errorContainer.textContent = json.error;
	} else if (json.redirectPath) {
		window.location.href = json.redirectPath;
	}

}

async function addMeal(event) {
	event.preventDefault();
	const errorContainer = document.getElementById('error-container');
	const formData = new FormData(document.getElementById('addMealForm'));
	const data = {};

	// Convert FormData to object
	formData.forEach((value, key) => {
		data[key] = value || "";
	});

	let res;
	try {
		res = await fetch('/meals', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});
	} catch (error) {
		errorContainer.textContent = error;
	}

	const json = await res.json();
	if (json.error) {
		errorContainer.textContent = json.error;
	} else if (json.redirectPath) {
		window.location.href = json.redirectPath;
	}
}

async function getMeals() {
	let res;
	try {
		res = await fetch('/meals', { method: 'GET' });
	} catch (error) {
		console.error('Error fetching sessions:', error);
		return [];
	}

	const json = await res.json();

	if (!res.ok) {
		const errorContainer = document.getElementById('error-container');
		errorContainer.textContent = json.error;
		return [];
	}

	return json.meals;
}

async function renderMeals() {
	const meals = await getMeals();
	if (meals.length === 0) {
		return;
	}

	// Clear existing activities in the form
	const form = document.getElementById('manageMealsForm');
	form.innerHTML = '';

	// Create a table
	const table = document.createElement('table');
	table.classList.add('meals-table');
	form.appendChild(table);

	// Create header row
	const headerRow = table.insertRow();
	const dateCell = headerRow.insertCell();
	dateCell.textContent = 'Date';
	const nameCell = headerRow.insertCell();
	nameCell.textContent = 'Name';
	const caloriesCell = headerRow.insertCell();
	caloriesCell.textContent = 'Calories';
	const deleteCellHeader = headerRow.insertCell();
	deleteCellHeader.textContent = 'Delete';

	// Create rows for each meal
	meals.forEach((meal, index) => {
		const row = table.insertRow();

		// Date
		const dateCell = row.insertCell();
		dateCell.textContent = new Date(meal.date).toLocaleDateString();

		// Name
		const nameCell = row.insertCell();
		nameCell.textContent = meal.name;

		// Time Spent
		const caloriesCell = row.insertCell();
		caloriesCell.textContent = meal.calories;

		// Delete Button
		const deleteCell = row.insertCell();
		const deleteButton = document.createElement('button');
		deleteButton.textContent = 'Delete';
		deleteButton.setAttribute("onclick", `deleteMeal(${index});`);
		deleteCell.appendChild(deleteButton);
	});

	// Add error container
	const errorContainer = document.createElement('div');
	errorContainer.id = 'error-container';
	errorContainer.style.color = 'red';
	form.appendChild(errorContainer);
}

async function deleteMeal(mealId) {
	let res;
	try {
		res = await fetch(`/meals/${mealId}`, { method: 'DELETE' });
	} catch (error) {
		console.error('Error:', error);
	}

	if (res.ok) {
		return window.location.reload();
	}
}

async function addGoal(event) {
	event.preventDefault();
	const errorContainer = document.getElementById('error-container');
	const formData = new FormData(document.getElementById('addGoalForm'));
	const data = {};

	// Convert FormData to object
	formData.forEach((value, key) => {
		data[key] = value || "";
	});

	let res;
	try {
		res = await fetch('/goals', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});
	} catch (error) {
		errorContainer.textContent = error;
	}

	const json = await res.json();
	if (json.error) {
		errorContainer.textContent = json.error;
	} else if (json.redirectPath) {
		window.location.href = json.redirectPath;
	}
}

async function getGoals() {
	let res;
	try {
		res = await fetch('/goals', { method: 'GET' });
	} catch (error) {
		console.error('Error fetching sessions:', error);
		return [];
	}

	const json = await res.json();

	if (!res.ok) {
		const errorContainer = document.getElementById('error-container');
		errorContainer.textContent = json.error;
		return [];
	}

	return json;
}

async function renderGoals() {
	const goals = await getGoals();
	if (goals.length === 0) {
		return;
	}

	// Clear existing activities in the form
	const form = document.getElementById('manageGoalsForm');
	form.innerHTML = '';

	// Create a table
	const table = document.createElement('table');
	table.classList.add('goals-table');
	form.appendChild(table);

	// Create header row
	const headerRow = table.insertRow();
	const titleCell = headerRow.insertCell();
	titleCell.textContent = 'Title';
	const dueDateCell = headerRow.insertCell();
	dueDateCell.textContent = 'Due date and time';
	const descriptionCell = headerRow.insertCell();
	descriptionCell.textContent = 'Description';
	const statusCellHeader = headerRow.insertCell();
	statusCellHeader.textContent = 'Status';

	// Create rows for each meal
	goals.forEach((goal, index) => {
		const row = table.insertRow();

		// Title
		const titleCell = row.insertCell();
		titleCell.textContent = goal.title

		// Due date and time
		const dueDateCell = row.insertCell();
		const formattedDueDate = new Date(goal.dueDateTime).toLocaleString(undefined,
			{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });
		dueDateCell.textContent = formattedDueDate;

		// Description
		const descriptionCell = row.insertCell();
		descriptionCell.textContent = goal.description;

		// Status
		const statusCell = row.insertCell();
		statusCell.textContent = goals.status;

		// Delete Button
		const deleteCell = row.insertCell();
		const deleteButton = document.createElement('button');
		deleteButton.textContent = 'Delete';
		deleteButton.setAttribute("onclick", `deleteGoals(${index});`);
		deleteCell.appendChild(deleteButton);
	});

	// Add error container
	const errorContainer = document.createElement('div');
	errorContainer.id = 'error-container';
	errorContainer.style.color = 'red';
	form.appendChild(errorContainer);
}

async function deleteGoals(goalId) {
	let res;
	try {
		res = await fetch(`/goals/${goalId}`, { method: 'DELETE' });
	} catch (error) {
		console.error('Error:', error);
	}

	if (res.ok) {
		return window.location.reload();
	}
}
