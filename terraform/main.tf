terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "5.10.0"
    }
  }
}

variable "project_id" {
  description = "Project ID"
  type        = string
  default     = "divine-display-410518"
}

variable "source_name" {
  description = "Name of the source zip file"
  type        = string
  default     = "src.zip"
}

variable "code_bucket" {
  description = "Name of the cloud storage bucket for source code"
  type        = string
  default     = "divine-display-410518.appspot.com"
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
}

resource "google_storage_bucket_object" "src" {
  name   = var.source_name
  source = "../${var.source_name}"
  bucket = var.code_bucket
}

resource "google_app_engine_standard_app_version" "app" {
  project    = var.project_id
  version_id = "v1"
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
}
