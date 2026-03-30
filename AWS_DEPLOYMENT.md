# Hot_Cold_World - Docker & AWS Deployment Guide

## Local Development with Docker

### Prerequisites
- Docker installed
- Docker Compose installed
- Node.js v25.8.2+ (for local development without Docker)

### Quick Start with Docker

1. **Build and run locally:**
```bash
docker-compose up --build
```

The app will be available at `http://localhost:5000`

2. **Stop the container:**
```bash
docker-compose down
```

3. **View logs:**
```bash
docker-compose logs -f hot-cold-world
```

---

## AWS Deployment

### Architecture
- **Frontend**: Served from backend (via `/frontend` static files)
- **Backend**: Node.js/Express running on AWS ECS Fargate
- **Secrets**: OpenWeather API key stored in AWS Secrets Manager
- **Logging**: CloudWatch Logs
- **Optional**: CloudFront for CDN, S3 for static assets, RDS for future database needs

### Prerequisites
- AWS Account
- AWS CLI configured with credentials
- Docker image pushed to ECR (Amazon Elastic Container Registry)

### Step 1: Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name hot-cold-world \
  --region us-east-1
```

### Step 2: Build and Push Docker Image to ECR

```bash
# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t hot-cold-world:latest .

# Tag image for ECR
docker tag hot-cold-world:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hot-cold-world:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hot-cold-world:latest
```

### Step 3: Store API Key in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name openweather-api-key \
  --secret-string "your_actual_api_key_here" \
  --region us-east-1
```

### Step 4: Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name hot-cold-world-cluster \
  --region us-east-1
```

### Step 5: Register Task Definition

Update `ecs-task-definition.json`:
- Replace `ACCOUNT_ID` with your AWS Account ID
- Replace `REGION` with your desired region (e.g., us-east-1)

```bash
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region us-east-1
```

### Step 6: Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/hot-cold-world \
  --region us-east-1
```

### Step 7: Create ECS Service

```bash
aws ecs create-service \
  --cluster hot-cold-world-cluster \
  --service-name hot-cold-world-service \
  --task-definition hot-cold-world:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/hot-cold-world/xxxxxxx,containerName=hot-cold-world-container,containerPort=5000 \
  --region us-east-1
```

### Step 8: Optional - Set up Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name hot-cold-world-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx \
  --region us-east-1

# Create target group
aws elbv2 create-target-group \
  --name hot-cold-world-tg \
  --protocol HTTP \
  --port 5000 \
  --vpc-id vpc-xxx \
  --region us-east-1

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:loadbalancer/app/hot-cold-world-alb/xxxxxxx \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/hot-cold-world-tg/xxxxxxx \
  --region us-east-1
```

### Step 9: Scale Your Service

```bash
aws ecs update-service \
  --cluster hot-cold-world-cluster \
  --service hot-cold-world-service \
  --desired-count 3 \
  --region us-east-1
```

---

## Monitoring & Logs

### View CloudWatch Logs

```bash
aws logs tail /ecs/hot-cold-world --follow --region us-east-1
```

### Check Service Status

```bash
aws ecs describe-services \
  --cluster hot-cold-world-cluster \
  --services hot-cold-world-service \
  --region us-east-1
```

### View Task Details

```bash
aws ecs list-tasks \
  --cluster hot-cold-world-cluster \
  --region us-east-1

aws ecs describe-tasks \
  --cluster hot-cold-world-cluster \
  --tasks arn:aws:ecs:us-east-1:ACCOUNT_ID:task/hot-cold-world-cluster/xxxxx \
  --region us-east-1
```

---

## Environment Variables

Default environment variables for ECS:
- `NODE_ENV`: production
- `PORT`: 5000
- `OPENWEATHER_API_KEY`: Retrieved from Secrets Manager

---

## Cleanup

```bash
# Delete ECS service
aws ecs delete-service \
  --cluster hot-cold-world-cluster \
  --service hot-cold-world-service \
  --force \
  --region us-east-1

# Delete ECS cluster
aws ecs delete-cluster \
  --cluster hot-cold-world-cluster \
  --region us-east-1

# Delete ECR repository
aws ecr delete-repository \
  --repository-name hot-cold-world \
  --force \
  --region us-east-1

# Delete Secrets Manager secret
aws secretsmanager delete-secret \
  --secret-id openweather-api-key \
  --force-delete-without-recovery \
  --region us-east-1

# Delete CloudWatch log group
aws logs delete-log-group \
  --log-group-name /ecs/hot-cold-world \
  --region us-east-1
```

---

## Additional AWS Services (Optional)

### CloudFront (CDN for frontend assets)
```bash
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### S3 (Static frontend hosting)
```bash
aws s3 mb s3://hot-cold-world-frontend
aws s3 sync frontend/ s3://hot-cold-world-frontend/
```

### RDS (Future database needs)
```bash
aws rds create-db-instance \
  --db-instance-identifier hot-cold-world-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password "YOUR_SECURE_PASSWORD"
```

---

## Support

For issues or questions:
1. Check CloudWatch Logs: `/ecs/hot-cold-world`
2. Verify ECS task status
3. Check service configuration in AWS Console
4. Review backend logs in the running container

---

**Happy deploying! 🔥❄️**
