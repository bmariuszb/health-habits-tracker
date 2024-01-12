const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcryptjs');

const frontend_dir_name = 'frontend'
const frontend_path = path.join(__dirname, '..', frontend_dir_name)

app.use('/${frontend_dir}', express.static(frontend_path))
app.use(express.json())

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

app.get('/', (req, res) => {
	const cookie = req.headers.cookie
	if (!cookie || !cookie.includes('authToken=')) {
		return res.redirect('/login');
	}

	console.log('GET / received cookie: ', cookie);
	res.sendFile(path.join(frontend_path, 'index.html'), );
});

app.get('/login', (req, res) => {
	const cookie = req.headers.cookie
	if (cookie && cookie.includes('authToken=')) {
		return res.redirect('/');
	}
	res.sendFile(path.join(frontend_path, 'login.html'), );
});


app.get('/register', (req, res) => {
	const cookie = req.headers.cookie
	if (cookie.includes('authToken=')) {
		return res.redirect('/');
	}
	res.sendFile(path.join(frontend_path, 'register.html'), );
});

app.get('/create-account', (req, res) => {
});

app.patch('/authenticate', (req, res) => {
	const {username, password} = req.body
	const saltRounds = 10;
	bcrypt.genSalt(saltRounds, (err, salt) => {
		if (err) {
			return res.status(500).send('Error generating salt');
		}

		console.log('Salt: ', salt)
		bcrypt.hash(password, salt, (err, hashedPassword) => {
			if (err) {
				return res.status(500).send('Error hashing password');
			}

			bcrypt.hash(hashedPassword, saltRounds, (err, hash) => {
				console.log('Username: ', username);
				console.log('Salt + Hashed Password: ', hashedPassword);
				console.log('Hashed Salt + Hashed Password: ', hash);
			});

			res.status(200).send('Authentication successful');
		});
	});
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
	if (process.env.PORT) {
		console.log(`Server running on https://divine-display-410518.uc.r.appspot.com/`);
	} else {
		console.log(`Server running on http://localhost:${port}`);
	}
});

//app.post('/create-user', async (req, res) => {
//	console.log("creating user")
//  try {
//    const username = 'testuser2';
//    const email = 'testuser2@example.com';
//
//    const userRef = await db.collection('users').add({
//      username,
//      email,
//    });
//
//    res.status(201).json({
//      message: 'User created successfully',
//      userId: userRef.id,
//    });
//  } catch (error) {
//    console.error('Error creating user:', error);
//    res.status(500).json({
//      error: 'Internal Server Error',
//    });
//  }
//});
