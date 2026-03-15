# 🚀 DevOps Microservices Project
### AWS · Jenkins · GitHub · Docker · Kubernetes · Terraform

A beginner-friendly e-commerce app with 3 microservices and a full CI/CD pipeline.

---

## 📁 Project Structure

```
devops-project/
├── Jenkinsfile                        # CI/CD pipeline definition
├── terraform/
│   ├── main.tf                        # EKS cluster + ECR repos
│   ├── variables.tf                   # Configurable values
│   └── outputs.tf                     # Printed after apply
├── services/
│   ├── user-service/
│   │   ├── app.js                     # Express API
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── product-service/
│   │   ├── app.js
│   │   ├── package.json
│   │   └── Dockerfile
│   └── order-service/
│       ├── app.js
│       ├── package.json
│       └── Dockerfile
├── k8s/
│   ├── deployments.yaml               # K8s Deployments + Services
│   └── ingress.yaml                   # Routes traffic to services
└── jenkins/
    └── docker-compose.yml             # Run Jenkins locally
```

---

## 🛠️ Prerequisites

Install these tools before starting:

| Tool | Install Command | Purpose |
|------|----------------|---------|
| AWS CLI | `brew install awscli` | Talk to AWS |
| Terraform | `brew install terraform` | Provision infrastructure |
| kubectl | `brew install kubectl` | Manage Kubernetes |
| Docker Desktop | [docker.com](https://docker.com) | Build & run containers |
| Node.js 20+ | `brew install node` | Run services locally |

---

## 📋 Step-by-Step Setup

### PHASE 1 — GitHub Setup

1. Create a new GitHub repository called `devops-project`
2. Push this project code:
   ```bash
   git init
   git add .
   git commit -m "Initial project setup"
   git remote add origin https://github.com/YOUR_USERNAME/devops-project.git
   git push -u origin main
   ```

---

### PHASE 2 — AWS Setup

1. Create a free-tier AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Create an IAM user with **AdministratorAccess** (for learning only)
3. Configure the AWS CLI:
   ```bash
   aws configure
   # Enter: Access Key ID, Secret Access Key, region (us-east-1), output (json)
   ```
4. Verify it works:
   ```bash
   aws sts get-caller-identity
   # Should print your account ID and username
   ```

---

### PHASE 3 — Provision Infrastructure with Terraform

```bash
cd terraform/

# Download required providers
terraform init

# Preview what will be created (no changes yet)
terraform plan

# Create the EKS cluster + ECR repos (~15 minutes)
terraform apply
# Type 'yes' when prompted

# Save the output values — you'll need them later
terraform output
```

After apply completes, you'll see output like:
```
cluster_name             = "ecommerce-eks"
ecr_user_service_url     = "123456789.dkr.ecr.us-east-1.amazonaws.com/ecommerce-app/user-service"
ecr_product_service_url  = "123456789.dkr.ecr.us-east-1.amazonaws.com/ecommerce-app/product-service"
ecr_order_service_url    = "123456789.dkr.ecr.us-east-1.amazonaws.com/ecommerce-app/order-service"
```

Connect kubectl to your new cluster:
```bash
aws eks update-kubeconfig --name ecommerce-eks --region us-east-1
kubectl get nodes   # should show 2 nodes as "Ready"
```

---

### PHASE 4 — Update K8s Manifests with your ECR URLs

Open `k8s/deployments.yaml` and replace all occurrences of:
```
YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com
```
With your actual ECR base URL from the Terraform output.

---

### PHASE 5 — Test Services Locally

```bash
# Test user-service
cd services/user-service
npm install
npm start
# Open http://localhost:3001/health in browser

# Test with curl
curl http://localhost:3001/users
curl http://localhost:3002/products
curl -X POST http://localhost:3003/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "productId": 2, "quantity": 3}'
```

---

### PHASE 6 — Build & Push Docker Images Manually (first time)

```bash
# Log in to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push user-service
docker build -t YOUR_ECR_URL/ecommerce-app/user-service:v1 services/user-service/
docker push YOUR_ECR_URL/ecommerce-app/user-service:v1

# Repeat for product-service and order-service
docker build -t YOUR_ECR_URL/ecommerce-app/product-service:v1 services/product-service/
docker push YOUR_ECR_URL/ecommerce-app/product-service:v1

docker build -t YOUR_ECR_URL/ecommerce-app/order-service:v1 services/order-service/
docker push YOUR_ECR_URL/ecommerce-app/order-service:v1
```

---

### PHASE 7 — Deploy to Kubernetes

```bash
# Install the NGINX Ingress Controller (routes external traffic)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml

# Wait for it to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s

# Deploy all 3 microservices
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/ingress.yaml

# Check everything is running
kubectl get pods       # all should show "Running"
kubectl get services   # shows internal services
kubectl get ingress    # shows the external load balancer IP
```

Test your live app:
```bash
# Get the load balancer URL
kubectl get ingress ecommerce-ingress

# Test each service through the ingress
curl http://LOAD_BALANCER_IP/users
curl http://LOAD_BALANCER_IP/products
curl http://LOAD_BALANCER_IP/orders
```

---

### PHASE 8 — Set Up Jenkins CI/CD

1. Start Jenkins locally:
   ```bash
   cd jenkins/
   docker-compose up -d
   ```
2. Open http://localhost:8080
3. Get the initial admin password:
   ```bash
   docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
   ```
4. Install suggested plugins when prompted
5. Add your credentials in **Manage Jenkins → Credentials**:
   - `aws-credentials` → AWS Access Key + Secret Key
   - `aws-account-id` → Your 12-digit AWS account number
   - `github-token` → GitHub personal access token (with `repo` scope)

6. Create a **Pipeline** job:
   - New Item → Pipeline → OK
   - Under "Pipeline" select **Pipeline script from SCM**
   - SCM: Git → enter your GitHub repo URL
   - Script Path: `Jenkinsfile`

7. Add a GitHub Webhook so Jenkins triggers on every push:
   - GitHub repo → Settings → Webhooks → Add webhook
   - Payload URL: `http://YOUR_JENKINS_IP:8080/github-webhook/`
   - Content type: `application/json`
   - Events: Just the push event

8. **Push any code change** → Jenkins automatically runs the full pipeline!

---

## 🔄 How the CI/CD Flow Works

```
You push code to GitHub
        ↓
GitHub webhook triggers Jenkins
        ↓
Jenkins: runs npm test on all 3 services
        ↓
Jenkins: builds Docker images
        ↓
Jenkins: pushes images to AWS ECR
        ↓
Jenkins: deploys new images to EKS with kubectl
        ↓
Kubernetes: rolls out new pods with zero downtime
        ↓
Your users see the updated app 🎉
```

---

## 🧹 Cleanup (avoid AWS charges)

When you're done learning, tear down all AWS resources:

```bash
# Delete K8s resources first
kubectl delete -f k8s/
kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml

# Then destroy Terraform infrastructure
cd terraform/
terraform destroy
# Type 'yes' — this deletes EKS, ECR, VPC, and everything Terraform created
```

---

## 💡 Next Steps (once you're comfortable)

- [ ] Add a real database (Amazon RDS with PostgreSQL)
- [ ] Add Horizontal Pod Autoscaler (auto-scale pods under load)
- [ ] Add Helm charts (better way to manage K8s manifests)
- [ ] Add monitoring with Prometheus + Grafana
- [ ] Set up staging vs production environments
- [ ] Add HTTPS with cert-manager + Let's Encrypt

---

## ⚠️ AWS Cost Warning

This project uses paid AWS services. Estimated cost while running:
- EKS Cluster: ~$0.10/hour
- 2x t3.medium EC2 nodes: ~$0.08/hour each
- NAT Gateway: ~$0.045/hour

**Always run `terraform destroy` when not actively learning to avoid charges.**
t r i g g e r   t e s t  
 