function main () {
	const { PubSub } = require('@google-cloud/pubsub');

	function listenForMessages(subscriptionNameOrId) {
		const subscription = pubSubClient.subscription(subscriptionNameOrId);

		let messageCount = 0;
		const messageHandler = message => {
			console.log(`Received message ${message.id}:`);
			console.log(`\tData: ${message.data}`);
			console.log(`\tAttributes: ${message.attributes}`);
			messageCount += 1;

			message.ack();
		};

		subscription.on('message', messageHandler);
	}


	const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
	const projectId = 'divine-display-410518';
	const pubSubClient = new PubSub({ projectId, credentials: serviceAccount });
	listenForMessages('email-subscription');
}
