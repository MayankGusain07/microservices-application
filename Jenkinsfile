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
        withCredentials([
          string(credentialsId: 'aws-access-key',    variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'aws-secret-key',    variable: 'AWS_SECRET_ACCESS_KEY')
        ]) {
          sh """
            export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
            export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
            export AWS_DEFAULT_REGION=${AWS_REGION}

            aws ecr get-login-password --region ${AWS_REGION} | \
              docker login --username AWS --password-stdin ${ECR_BASE}

            docker push ${ECR_BASE}/user-service:${IMAGE_TAG}
            docker push ${ECR_BASE}/product-service:${IMAGE_TAG}
            docker push ${ECR_BASE}/order-service:${IMAGE_TAG}
          """
        }
      }
    }

    // ── Stage 5: Deploy to Kubernetes on AWS EKS ───────────────────────
    stage('Deploy to EKS') {
      steps {
        withCredentials([
          string(credentialsId: 'aws-access-key',    variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'aws-secret-key',    variable: 'AWS_SECRET_ACCESS_KEY')
        ]) {
          sh """
            export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
            export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
            export AWS_DEFAULT_REGION=${AWS_REGION}

            aws eks update-kubeconfig --name ecommerce-eks --region ${AWS_REGION}

            kubectl apply -f k8s/deployments.yaml
            kubectl apply -f k8s/ingress.yaml

            kubectl set image deployment/user-service    user-service=${ECR_BASE}/user-service:${IMAGE_TAG}
            kubectl set image deployment/product-service product-service=${ECR_BASE}/product-service:${IMAGE_TAG}
            kubectl set image deployment/order-service   order-service=${ECR_BASE}/order-service:${IMAGE_TAG}
          """

          // Watch all 3 rollouts simultaneously so the 180s timeout
          // applies to each independently instead of burning through
          // sequentially (which caused product-service to time out).
          script {
            parallel(
              'user-service': {
                sh """
                  export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
                  export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
                  export AWS_DEFAULT_REGION=${AWS_REGION}
                  aws eks update-kubeconfig --name ecommerce-eks --region ${AWS_REGION}
                  kubectl rollout status deployment/user-service --timeout=180s
                """
              },
              'product-service': {
                sh """
                  export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
                  export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
                  export AWS_DEFAULT_REGION=${AWS_REGION}
                  aws eks update-kubeconfig --name ecommerce-eks --region ${AWS_REGION}
                  kubectl rollout status deployment/product-service --timeout=180s
                """
              },
              'order-service': {
                sh """
                  export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
                  export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
                  export AWS_DEFAULT_REGION=${AWS_REGION}
                  aws eks update-kubeconfig --name ecommerce-eks --region ${AWS_REGION}
                  kubectl rollout status deployment/order-service --timeout=180s
                """
              }
            )
          }

          echo "Deployment successful! Image tag: ${IMAGE_TAG}"
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