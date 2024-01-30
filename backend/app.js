const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser')
const { v4: uuidv4 } = require('uuid');
const days = 10;// hard coded 10 days storing uuid
const saltRounds = 10;// hard coded 10 salt round, increasing this number will slow down backend

const frontend_dir_name = 'frontend'
const frontend_path = path.join(__dirname, '..', frontend_dir_name)

app.use(`/${frontend_dir_name}`, express.static(frontend_path))
app.use(express.json())
app.use(cookieParser())

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
const usersCollection = db.collection('users');

const {PubSub} = require('@google-cloud/pubsub');
const projectId = 'divine-display-410518';
const pubSubClient = new PubSub({ projectId, credentials: serviceAccount });
const topicNameOrId = 'email-notifications-topic';

//FUNCTIONS
async function publishMessage(topicNameOrId, data) {
  const dataBuffer = Buffer.from(data);

  try {
    const messageId = await pubSubClient
      .topic(topicNameOrId)
      .publishMessage({data: dataBuffer});
    console.log(`Message ${messageId} published.`);
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    process.exitCode = 1;
  }
}

function isValidUsername(username) {
	const usernameRegex = /^[a-z0-9_-]+$/;
	if (!usernameRegex.test(username)) {
		return [400, { error: 'Invalid username. It should only contain lowercase letters, underscores (_), hyphens (-), and numbers.' }];
	}
}

async function isValidPassword(password, hashedPassword) {
	const passwordMatch = await bcrypt.compare(password, hashedPassword);
	if (!passwordMatch) {
		return [401, { error: 'Invalid password' }];
	}
}

async function ifUsernameExists(username) {
	let querySnapshot;
	try {
		querySnapshot = await usersCollection.where('username', '==', username).limit(1).get();

		if (!querySnapshot.empty) {
			return [409, { error: 'Username already taken' }];
		}
	} catch (error) {
		console.error("Error querying database:", error);
		return [500, { error: 'Internal server error' }];
	}
}

async function getByUsername(username) {
	let querySnapshot;
	try {
		querySnapshot = await usersCollection.where('username', '==', username).limit(1).get();

		if (querySnapshot.empty) {
			return [404, { error: 'User not found' }, ];
		}
	} catch (error) {
		console.error("Error querying database:", error);
		return [500, { error: 'Internal server error' }, ];
	}

	return [, , querySnapshot.docs[0]];
}

async function ifUsernamePasswordValid(username, password) {
	let querySnapshot;
	try {
		querySnapshot = await usersCollection.where('username', '==', username).limit(1).get();

		if (querySnapshot.empty) {
			return [401, { error: 'Invalid username or password' }];
		}
	} catch (error) {
		console.error("Error querying database:", error);
		return [500, { error: 'Internal server error' }];
	}

	const userDoc = querySnapshot.docs[0];
	const [code, error] = await isValidPassword(password, userDoc.data().password) || [];
	if (code != undefined) return [code, error];

	return [, , userDoc];
}

function validateCookies(cookies) {
	const username = cookies['username'];
	const sessionId = cookies['id'];
	if (username == undefined || sessionId == undefined) {
		console.error(`Error validating cookies.
			Expected: { username: '<expectedUsername>', id: '<expectedSessionId>' },
			Got: { username: '${username}', id: '${sessionId}' }`);
		return [401, { error: 'Unauthorized' }, , ];
	}
	return [, , username, sessionId];
}

function filterSessions(userDoc) {
	let sessions = userDoc.data().sessions || [];

	const currentTimestamp = Math.floor(Date.now() / 1000);
	sessions = sessions.filter((s) => s.exp_date._seconds > currentTimestamp);
	return sessions;
}

function validateSession(userDoc, sessionId) {
	const sessions = filterSessions(userDoc);
	if (!sessions.some(session => session.id === sessionId)) {
    const sessionIds = sessions.map(session => session.id);
		console.error(`Error: Invalid sessionId received.
			Expected one of the following: ${JSON.stringify(sessionIds)}.
			Received: ${sessionId}`);
		return [401, { error: 'Unauthorized' }, ];
	}
	return [, , sessions];
}

function validateIpUserAgent(ipAddress, userAgent) {
	if ( ipAddress == undefined || userAgent == undefined ) {
		return [400, { error: 'Bad request' }];
	}
	return [, , ipAddress, userAgent];
}

