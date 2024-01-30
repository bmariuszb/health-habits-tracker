use tests::api::requests::get_root;

#[tokio::test]
async fn test_get_root() {
    match get_root().await {
        Ok(response) => {
            let status = response.status();
            assert_eq!(status, reqwest::StatusCode::OK);
            println!("Response Status Code: {}", status);
        }
        Err(e) => panic!("Error: {}", e),
    }
}
