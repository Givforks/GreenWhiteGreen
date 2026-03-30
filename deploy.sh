#!/bin/bash

# Hot_Cold_World - Docker & AWS Deployment Helper Script
# Usage: ./deploy.sh [command]

set -e

PROJECT_NAME="hot-cold-world"
REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_NAME="${ECR_REGISTRY}/${PROJECT_NAME}:latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}===================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Commands
help() {
    echo -e "${BLUE}Hot_Cold_World - Deployment Helper${NC}"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  help              Show this help message"
    echo "  build             Build Docker image locally"
    echo "  run               Run container locally with docker-compose"
    echo "  logs              View docker-compose logs"
    echo "  stop              Stop docker-compose containers"
    echo "  ecr-login         Login to AWS ECR"
    echo "  ecr-create        Create ECR repository (first time only)"
    echo "  build-push        Build and push image to ECR"
    echo "  ecs-create        Create ECS cluster (first time only)"
    echo "  ecs-register      Register ECS task definition"
    echo "  ecs-deploy        Deploy to ECS (requires task definition)"
    echo "  ecs-logs          View ECS CloudWatch logs"
    echo "  ecs-status        Check ECS service status"
    echo "  clean             Clean up local Docker artifacts"
    echo "  clean-aws         Delete all AWS resources (use with caution!)"
    echo ""
}

build() {
    print_header "Building Docker Image Locally"
    docker build -t ${PROJECT_NAME}:latest .
    print_success "Image built: ${PROJECT_NAME}:latest"
}

run() {
    print_header "Starting Docker Compose"
    docker-compose up --build
}

logs() {
    print_header "Docker Compose Logs"
    docker-compose logs -f
}

stop() {
    print_header "Stopping Docker Compose"
    docker-compose down
    print_success "Containers stopped"
}

ecr_login() {
    print_header "Logging in to ECR"
    aws ecr get-login-password --region ${REGION} | \
        docker login --username AWS --password-stdin ${ECR_REGISTRY}
    print_success "Logged in to ECR"
}

ecr_create() {
    print_header "Creating ECR Repository"
    aws ecr create-repository \
        --repository-name ${PROJECT_NAME} \
        --region ${REGION} || print_warning "Repository may already exist"
    print_success "ECR repository ready"
}

build_push() {
    print_header "Building and Pushing to ECR"
    
    ecr_login
    print_header "Building image..."
    docker build -t ${IMAGE_NAME} .
    print_success "Image built"
    
    print_header "Pushing to ECR..."
    docker push ${IMAGE_NAME}
    print_success "Image pushed to ECR"
    echo "Image URI: ${IMAGE_NAME}"
}

ecs_create() {
    print_header "Creating ECS Cluster"
    aws ecs create-cluster \
        --cluster-name ${PROJECT_NAME}-cluster \
        --region ${REGION}
    print_success "ECS cluster created"
}

ecs_register() {
    print_header "Registering ECS Task Definition"
    
    # Prepare task definition
    TASK_DEF=$(cat ecs-task-definition.json | \
        sed "s|ACCOUNT_ID|${ACCOUNT_ID}|g" | \
        sed "s|REGION|${REGION}|g")
    
    echo "${TASK_DEF}" > /tmp/ecs-task-def-temp.json
    
    aws ecs register-task-definition \
        --cli-input-json file:///tmp/ecs-task-def-temp.json \
        --region ${REGION}
    
    rm /tmp/ecs-task-def-temp.json
    print_success "Task definition registered"
}

ecs_deploy() {
    print_header "Deploying to ECS"
    print_warning "Note: Ensure VPC, subnets, and security groups are configured"
    
    aws ecs create-service \
        --cluster ${PROJECT_NAME}-cluster \
        --service-name ${PROJECT_NAME}-service \
        --task-definition ${PROJECT_NAME}:1 \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={assignPublicIp=ENABLED}" \
        --region ${REGION} || print_warning "Service may already exist. Use AWS Console to update."
    
    print_success "Service deployment initiated"
}

ecs_logs() {
    print_header "ECS CloudWatch Logs"
    aws logs tail /ecs/${PROJECT_NAME} --follow --region ${REGION}
}

ecs_status() {
    print_header "ECS Service Status"
    aws ecs describe-services \
        --cluster ${PROJECT_NAME}-cluster \
        --services ${PROJECT_NAME}-service \
        --region ${REGION} \
        --query 'services[0].[serviceName,status,desiredCount,runningCount]' \
        --output table
}

clean() {
    print_header "Cleaning up local Docker artifacts"
    docker-compose down -v
    docker image rm ${PROJECT_NAME}:latest 2>/dev/null || true
    print_success "Cleanup complete"
}

clean_aws() {
    print_warning "This will DELETE all AWS resources for this project!"
    read -p "Are you sure? Type 'yes' to continue: " -r
    if [[ $REPLY == "yes" ]]; then
        print_header "Deleting AWS Resources"
        
        # Delete ECS service
        aws ecs delete-service \
            --cluster ${PROJECT_NAME}-cluster \
            --service ${PROJECT_NAME}-service \
            --force \
            --region ${REGION} 2>/dev/null || true
        print_success "ECS service deleted"
        
        # Delete ECS cluster
        aws ecs delete-cluster \
            --cluster ${PROJECT_NAME}-cluster \
            --region ${REGION} 2>/dev/null || true
        print_success "ECS cluster deleted"
        
        # Delete ECR repository
        aws ecr delete-repository \
            --repository-name ${PROJECT_NAME} \
            --force \
            --region ${REGION} 2>/dev/null || true
        print_success "ECR repository deleted"
        
        # Delete Secrets Manager secret
        aws secretsmanager delete-secret \
            --secret-id openweather-api-key \
            --force-delete-without-recovery \
            --region ${REGION} 2>/dev/null || true
        print_success "Secrets deleted"
        
        # Delete CloudWatch log group
        aws logs delete-log-group \
            --log-group-name /ecs/${PROJECT_NAME} \
            --region ${REGION} 2>/dev/null || true
        print_success "CloudWatch logs deleted"
        
        print_success "All AWS resources deleted"
    else
        print_warning "Cleanup cancelled"
    fi
}

# Main logic
COMMAND=${1:-help}

case ${COMMAND} in
    help)
        help
        ;;
    build)
        build
        ;;
    run)
        run
        ;;
    logs)
        logs
        ;;
    stop)
        stop
        ;;
    ecr-login)
        ecr_login
        ;;
    ecr-create)
        ecr_create
        ;;
    build-push)
        build_push
        ;;
    ecs-create)
        ecs_create
        ;;
    ecs-register)
        ecs_register
        ;;
    ecs-deploy)
        ecs_deploy
        ;;
    ecs-logs)
        ecs_logs
        ;;
    ecs-status)
        ecs_status
        ;;
    clean)
        clean
        ;;
    clean-aws)
        clean_aws
        ;;
    *)
        print_error "Unknown command: ${COMMAND}"
        echo ""
        help
        exit 1
        ;;
esac
