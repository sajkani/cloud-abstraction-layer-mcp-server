# Cloud Abstraction Layer MCP Server

A Model Context Protocol (MCP) server that provides unified tools for both Google Cloud Platform (GCP) and Microsoft Azure, enabling AI assistants to interact with cloud resources across both platforms.

## Features

### Google Cloud Platform (GCP) Tools

#### gcloud Command Execution
* Execute gcloud commands safely with security restrictions
* Support for project-specific commands
* Built-in timeout and buffer limits

#### Google Cloud Storage (GCS) Tools
* List buckets and objects
* Read object content and metadata
* Support for filtering and pagination

### Microsoft Azure Tools

#### Azure CLI Command Execution
* Execute az commands safely with security restrictions
* Support for subscription-specific commands
* Built-in timeout and buffer limits

#### Azure Storage Tools
* List storage accounts
* List containers and blobs
* Read blob content and metadata
* Support for filtering and pagination

## Installation

```bash
npm install
npm run build
```

## Usage

### As an MCP Server

The server runs on stdio and can be configured in MCP clients:

```json
{
  "servers": {
    "cloud-abstraction-layer": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

### Available Tools

#### GCP Tools

* `gcp_run_gcloud_command`: Execute gcloud commands (with security restrictions)
* `gcp_list_buckets`: List all GCS buckets in a project
* `gcp_list_objects`: List objects in a GCS bucket
* `gcp_read_object_content`: Read the content of a GCS object
* `gcp_get_object_metadata`: Get metadata for a GCS object

#### Azure Tools

* `azure_run_az_command`: Execute Azure CLI commands (with security restrictions)
* `azure_list_storage_accounts`: List all storage accounts in a subscription
* `azure_list_containers`: List containers in an Azure Storage account
* `azure_list_blobs`: List blobs in an Azure Storage container
* `azure_read_blob_content`: Read the content of an Azure Storage blob
* `azure_get_blob_metadata`: Get metadata for an Azure Storage blob

## Security

The server includes security restrictions:

* **GCP**: Prevents execution of authentication, configuration, and init commands
* **Azure**: Prevents execution of login, account, and config commands
* Limits command execution time (30 seconds default)
* Restricts buffer sizes (10MB default)

## Authentication

### Google Cloud Platform

The server uses Google Cloud Application Default Credentials. Ensure you have authenticated:

```bash
gcloud auth application-default login
```

Alternatively, set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to a service account key file.

### Microsoft Azure

The server uses Azure Default Credentials. Ensure you have authenticated:

```bash
az login
```

For storage operations, you can either:
- Use DefaultAzureCredential (recommended for development)
- Provide the storage account key as a parameter (for service accounts)

## Development

```bash
npm run dev    # Watch mode
npm run build  # Build TypeScript
npm run lint   # Lint code
npm start      # Run the server
```

## Project Structure

```
.
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── tools/
│   │   ├── gcp-tools.ts      # GCP tool implementations
│   │   └── azure-tools.ts    # Azure tool implementations
│   └── utils/
│       ├── security.ts       # Security validation utilities
│       └── command-executor.ts # Command execution utilities
├── dist/                     # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

## Examples

### List GCP Buckets

```json
{
  "name": "gcp_list_buckets",
  "arguments": {
    "projectId": "my-gcp-project"
  }
}
```

### Execute Azure CLI Command

```json
{
  "name": "azure_run_az_command",
  "arguments": {
    "command": "resource list --output table",
    "subscriptionId": "my-subscription-id"
  }
}
```

### Read Azure Blob Content

```json
{
  "name": "azure_read_blob_content",
  "arguments": {
    "accountName": "mystorageaccount",
    "containerName": "mycontainer",
    "blobName": "path/to/file.txt",
    "maxBytes": 1024
  }
}
```

## License

Apache-2.0

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

