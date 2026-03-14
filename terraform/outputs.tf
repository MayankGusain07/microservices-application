######################################################
# outputs.tf — Values printed after terraform apply
######################################################

output "cluster_name" {
  description = "EKS cluster name — use with: aws eks update-kubeconfig --name <value>"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Kubernetes API server URL"
  value       = module.eks.cluster_endpoint
}

output "ecr_user_service_url" {
  description = "Docker push URL for user-service"
  value       = aws_ecr_repository.user_service.repository_url
}

output "ecr_product_service_url" {
  description = "Docker push URL for product-service"
  value       = aws_ecr_repository.product_service.repository_url
}

output "ecr_order_service_url" {
  description = "Docker push URL for order-service"
  value       = aws_ecr_repository.order_service.repository_url
}
