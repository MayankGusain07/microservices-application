//////////////////////////////////////////////////////
// Jenkinsfile — CI/CD pipeline
// Triggered automatically when you push to GitHub
//
// Jenkins credentials needed (set in Jenkins UI):
//   aws-credentials  → AWS Access Key + Secret
//   github-token     → GitHub personal access token
//////////////////////////////////////////////////////

pipeline {
  agent any

  environment {
    AWS_REGION      = 'us-east-1'
    AWS_ACCOUNT_ID  = credentials('aws-account-id')   // stored in Jenkins
    ECR_BASE        = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ecommerce-app"
    IMAGE_TAG       = "${env.BUILD_NUMBER}"             // unique tag per build
  }

  stages {

    // ── Stage 1: Pull the latest code ──────────────────────────────────
    stage('Checkout') {
      steps {
        checkout scm   // Jenkins automatically checks out the GitHub repo
        echo "Building commit: ${env.GIT_COMMIT}"
      }
    }

    // ── Stage 2: Run tests for each service ────────────────────────────
    stage('Test') {
      parallel {
        stage('Test user-service') {
          steps {
            dir('services/user-service') {
              sh 'npm install'
              sh 'npm test'
            }
          }
        }
        stage('Test product-service') {
          steps {
            dir('services/product-service') {
              sh 'npm install'
              sh 'npm test'
            }
          }
        }
        stage('Test order-service') {
          steps {
            dir('services/order-service') {
              sh 'npm install'
              sh 'npm test'
            }
          }
        }
      }
    }

    // ── Stage 3: Build Docker images ───────────────────────────────────
    stage('Build Docker Images') {
      steps {
        script {
          // Build all 3 images in parallel for speed
          parallel(
            'user-service': {
              sh "docker build -t ${ECR_BASE}/user-service:${IMAGE_TAG} services/user-service"
            },
            'product-service': {
              sh "docker build -t ${ECR_BASE}/product-service:${IMAGE_TAG} services/product-service"
            },
            'order-service': {
              sh "docker build -t ${ECR_BASE}/order-service:${IMAGE_TAG} services/order-service"
            }
          )
        }
      }
    }

    // ── Stage 4: Push images to AWS ECR ────────────────────────────────
    stage('Push to ECR') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                          credentialsId: 'aws-credentials']]) {
          script {
            // Log in to ECR (token expires every 12 hours)
            sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_BASE}"

            parallel(
              'user-service': {
                sh "docker push ${ECR_BASE}/user-service:${IMAGE_TAG}"
                sh "docker tag  ${ECR_BASE}/user-service:${IMAGE_TAG} ${ECR_BASE}/user-service:latest"
                sh "docker push ${ECR_BASE}/user-service:latest"
              },
              'product-service': {
                sh "docker push ${ECR_BASE}/product-service:${IMAGE_TAG}"
                sh "docker tag  ${ECR_BASE}/product-service:${IMAGE_TAG} ${ECR_BASE}/product-service:latest"
                sh "docker push ${ECR_BASE}/product-service:latest"
              },
              'order-service': {
                sh "docker push ${ECR_BASE}/order-service:${IMAGE_TAG}"
                sh "docker tag  ${ECR_BASE}/order-service:${IMAGE_TAG} ${ECR_BASE}/order-service:latest"
                sh "docker push ${ECR_BASE}/order-service:latest"
              }
            )
          }
        }
      }
    }

    // ── Stage 5: Deploy to Kubernetes on AWS EKS ───────────────────────
    stage('Deploy to EKS') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                          credentialsId: 'aws-credentials']]) {
          script {
            // Configure kubectl to talk to your EKS cluster
            sh "aws eks update-kubeconfig --name ecommerce-eks --region ${AWS_REGION}"

            // Apply all K8s manifests
            sh "kubectl apply -f k8s/deployments.yaml"
            sh "kubectl apply -f k8s/ingress.yaml"

            // Update each deployment to use the new image tag
            sh "kubectl set image deployment/user-service    user-service=${ECR_BASE}/user-service:${IMAGE_TAG}"
            sh "kubectl set image deployment/product-service product-service=${ECR_BASE}/product-service:${IMAGE_TAG}"
            sh "kubectl set image deployment/order-service   order-service=${ECR_BASE}/order-service:${IMAGE_TAG}"

            // Wait for rollout to finish before marking build as success
            sh "kubectl rollout status deployment/user-service    --timeout=120s"
            sh "kubectl rollout status deployment/product-service --timeout=120s"
            sh "kubectl rollout status deployment/order-service   --timeout=120s"

            echo "Deployment successful! Image tag: ${IMAGE_TAG}"
          }
        }
      }
    }
  }

  // ── Notifications ─────────────────────────────────────────────────────
  post {
    success {
      echo "Pipeline SUCCESS — build #${env.BUILD_NUMBER} deployed"
      // Add Slack/email notification here later
    }
    failure {
      echo "Pipeline FAILED — check console output above"
      // Jenkins will mark the GitHub commit as failed automatically
    }
    always {
      // Clean up local Docker images to save disk space
      sh "docker image prune -f"
    }
  }
}
