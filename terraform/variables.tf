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

variable "terraform_state" {
  description = "Name of the cloud storage bucket for terraform state"
  type        = string
  default     = "terraform_state_divine-display-410518"
}
