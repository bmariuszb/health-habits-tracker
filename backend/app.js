const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname,'..', 'frontend')));

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname,'..', 'frontend', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