function removeFromArray(array, index) {
	index = parseInt(index, 10);
	if (!isNaN(index) && index >= 0 && index < array.length) {
		array.splice(index, 1);
	} else {
		return [400, { error: 'Bad Request: Wrong array index' }, ];
	}
	return [, , array];
}

async function addUserDoc(user) {
	try {
		await usersCollection.add(user);
	} catch (error) {
    console.error("Error adding new user:", error);
		return [500, { error: 'Internal server error' }];
  }
}

async function deleteUserDoc(userRef) {
	try {
		await userRef.delete();
	} catch (error) {
		console.error("Error deleting user:", error);
		return [500, { error: 'Internal server error' }];
	}
}

async function updateUsersDoc (userRef, value) {
	try {
		await userRef.update(value);
	} catch (error) {
		console.error("Error updating user document:", error);
		return [500, { error: 'Internal server error' }];
	}
}

async function authAndGetData(cookies) {
	let code, error, username, sessionId, userDoc, sessions;
	[code, error, username, sessionId] = validateCookies(cookies) || [];
	if (username == undefined) return [code, error];

	[code, error] = isValidUsername(username) || [];
  if (code != undefined) return [code, error];

	[code, error, userDoc] = await getByUsername(username) || [];
	if (userDoc == undefined) return [code, error];

	[code, error, sessions] = validateSession(userDoc, sessionId) || [];
	if (sessions == undefined) return [code, error];
	return [code, error, username, sessionId, userDoc, sessions];
}

async function newUser(username, password, userAgent, ipAddress) {
	const uuid = uuidv4();
	const hashedPassword = await bcrypt.hash(password, saltRounds);
	const expDate = new Date();
  expDate.setDate(expDate.getDate() + days);
	const newSession = {
		id: uuid,
		exp_date: expDate,
		user_agent: userAgent,
		ip_address: ipAddress
	};
	return [{
			username,
			password: hashedPassword,
			sessions: [ newSession ]
	},uuid, expDate] ;
}

function newSession(userAgent, ipAddress) {
	const uuid = uuidv4();
	const expDate = new Date();
  expDate.setDate(expDate.getDate() + days);
	return [{
		id: uuid,
		exp_date: expDate,
		user_agent: userAgent,
		ip_address: ipAddress
	},uuid, expDate];
}

function setCookie(res, name, val, expDate) {
	res.cookie(name, val, {
		expires: expDate,
		secure: false,
		sameSite: 'Strict'
	});
}



//GET
// main menu page
app.get('/', (req, res) => {
	const cookie = req.headers.cookie
	if (cookie == undefined || !cookie.includes('id=')) {
		return res.redirect('/login');
	}

	res.sendFile(path.join(frontend_path, 'index.html'), );
});

// login page
app.get('/login', (_req, res) => {
	res.sendFile(path.join(frontend_path, 'login.html'), );
});

// register page
app.get('/register', (_req, res) => {
	res.sendFile(path.join(frontend_path, 'register.html'), );
});

// delete account page
app.get('/delete-account', (_req, res) => {
	res.sendFile(path.join(frontend_path, 'deleteAccount.html'), );
});

// manage sessions page
app.get('/manage-sessions', (_req, res) => {
	return res.sendFile(path.join(frontend_path, 'manageSessions.html'), );
});

