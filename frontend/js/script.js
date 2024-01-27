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

	return json.sessions;
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
