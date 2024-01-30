use reqwest::Response;
use reqwest::header::HeaderMap;
use json::JsonValue;

pub async fn get_root() -> Result<Response, reqwest::Error> {
    let url = "http://localhost:8080";
    let response = reqwest::get(url).await?;
    Ok(response)
}

pub async fn get_register(header: Option<HeaderMap>) -> Result<Response, reqwest::Error> {
    let url = "http://localhost:8080/register";
    let client = reqwest::Client::new();

    let request = match header {
        Some(h) => client.get(url).headers(h),
        None => client.get(url),
    };

    let response = request.send().await?;

    Ok(response)
}

pub async fn post_users(header: HeaderMap, body: JsonValue) -> Result<Response, reqwest::Error> {
    let url = "http://localhost:8080/users";
    let client = reqwest::Client::new();

    println!("{:?}", body.dump());
    let request = client.post(url).headers(header).body(body.dump());

    let response = request.send().await?;

    Ok(response)
}
