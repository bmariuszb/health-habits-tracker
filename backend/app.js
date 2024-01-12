const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.static('public'))

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});













//const https = require('https');
//const fs = require('fs');
//const path = require('path');
//const admin = require('firebase-admin');
//
//const port = process.env.PORT || 8443;
//
//const options = {
//  key: fs.readFileSync('ssl/localhost-key.pem'),
//  cert: fs.readFileSync('ssl/localhost-cert.pem'),
//ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384'
//};
//
//const server = https.createServer(options, (req, res) => {
//  const url = req.url;
//  // Route handling based on the request URL
//  if (url === '/') {
//    handleRootRequest(req, res);
//  } else if (url === '/test') {
//    handleTestRequest(req, res);
//  } else {
//    // Handle other routes or return a 404 response
//    res.writeHead(404);
//    res.end('Not Found');
//  }
//});
//
//server.listen(port, () => {
//  console.log(`Server running on https://localhost:${port}`);
//});
//
//// handle /
//const handleRootRequest = (req, res) => {
//  res.writeHead(200);
//  res.end('Hello, secure world!');
//};
//
//// handle /test
//const handleTestRequest = (req, res) => {
//  res.writeHead(200);
//  res.end('Hello, secure test world!');
//};








//const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
//admin.initializeApp({
//  credential: admin.credential.cert(serviceAccount),
//});
//
//const db = admin.firestore();
//
//app.use(express.static(path.join(__dirname,'..', 'frontend')));
//
//app.get('/', async (req, res) => {
//	res.sendFile(path.join(__dirname,'..', 'frontend', 'index.html'));
//});
//
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
//
//app.listen(port, () => {
//  console.log(`Server is running on port ${port}`);
//});
