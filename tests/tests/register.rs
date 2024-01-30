use tests::api::requests::{ get_register, post_users };
use reqwest::header::HeaderMap;
use json::object;

#[tokio::test]
async fn test_get_register() {
    match get_register(None).await {
        Ok(response) => {
            let status = response.status();
            let path = response.url().path();

            assert_eq!(status, reqwest::StatusCode::OK);
            assert_eq!(path, "/register");

            println!("Response Status Code: {}", status);
            println!("Url Path: {}", path);
        }
        Err(e) => panic!("Error: {}", e),
    }
}

#[tokio::test]
async fn test_post_users() {
    let mut headers = HeaderMap::new();
    //headers.insert("Cookie", "id=21313".parse().unwrap());
    headers.insert("Content-Type", "application/json".parse().unwrap());
    headers.insert("User-Agent", "Rust - reqwest".parse().unwrap());

    let body = object!{
        username: "tests",
        password: "easypass",
    };
    match post_users(headers, body).await {
        Ok(response) => {
            let status = response.status();
            let body = response.text().await;
            let body = body.unwrap();

            println!("Response Status Code: {}", status);
            println!("Body: {}", body);
        }
        Err(e) => panic!("Error: {}", e),
    }
}
