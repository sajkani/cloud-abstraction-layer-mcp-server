#!/bin/bash

# Cloud Run deployment script
# Usage: ./deploy.sh [PROJECT_ID] [REGION] [SERVICE_NAME]

set -e

PROJECT_ID=${1:-${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}}
REGION=${2:-us-central1}
SERVICE_NAME=${3:-cloud-abstraction-layer-mcp-server}

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID is required. Set GOOGLE_CLOUD_PROJECT or pass as first argument."
  exit 1
fi

echo "Deploying to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

# Build and deploy
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10

echo ""
echo "Deployment complete!"
echo "Get the service URL with:"
echo "gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format 'value(status.url)'"

