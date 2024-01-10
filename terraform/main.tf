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
  project    = var.project_id
  version_id = var.version_id
  service    = "default"
  runtime    = "nodejs20"
  entrypoint {
    shell = "cd backend && npm start"
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
  project            = var.project_id
  split {
    shard_by = "IP"
    allocations = {
      (google_app_engine_standard_app_version.app.version_id) = 1
    }
  }
}
