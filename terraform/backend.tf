terraform {
  backend "gcs" {
    bucket = "terraform_state_divine-display-410518"
    prefix = "terraform/state"
  }
}
