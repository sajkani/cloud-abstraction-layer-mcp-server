# Cloud Run Deployment Guide

This guide explains how to deploy the Cloud Abstraction Layer MCP Server to Google Cloud Run.

## Prerequisites

1. **Google Cloud SDK** installed and configured
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable required APIs**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

3. **Authentication for Cloud Run**
   - The service will use the service account attached to Cloud Run
   - For GCP operations: Ensure the Cloud Run service account has necessary IAM permissions
   - For Azure operations: Configure Azure credentials via environment variables or service account

## Deployment Options

### Option 1: Using the Deployment Script (Recommended)

```bash
./deploy.sh [PROJECT_ID] [REGION] [SERVICE_NAME]
```

Example:
```bash
./deploy.sh my-gcp-project us-central1 cloud-abstraction-layer-mcp-server
```

### Option 2: Using gcloud CLI Directly

```bash
gcloud run deploy cloud-abstraction-layer-mcp-server \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10
```

### Option 3: Using Cloud Build

1. Build the container:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/cloud-abstraction-layer-mcp-server
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy cloud-abstraction-layer-mcp-server \
     --image gcr.io/YOUR_PROJECT_ID/cloud-abstraction-layer-mcp-server \
     --platform managed \
     --region us-central1
   ```

## Configuration

### Environment Variables

You can set environment variables during deployment:

```bash
gcloud run deploy cloud-abstraction-layer-mcp-server \
  --set-env-vars="GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json" \
  --set-env-vars="AZURE_CLIENT_ID=your-client-id" \
  --set-env-vars="AZURE_CLIENT_SECRET=your-client-secret" \
  --set-env-vars="AZURE_TENANT_ID=your-tenant-id"
```

### Service Account

For GCP operations, ensure the Cloud Run service account has necessary permissions:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

## API Endpoints

Once deployed, the service exposes the following HTTP endpoints:

- `GET /health` - Health check endpoint
- `GET /tools` - List all available tools
- `POST /tools/:toolName` - Execute a specific tool
- `POST /mcp/call` - MCP-compatible endpoint

### Example Usage

```bash
# Health check
curl https://YOUR_SERVICE_URL/health

# List tools
curl https://YOUR_SERVICE_URL/tools

# Execute a tool
curl -X POST https://YOUR_SERVICE_URL/tools/gcp_list_buckets \
  -H "Content-Type: application/json" \
  -d '{"arguments": {"projectId": "my-project"}}'
```

## Authentication

### GCP Authentication

The service uses Google Cloud Application Default Credentials. In Cloud Run, this uses the service account attached to the Cloud Run service.

### Azure Authentication

Configure Azure credentials using one of these methods:

1. **Environment Variables** (set during deployment):
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TENANT_ID`

2. **DefaultAzureCredential** - Automatically tries multiple authentication methods

3. **Service Account Key** - Pass storage account keys as parameters to specific tools

## Monitoring

View logs:
```bash
gcloud run services logs read cloud-abstraction-layer-mcp-server --region us-central1
```

View metrics in Cloud Console:
- Go to Cloud Run → Select your service → Metrics tab

## Troubleshooting

### Container fails to start
- Check logs: `gcloud run services logs read SERVICE_NAME --region REGION`
- Verify Dockerfile builds correctly locally: `docker build -t test .`

### Authentication errors
- Verify service account has necessary IAM roles
- Check environment variables are set correctly
- For Azure, verify credentials are valid

### Timeout errors
- Increase timeout: `--timeout 600` (max 3600 seconds)
- Check if operations are completing within the timeout period

## Cost Optimization

- Set `--min-instances 0` to scale to zero when not in use
- Adjust `--max-instances` based on expected load
- Use `--cpu 1` and `--memory 512Mi` for lower costs if your workload allows

