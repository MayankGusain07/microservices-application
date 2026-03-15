pipeline {
  agent any

  environment {
    AWS_REGION      = 'us-east-1'
    AWS_ACCOUNT_ID  = credentials('aws-account-id')
    ECR_BASE        = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ecommerce-app"
    IMAGE_TAG       = "${env.BUILD_NUMBER}"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        echo "Building commit: ${env.GIT_COMMIT}"
      }
    }

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

    stage('Build Docker Images') {
      steps {
        script {
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

    stage('Push to ECR') {
      steps {
        withCredentials([
          string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY')
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

    stage('Deploy to EKS') {
      steps {
        withCredentials([
          string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY')
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

            kubectl rollout status deployment/user-service    --timeout=420s
            sleep 10
            kubectl rollout status deployment/product-service --timeout=420s
            sleep 10
            kubectl rollout status deployment/order-service   --timeout=4200s

            echo "Deployment successful! Image tag: ${IMAGE_TAG}"
          """
        }
      }
    }
  }

  post {
    success {
      echo "Pipeline SUCCESS -- build #${env.BUILD_NUMBER} deployed"
    }
    failure {
      echo "Pipeline FAILED -- check console output above"
    }
    always {
      sh "docker image prune -f"
    }
  }
}