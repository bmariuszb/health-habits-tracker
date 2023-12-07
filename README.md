# System Description

The health habits tracking system is designed to help users monitor and manage various aspects of their well-being, including physical activity, meals, goals, and overall daily wellness. Users can input and track specific details such as exercise routines, meal information, and personal goals within the system.

## Functionality

1. **Physical Activity Tracking:**
   - Users can log details about their physical activities, including the type of exercise, duration, and relevant metrics such as weight lifted or distance covered.

2. **Meal Logging:**
   - The system allows users to record their meals, including the names of consumed items and associated calorie counts.

3. **Goal Setting:**
   - Users can set wellness goals, specifying titles, descriptions, due dates, and tracking their progress towards achieving these goals.

4. **Well-Being Statistics:**
   - The system generates statistics and charts based on user input, providing insights into daily well-being trends.

## Collaboration with Other Systems

- **Google Cloud Firestore:**
  - The system integrates with Google Cloud Firestore to store and retrieve user-specific data, ensuring a scalable and reliable database for information storage.

- **App Engine:**
  - The application logic is hosted on Google App Engine, providing a scalable and managed environment for running the Node.js application. This allows for efficient handling of user requests and data processing.

- **Pub/Sub for Notifications:**
  - Cloud Pub/Sub is employed for sending email notifications. The system publishes events to relevant topics, and Cloud Functions subscribe to these topics to trigger email notifications based on user-defined goals or system events.

## User Interaction

- **User Interface (Web App):**
  - Users interact with the system through a user-friendly interface, submitting and retrieving data related to their health habits.

## Benefits

- **Scalability:**
  - Leveraging App Engine ensures the system can scale seamlessly based on user demand.

- **Real-Time Notifications:**
  - Pub/Sub enables the system to deliver real-time email notifications, keeping users informed about goal progress and relevant updates.

## Deployment
The system will be deployed with Terraform.

## Conclusion

In summary, the health habits tracking system, hosted on Google App Engine and utilizing Pub/Sub for notifications, provides users with a comprehensive tool to monitor and enhance their well-being. The integration with Google Cloud Firestore ensures robust data management, while the user interface facilitates an intuitive and engaging experience. The system's modular design allows for collaboration with other Google Cloud services and potential future expansions.
