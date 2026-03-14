######################################################
# variables.tf — Configurable values for the project
######################################################

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Used as a prefix for all resource names"
  type        = string
  default     = "ecommerce-app"
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "ecommerce-eks"
}

variable "environment" {
  description = "dev | staging | prod"
  type        = string
  default     = "dev"
}
