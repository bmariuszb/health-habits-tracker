exports.function = () => {
	const { PubSub } = require('@google-cloud/pubsub');
	const nodemailer = require('nodemailer');

	// Create a transporter using your SMTP credentials
	const transporter = nodemailer.createTransport({
		host: 'smtp.elasticemail.com',
		port: 2525,
		//secure: false, // Set to true if your SMTP server requires a secure connection
		auth: {
			user: 'bobo1342345@gmail.com',
			pass: 'B2F2CF344B04801F52B144DDB6D7E3A9248A',
		},
	});

	function sendEmail(mailOptions) {
		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				console.error('Error sending email:', error);
			} else {
				console.log('Email sent successfully:', info.response);
			}
		});
	}

	function listenForMessages(subscriptionNameOrId) {
		const subscription = pubSubClient.subscription(subscriptionNameOrId);

		const messageHandler = message => {
			console.log(`Received message ${message.id}:`);
			console.log(`\tData: ${message.data}`);
			console.log(`\tAttributes: ${message.attributes}`);

			const mailOptions = {
				from: 'bobo1342345@gmail.com',
				to: 'mariuszbie@student.agh.edu.pl',
				subject: 'Health habbits tracker',
				text: message.data,
			};
			sendEmail(mailOptions);

			message.ack();
		};

		subscription.on('message', messageHandler);
	}

	const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
	const projectId = 'divine-display-410518';
	const pubSubClient = new PubSub({ projectId, credentials: serviceAccount });
	listenForMessages('email-subscription');
}
