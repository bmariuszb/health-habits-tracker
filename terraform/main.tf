terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "5.10.0"
    }
  }
}

resource "google_project_service" "crm_api" {
  project            = var.project_id
  service            = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "app_engine_api" {
  project            = var.project_id
  service            = "appengine.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "email_api" {
  project            = var.project_id
  service            = "iam.googleapis.com" # Email API service
  disable_on_destroy = false
}

resource "google_project_service" "cloud_functions_api" {
  project            = var.project_id
  service            = "cloudfunctions.googleapis.com" # Cloud Functions API service
  disable_on_destroy = false
}

resource "google_app_engine_application" "app" {
  project       = var.project_id
  location_id   = "us-central"
  database_type = "CLOUD_FIRESTORE"
  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket" "terraform_state" {
  name     = var.terraform_state
  project  = var.project_id
  location = "US"
}

resource "google_storage_bucket_object" "src" {
  name   = var.source_name
  source = "../${var.source_name}"
  bucket = var.code_bucket
}

resource "google_app_engine_standard_app_version" "app" {
  project          = var.project_id
  version_id       = var.version_id
  service          = "default"
  runtime          = "nodejs20"
  inbound_services = ["INBOUND_SERVICE_WARMUP"]
  entrypoint {
    shell = "export && cd backend && npm start"
  }
  env_variables = {
    GOOGLE_CREDENTIALS = var.google_credentials
  }
  deployment {
    zip {
      source_url = "https://storage.googleapis.com/${var.code_bucket}/${var.source_name}"
    }
  }
  lifecycle {
    create_before_destroy = true
  }
  depends_on = [google_storage_bucket_object.src]
}

resource "google_app_engine_service_split_traffic" "liveapp" {
  service         = google_app_engine_standard_app_version.app.service
  migrate_traffic = true
  project         = var.project_id
  split {
    shard_by = "IP"
    allocations = {
      (google_app_engine_standard_app_version.app.version_id) = 1
    }
  }
  timeouts {
    create = "20m"
    update = "20m"
    delete = "20m"
  }
}

resource "google_pubsub_topic" "email_notifications_topic" {
  name    = "email-notifications-topic"
  project = var.project_id
}

resource "google_pubsub_subscription" "email_subscription" {
  name    = "email-subscription"
  topic   = google_pubsub_topic.email_notifications_topic.name
  project = var.project_id
}

resource "google_storage_bucket" "cloud_function" {
  name     = "cloud_function_health_habbits"
  project  = var.project_id
  location = "US"
}

resource "google_storage_bucket_object" "cloud_function" {
  name   = "cloud_function.zip"
  bucket = google_storage_bucket.cloud_function.name
  source = "../cloud_function.zip"
}

resource "google_cloudfunctions_function" "function" {
  name                  = "email-function"
  project               = var.project_id
  region                = "us-central1"
  runtime               = "nodejs20"
  source_archive_bucket = google_storage_bucket.cloud_function.name
  source_archive_object = google_storage_bucket_object.cloud_function.name

  entry_point  = "main"

  event_trigger {
    event_type = "google.pubsub.topic.publish"
		resource   = "projects/${var.project_id}/topics/${google_pubsub_topic.email_notifications_topic.name}"
  }
}
