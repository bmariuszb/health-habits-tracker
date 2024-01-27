const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser')
const { v4: uuidv4 } = require('uuid');
const days = 10;// hard coded 10 days storing uuid

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
	return [, querySnapshot[0]];
}

async function getByUsername(username) {
	let querySnapshot;
	try {
		querySnapshot = await usersCollection.where('username', '==', username).limit(1).get();

		if (querySnapshot.empty) {
			return [404, { error: 'User not found' }];
		}
	} catch (error) {
		console.error("Error querying database:", error);
		return [500, { error: 'Internal server error' }];
	}

	return [, querySnapshot.docs[0]];
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

	// verify password
	const user = querySnapshot.docs[0];
	const hashedPassword = user.data().password;
	const passwordMatch = await bcrypt.compare(password, hashedPassword);
	if (!passwordMatch) {
		return [401, { error: 'Invalid username or password' }];
	}

	return [, user];
}


// main page
app.get('/', (req, res) => {
	const cookie = req.headers.cookie
	if (!cookie || !cookie.includes('id=')) {
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

// delete page
app.get('/delete-account', (_req, res) => {
	res.sendFile(path.join(frontend_path, 'deleteAccount.html'), );
});

// manage sessions page
app.get('/manage-sessions', (_req, res) => {
	res.sendFile(path.join(frontend_path, 'manageSessions.html'), );
});

// get sessions list
app.get('/sessions', async (req, res) => {
	const cookies = req.cookies;
	const username = cookies['username'];
	const sessionId = cookies['id'];
	if (!username || !sessionId) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	// get document by username
	const [code, error] = await getByUsername(username) || [];
	if (code) return res.status(code).json(error);
	// get user data from error
	if (!error) return res.status(500).json({ error: 'Internal server error' });
	const userDoc = error;

	// verify that cookie id is in sessions id
	let sessions = userDoc.data().sessions || [];
	const currentTimestamp = Math.floor(Date.now() / 1000);
	sessions = sessions.filter(session => {
		return session.exp_date._seconds > currentTimestamp;
	});

	// Check if the session ID is in the list of sessions
	const isValidSession = sessions.some(session => session.id === sessionId);

	if (!isValidSession) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	// Return array of sessions
	return res.status(200).json({ sessions });
});


// register user
app.post('/users', async (req, res) => {
	const { username, password } = req.body;

	// check if username is valid
	let [code, error] = isValidUsername(username) || [];
  if (code) return res.status(code).json(error);

	// check if username taken
	[code, error] = await ifUsernameExists(username) || [];
	if (code) return res.status(code).json(error);

	// generate uuid and hash password
	const uuid = uuidv4();
	const saltRounds = 10;
	const hashedPassword = await bcrypt.hash(password, saltRounds);

	// set expiration date, get userAgent and ipAddress
	const expDate = new Date();
  expDate.setDate(expDate.getDate() + days);
	const userAgent = req.get('user-agent');
	const ipAddress = req.ip;

	//create user
	const session = {
		id: uuid,
		exp_date: expDate,
		user_agent: userAgent,
		ip_address: ipAddress
	};
	const user = {
			username,
			password: hashedPassword,
			sessions: [ session ]
	}
	try {
		await usersCollection.add(user);
	} catch (error) {
    console.error("Error adding new user:", error);
		return res.status(500).json({ error: 'Internal server error' });
  }

	// set uuid in cookie, not secure
	res.cookie('id', uuid, {
		expires: expDate,
		secure: false,
		sameSite: 'Strict'
	});
	// set username in cookie
	res.cookie('username', username, {
		expires: expDate,
		secure: false,
		sameSite: 'Strict'
	});

	return res.status(201).json({ redirectPath: '/' });
});

// delete user
app.delete('/users', async (req, res) => {
	const cookies = req.cookies;
	const username = cookies['username'];

	// get document by username
	let [code, error] = await getByUsername(username) || [];
	if (code) return res.status(code).json(error);
	// get user data from error
	if (!error) return res.status(500).json({ error: 'Internal server error' });
	const userDoc = error;

  const password = req.body.password;
	[code, error] = await isValidPassword(password, userDoc.data().password) || [];
	if (code) return res.status(code).json(error);

	// delete user
	try {
		const userRef = usersCollection.doc(userDoc.id);
		await userRef.delete();
	} catch (error) {
		console.error("Error deleting user:", error);
		return res.status(500).json({ error: 'Internal server error' });
	}

	// clear cookies
	res.clearCookie('id');
	res.clearCookie('username');
	return res.status(200).json({ redirectPath: '/login' });
});

// logout user
app.post('/logout', async (req, res) => {
	const cookies = req.cookies;
	const username = cookies['username'];
	const sessionId = cookies['id'];

	// get document by username
	const [code, error] = await getByUsername(username) || [];
	if (code) return res.status(code).json(error);
	// get user data from error
	if (!error) return res.status(500).json({ error: 'Internal server error' });
	const userDoc = error;

	// delete array element where id == sessionId
	const updatedSessions = userDoc.data().sessions.filter(session => session.id !== sessionId);

	// update user document with the modified sessions array
	try {
		const userRef = usersCollection.doc(userDoc.id);
		await userRef.update({ sessions: updatedSessions });
	} catch (error) {
		console.error("Error updating user sessions:", error);
		return res.status(500).json({ error: 'Internal server error' });
	}

	// clear cookies
	res.clearCookie('id');
	res.clearCookie('username');

	return res.status(200).send('Logout successful');;
});

// login user
app.post('/login', async (req, res) => {
	const { username, password } = req.body;
	// validate user
	const [code, error] = await ifUsernamePasswordValid(username, password) || [];
	if (code) return res.status(code).json(error);
	
	// get user data and refrence
	if (!error) return res.status(500).json({ error: 'Internal server error' });
	const userDoc = error;

	// generate uuid, set expiration date, get userAgent and ipAddress
	const uuid = uuidv4();
	const expDate = new Date();
  expDate.setDate(expDate.getDate() + days);
	const userAgent = req.get('user-agent');
	const ipAddress = req.ip;

	// define new session
	const newSession = {
		id: uuid,
		exp_date: expDate,
		user_agent: userAgent,
		ip_address: ipAddress
	};
	let sessions = userDoc.data().sessions || [];
	const currentTimestamp = Math.floor(Date.now() / 1000);
	sessions = sessions.filter(session => {
		return session.exp_date._seconds > currentTimestamp;
	});
	sessions.push(newSession);

	// update sessions
	try {
		await userDoc.ref.update({ sessions });
	} catch (error) {
    console.error("Error updating user sessions:", error);
		return res.status(500).json({ error: 'Internal server error' });
  }

	// set uuid in cookie, not secure
	res.cookie('id', uuid, {
		expires: expDate,
		secure: false,
		sameSite: 'Strict'
	});
	// set username in cookie
	res.cookie('username', username, {
		expires: expDate,
		secure: false,
		sameSite: 'Strict'
	});

	return res.status(200).send("Login successful");
});

// delete sessions
app.delete('/sessions', async (req, res) => {
	const cookies = req.cookies;
	const username = cookies['username'];
	const sessionId = cookies['id'];
	if (!username || !sessionId) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	// get document by username
	const [code, error] = await getByUsername(username) || [];
	if (code) return res.status(code).json(error);
	// get user data from error
	if (!error) return res.status(500).json({ error: 'Internal server error' });
	const userDoc = error;
	let dbSessions = userDoc.data().sessions || [];

	// Check if the session ID is in the list of sessions
	const isValidSession = dbSessions.some(session => session.id === sessionId);
	if (!isValidSession) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	// remove sessions from all
	const sessionIds = req.body.sessionIds;
	dbSessions = dbSessions.filter(session => !sessionIds.includes(session.id));

	// update database with new smaller sessions array
	try {
		const userRef = usersCollection.doc(userDoc.id);
		await userRef.update({ sessions: dbSessions });
	} catch (error) {
		console.error("Error updating user sessions:", error);
		return res.status(500).json({ error: 'Internal server error' });
	}

	// check if user is deleting active session
	const isSessionActive = sessionIds.some(session => session === sessionId);
	if (isSessionActive) {
		// clear cookies
		res.clearCookie('id');
		res.clearCookie('username');
		return res.status(200).json({ redirectPath: '/login' });
	}
	return res.status(200).json({});
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
	if (process.env.PORT) {
		console.log(`Server running on https://divine-display-410518.uc.r.appspot.com/`);
	} else {
		console.log(`Server running on http://localhost:${port}`);
	}
});