// get sessions list
app.get('/sessions', async (req, res) => {
	const [code, error, _username, _sessionId, _userDoc, sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

	return res.status(200).json(sessions);
});

// manage activities page
app.get('/manage-activities', (_req, res) => {
	return res.sendFile(path.join(frontend_path, 'manageActivities.html'), );
});

// new activity form
app.get('/add-activity', (_req, res) => {
	res.sendFile(path.join(frontend_path, 'addActivity.html'), );
});

// activities list
app.get('/activities', async (req, res) => {
	const [code, error, _username, _sessionId, userDoc, _sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

	const activities = userDoc.data().activities || [];
	return res.status(200).json({ activities });
});

// meals page
app.get('/manage-meals', (_req, res) => {
	return res.sendFile(path.join(frontend_path, 'manageMeals.html'), );
});

// new meal form
app.get('/add-meal', (_req, res) => {
	return res.sendFile(path.join(frontend_path, 'addMeal.html'), );
});

// meals list
app.get('/meals', async (req, res) => {
	const [code, error, _username, _sessionId, userDoc, _sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

	const meals = userDoc.data().meals || [];
	return res.status(200).json({ meals });
});

// goals page
app.get('/manage-goals', (_req, res) => {
	return res.sendFile(path.join(frontend_path, 'manageGoals.html'), );
});

// new goals form
app.get('/add-goal', (_req, res) => {
	return res.sendFile(path.join(frontend_path, 'addGoal.html'), );
});

// goals list
app.get('/goals', async (req, res) => {
	const [code, error, _username, _sessionId, userDoc, _sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

	const goals = userDoc.data().goals || [];
	return res.status(200).json(goals);
});

//POST
//register user
app.post('/users', async (req, res) => {
	const { username, password } = req.body;
	if (username == undefined || password == undefined) {
		return res.status(400).json({ error: "Username and password are required." });
	}

	let [code, error] = isValidUsername(username) || [];
  if (code != undefined) return [code, error];

	let ipAddress, userAgent;
	[code, error, ipAddress, userAgent] = validateIpUserAgent(req.ip, req.get('user-agent')) || [];
	if (ipAddress == undefined) return res.status(code).json(error);

	[code, error] = await ifUsernameExists(username) || [];
	if (code != undefined) return res.status(code).json(error);

	const [user, uuid, expDate] = await newUser(username, password, userAgent, ipAddress);

	[code, error] = await addUserDoc(user) || [];
	if (code != undefined) return res.status(code).json(error);

	const data = `User ${username} created account`;
	publishMessage(topicNameOrId, data).catch(err => {
		console.error(err.message);
		process.exitCode = 1;
	});

	setCookie(res, 'id', uuid, expDate)
	setCookie(res, 'username', username, expDate)
	return res.status(201).json({ redirectPath: '/' });
});

// logout user
app.post('/logout', async (req, res) => {
	// clear cookie no matter what
	res.clearCookie('id');
	res.clearCookie('username');

	let [code, error, _username, sessionId, userDoc, sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

	sessions = sessions.filter(session => session.id !== sessionId);
	updateUsersDoc(userDoc.ref, { sessions })

	return res.status(200).send('Logout successful');;
});

// login user
app.post('/login', async (req, res) => {
	const { username, password } = req.body;
	if (username == undefined || password == undefined) {
		return res.status(400).json({ error: "Username and password are required." });
	}

	let [code, error] = isValidUsername(username) || [];
  if (code != undefined) return [code, error];
	let ipAddress, userAgent;
	[code, error, ipAddress, userAgent] = validateIpUserAgent(req.ip, req.get('user-agent')) || [];
	if (ipAddress == undefined) return res.status(code).json(error);

	let userDoc;
	[code, error, userDoc] = await ifUsernamePasswordValid(username, password) || [];
	if (code != undefined) return res.status(code).json(error);
	
	const [session, uuid, expDate] = newSession(userAgent, ipAddress);
	const sessions = filterSessions(userDoc);
	sessions.push(session);
	
	updateUsersDoc(userDoc.ref, { sessions })

	setCookie(res, 'id', uuid, expDate)
	setCookie(res, 'username', username, expDate)

	return res.status(200).send("Login successful");
});

// add activity
app.post('/activities', async (req, res) => {
	let [code, error, _username, _sessionId, userDoc, _sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

	const { date, name, timeSpent, weight, distance, steps, speed } = req.body;
	if ( date == undefined || name == undefined || timeSpent == undefined ||
		weight == undefined || distance == undefined || steps == undefined ||
		speed == undefined) {
		return res.status(400).json({ error: 'Bad Request: Missing required fields' });
	}

	const newActivity = { date, name, timeSpent, weight, distance, steps, speed };
	const activities = userDoc.data().activities || [];
	activities.push(newActivity);

	[code, error] = await updateUsersDoc(userDoc.ref, {activities}) || [];
	if (code != undefined) return res.status(code).json(error);

	return res.status(200).json({ redirectPath: '/manage-activities' });
});

// add meal
app.post('/meals', async (req, res) => {
	let [code, error, _username, _sessionId, userDoc, _sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

	const { date, name, calories } = req.body;
	if (date == undefined || name == undefined || calories == undefined) {
		return res.status(400).json({ error: 'Bad Request: Missing required fields' });
	}

	const newMeal = { date, name, calories };
	const meals = userDoc.data().meals || [];
	meals.push(newMeal);

	[code, error] = await updateUsersDoc(userDoc.ref, {meals}) || [];
	if (code != undefined) return res.status(code).json(error);

	return res.status(200).json({ redirectPath: '/manage-meals' });
});

// add goal
app.post('/goals', async (req, res) => {
	let [code, error, _username, _sessionId, userDoc, _sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

	const { title, dueDateTime, description, status } = req.body;
	if (title == undefined || dueDateTime == undefined || description == undefined || status == undefined) {
		return res.status(400).json({ error: 'Bad Request: Missing required fields' });
	}

	const newGoal = { title, dueDateTime, description, status };
	const goals = userDoc.data().goals || [];
	goals.push(newGoal);

	[code, error] = await updateUsersDoc(userDoc.ref, {goals}) || [];
	if (code != undefined) return res.status(code).json(error);

	return res.status(200).json({ redirectPath: '/manage-goals' });
});

//DELETE
// delete user
app.delete('/users', async (req, res) => {
	let [code, error, _username, _sessionId, userDoc, _sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

  const password = req.body.password;
	[code, error] = await isValidPassword(password, userDoc.data().password) || [];
	if (code != undefined) return res.status(code).json(error);

	[code, error] = await deleteUserDoc(userDoc.ref) || [];
	if (code != undefined) return res.status(code).json(error);

	res.clearCookie('id');
	res.clearCookie('username');
	return res.status(200).json({ redirectPath: '/login' });
});

// delete sessions
app.delete('/sessions', async (req, res) => {
	let [code, error, _username, sessionId, userDoc, sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

	const sessionIds = req.body.sessionIds;
	sessionIds.forEach(sId => {
		sessions = sessions.filter(s => s.id != sId);
	});

	[code, error] = await updateUsersDoc(userDoc.ref, {sessions}) || [];
	if (code != undefined) return res.status(code).json(error);

	if (sessionIds.some(s => s === sessionId)) {
		res.clearCookie('id');
		res.clearCookie('username');
		return res.status(200).json({ redirectPath: '/login' });
	}
	return res.status(200).json({});
});

// delete activity
app.delete('/activities/:id', async (req, res) => {
	let [code, error, _username, _sessionId, userDoc, _sessions] =
		await authAndGetData(req.cookies) || [];
	if (code != undefined) return res.status(code).json(error);

	let activities = userDoc.data().activities || [];
	const activityId = req.params.id;
	[code, error, activities] = removeFromArray(activities, activityId) || [];
	if (activities == undefined) return res.status(code).json(error);

	[code, error] = await updateUsersDoc(userDoc.ref, {activities}) || [];
	if (code != undefined) return res.status(code).json(error);

	return res.status(200).send("Ok");
});

// delete meal
app.delete('/meals/:id', async (req, res) => {
	let code, error, username, sessionId, userDoc, sessions;
	[code, error, username, sessionId] = validateCookies(req.cookies) || [];
	if (username == undefined) return res.status(code).json(error);

	[code, error, userDoc] = await getByUsername(username) || [];
	if (userDoc == undefined) return res.status(code).json(error);

	[code, error, sessions] = validateSession(userDoc, sessionId) || [];
	if (sessions == undefined) return res.status(code).json(error);
	
	let meals = userDoc.data().meals || [];
	const mealId = req.params.id;
	[code, error, meals] = removeFromArray(meals, mealId) || [];
	if (meals == undefined) return res.status(code).json(error);

	[code, error] = await updateUsersDoc(userDoc.ref, {meals}) || [];
	if (code != undefined) return res.status(code).json(error);

	return res.status(200).send("Ok");
});

// delete goal
app.delete('/goals/:id', async (req, res) => {
	let code, error, username, sessionId, userDoc, sessions;
	[code, error, username, sessionId] = validateCookies(req.cookies) || [];
	if (username == undefined) return res.status(code).json(error);

	[code, error, userDoc] = await getByUsername(username) || [];
	if (userDoc == undefined) return res.status(code).json(error);

	[code, error, sessions] = validateSession(userDoc, sessionId) || [];
	if (sessions == undefined) return res.status(code).json(error);
	
	let goals = userDoc.data().goals || [];
	const goalId = req.params.id;
	[code, error, goals] = removeFromArray(goals, goalId) || [];
	if (goals == undefined) return res.status(code).json(error);

	[code, error] = await updateUsersDoc(userDoc.ref, {goals}) || [];
	if (code != undefined) return res.status(code).json(error);

	return res.status(200).send("Ok");
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
	if (process.env.PORT) {
		console.log(`Server running on https://divine-display-410518.uc.r.appspot.com/`);
	} else {
		console.log(`Server running on http://localhost:${port}`);
	}
});

