# Quick Deploy to Cloud Run

## One-Command Deployment

```bash
./deploy.sh [PROJECT_ID] [REGION] [SERVICE_NAME]
```

Example:
```bash
./deploy.sh my-gcp-project us-central1 cloud-abstraction-layer-mcp-server
```

## Manual Deployment

```bash
gcloud run deploy cloud-abstraction-layer-mcp-server \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300
```

## Prerequisites

1. Install dependencies: `npm install`
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project YOUR_PROJECT_ID`
4. Enable APIs:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

## Test the Deployment

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe cloud-abstraction-layer-mcp-server \
  --region us-central1 \
  --format 'value(status.url)')

# Health check
curl $SERVICE_URL/health

# List tools
curl $SERVICE_URL/tools
```

For detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md).

