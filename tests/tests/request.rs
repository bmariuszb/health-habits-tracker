use tests::api::requests::{ get_register, post_users };
use reqwest::header::HeaderMap;
use json::object;

// API
// create user
// create again with same name
// login user
// login wrong password
// login wrong username
// delete user
// delete user wrong password
// list sessions
// delete two non active session
// delete active session
// list activities
// add activity
// delete activity
// list meals
// add meal
// delete activity

// UI
// go to /, click register register, click register
// go to /register click login, login
// go to / click manage sessions, click delete session, view sessions list changed, add new
// session and verify that it got added
// same for activity, meals, goals, wellbeing
// test every button
