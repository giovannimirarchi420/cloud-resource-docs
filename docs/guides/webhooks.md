# Webhook Development Guide

A comprehensive guide for creating custom webhooks to handle resource reservation events from the Cloud Resource Reservation System using the webhook-archetype template.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Understanding the Architecture](#understanding-the-architecture)
4. [Customization Workflow](#customization-workflow)
5. [Configuration Management](#configuration-management)
6. [Testing Your Webhook](#testing-your-webhook)
7. [Deployment](#deployment)
8. [Common Use Cases](#common-use-cases)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

The webhook-archetype is a production-ready template for creating custom webhooks that integrate with the [Cloud Resource Reservation System](https://github.com/giovannimirarchi420/cloud-resource-reservation). It provides a standardized foundation for handling resource lifecycle events while allowing complete customization for your specific resource type.

### What This Guide Covers

- How to bootstrap a new webhook from the archetype
- Implementing resource-specific logic
- Configuration and security best practices
- Testing and deployment strategies
- Real-world examples and use cases

### Prerequisites

- Python 3.8+
- Basic understanding of REST APIs and webhooks
- Access to your target resource management system
- Docker (for containerized deployment)
- Kubernetes cluster (for production deployment)

## Getting Started

### 1. Clone the Archetype

Start by creating your webhook project from the archetype:

```bash
# Clone the archetype repository
git clone https://github.com/giovannimirarchi420/webhook-archetype.git my-resource-webhook
cd my-resource-webhook

# Remove the original git history and initialize new repository
rm -rf .git
git init
git add .
git commit -m "Initial commit from webhook-archetype"
```

### 2. Install Dependencies

Set up your development environment:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

### 3. Basic Configuration

Edit the `.env` file with your basic configuration:

```bash
# Basic webhook configuration
WEBHOOK_SECRET=your-webhook-secret-here
PORT=8080
LOG_LEVEL=INFO

# Integration endpoints (provided by the central system)
NOTIFICATION_ENDPOINT=https://your-booking-system.com/api/notifications
WEBHOOK_LOG_ENDPOINT=https://your-booking-system.com/api/webhook-logs

# Add your resource-specific configuration here
# RESOURCE_API_ENDPOINT=https://api.your-resource.com
# RESOURCE_API_KEY=your-api-key
```

### 4. Quick Test

Verify the webhook is working:

```bash
# Start the webhook server
python -m app.main

# In another terminal, test the health endpoint
curl http://localhost:8080/healthz
```

You should see: `{"status": "healthy", "service": "my-resource-webhook"}`

## Understanding the Architecture

The webhook-archetype follows a modular, production-ready architecture:

```
app/
├── __init__.py          # Package initialization
├── main.py             # FastAPI application entry point
├── config.py           # Configuration management
├── models.py           # Pydantic models for payload validation
├── api.py              # REST API endpoints
├── utils.py            # Utility functions
└── services/           # Business logic modules
    ├── __init__.py
    ├── security.py     # Webhook signature verification
    ├── notification.py # Integration with central system
    └── resource.py     # Your resource-specific logic
```

### Key Components

#### 1. API Layer (`app/api.py`)
- Handles incoming webhook requests
- Validates payloads using Pydantic models
- Routes events to appropriate handlers
- Returns standardized responses

#### 2. Models (`app/models.py`)
- Defines data structures for webhook payloads
- Handles JSON field mapping (camelCase ↔ snake_case)
- Validates required fields and data types

#### 3. Services
- **Security**: HMAC signature verification for webhook security
- **Notification**: Integration with the central booking system
- **Resource**: Your custom resource management logic

#### 4. Configuration (`app/config.py`)
- Centralized environment variable management
- Logging configuration
- Type-safe configuration with validation

## Customization Workflow

### Step 1: Define Your Resource Type

Edit `app/api.py` and update the resource type:

```python
# Change this line to match your resource
RESOURCE_TYPE = "My Resource"  # Examples: "Database", "VM", "API Key", "Switch Port"
```

This determines which reservation events your webhook will process.

### Step 2: Implement Resource Logic

Edit `app/services/resource.py` and implement the two main methods:

```python
def configure_resource_for_user(
    self,
    resource_name: str,
    user_id: str,
    username: str,
    custom_parameters: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Called when a reservation starts (EVENT_START).
    Configure the resource for the user.
    """
    # Your implementation here
    pass

def release_resource_from_user(
    self,
    resource_name: str,
    user_id: Optional[str] = None,
    username: Optional[str] = None
) -> bool:
    """
    Called when a reservation ends (EVENT_END/EVENT_DELETED).
    Clean up and release the resource.
    """
    # Your implementation here
    pass
```

### Step 3: Add Configuration

Update `app/config.py` to add your resource-specific settings:

```python
class AppConfig:
    def __init__(self):
        # ...existing configuration...
        
        # Add your resource-specific configuration
        self.resource_api_endpoint = os.environ.get("RESOURCE_API_ENDPOINT")
        self.resource_api_key = os.environ.get("RESOURCE_API_KEY")
        self.resource_timeout = int(os.environ.get("RESOURCE_TIMEOUT", "30"))
```

### Step 4: Update Environment Variables

Add your configuration to `.env.example`:

```bash
# Your Resource Configuration
RESOURCE_API_ENDPOINT=https://api.your-resource.com
RESOURCE_API_KEY=your-api-key-here
RESOURCE_TIMEOUT=30
```

## Configuration Management

### Environment Variables

The webhook supports these standard configuration options:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `WEBHOOK_SECRET` | HMAC secret for signature verification | Yes* | - |
| `PORT` | HTTP server port | No | 8080 |
| `LOG_LEVEL` | Logging level (DEBUG/INFO/WARNING/ERROR) | No | INFO |
| `NOTIFICATION_ENDPOINT` | Central system notification URL | Yes* | - |
| `WEBHOOK_LOG_ENDPOINT` | Central system webhook log URL | Yes* | - |
| `NOTIFICATION_TIMEOUT` | Notification request timeout (seconds) | No | 30 |
| `WEBHOOK_LOG_TIMEOUT` | Webhook log request timeout (seconds) | No | 30 |

*Required for production use

### Security Configuration

For production deployment, ensure you have:

1. **Webhook Secret**: Shared secret for HMAC verification
2. **HTTPS**: Always use HTTPS endpoints
3. **Network Security**: Restrict access to webhook endpoints
4. **Secret Management**: Use Kubernetes secrets or environment-specific secret management

## Testing Your Webhook

### Unit Tests

Run the included test suite:

```bash
# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=app --cov-report=html
```

### Integration Testing

Test your webhook with sample payloads:

```bash
# Test EVENT_START
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "EVENT_START",
    "eventId": "test-event-123",
    "webhookId": 1,
    "userId": "user-456",
    "username": "testuser",
    "resourceType": "My Resource",
    "resourceName": "test-resource-1",
    "resourceId": 123,
    "eventStart": "2025-01-01T12:00:00Z",
    "eventEnd": "2025-01-01T13:00:00Z",
    "customParameters": "{\"param1\": \"value1\"}"
  }'

# Test EVENT_END
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "EVENT_END",
    "eventId": "test-event-123",
    "webhookId": 1,
    "userId": "user-456",
    "username": "testuser",
    "resourceType": "My Resource",
    "resourceName": "test-resource-1",
    "resourceId": 123,
    "eventStart": "2025-01-01T12:00:00Z",
    "eventEnd": "2025-01-01T13:00:00Z"
  }'
```

### Testing with Signature Verification

To test with HMAC signatures:

```python
import hmac
import hashlib
import json

payload = {
    "eventType": "EVENT_START",
    "resourceType": "My Resource",
    # ... rest of payload
}

secret = "your-webhook-secret"
payload_json = json.dumps(payload)
signature = hmac.new(
    secret.encode(),
    payload_json.encode(),
    hashlib.sha256
).hexdigest()

# Add header: X-Webhook-Signature: <signature>
```

## Deployment

### Local Development

```bash
# Start with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

### Docker Deployment

```bash
# Build the image
docker build -t my-resource-webhook:latest .

# Run the container
docker run -d \
  --name my-resource-webhook \
  -p 8080:8080 \
  --env-file .env \
  my-resource-webhook:latest
```

### Kubernetes Deployment

1. **Update Kubernetes manifests**:

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-resource-webhook-config
data:
  NOTIFICATION_ENDPOINT: "https://your-booking-system.com/api/notifications"
  WEBHOOK_LOG_ENDPOINT: "https://your-booking-system.com/api/webhook-logs"
  RESOURCE_API_ENDPOINT: "https://api.your-resource.com"
  # Add other non-sensitive configuration
```

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-resource-webhook-secrets
type: Opaque
data:
  webhook-secret: <base64-encoded-secret>
  resource-api-key: <base64-encoded-api-key>
```

2. **Deploy to Kubernetes**:

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app=my-resource-webhook
kubectl logs -l app=my-resource-webhook
```

## Common Use Cases

The webhook archetype supports various types of resources. Each use case has its own dedicated guide with detailed implementation examples:

### 📊 [Database/Schema Management](webhook-use-cases/database-management)
Perfect for creating user-specific databases or schemas for development, testing, or educational purposes.

### 🐳 [VM/Container Management](webhook-use-cases/vm-container-management)
Ideal for provisioning virtual machines or containers with Docker or Kubernetes for on-demand compute resources.

### 🔑 [API Key Management](webhook-use-cases/api-key-management)
Great for providing temporary, scoped access to APIs and services with automatic expiration and cleanup.

### 🌐 [Network Switch Port Configuration](webhook-use-cases/network-switch-configuration)
Essential for configuring network switch ports with VLAN assignments for isolated network environments.

Each guide includes:
- Complete implementation examples
- Configuration templates
- Testing strategies
- Security considerations
- Troubleshooting tips

## Best Practices

### 1. Error Handling

Always implement comprehensive error handling:

```python
def configure_resource_for_user(self, resource_name, user_id, username, custom_parameters):
    try:
        # Resource configuration logic
        result = self.configure_resource(resource_name, custom_parameters)
        
        if not result:
            raise ResourceConfigurationError("Configuration failed")
            
        logger.info(f"Successfully configured {resource_name} for {username}")
        return True
        
    except ResourceConfigurationError as e:
        logger.error(f"Configuration error for {resource_name}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error configuring {resource_name}: {e}")
        return False
```

### 2. Logging

Use structured logging for better observability:

```python
def configure_resource_for_user(self, resource_name, user_id, username, custom_parameters):
    logger.info(
        "Starting resource configuration",
        extra={
            "resource_name": resource_name,
            "user_id": user_id,
            "username": username,
            "action": "configure"
        }
    )
    
    # Configuration logic here
    
    logger.info(
        "Resource configuration completed",
        extra={
            "resource_name": resource_name,
            "user_id": user_id,
            "success": True
        }
    )
```

### 3. Idempotency

Make your operations idempotent when possible:

```python
def configure_resource_for_user(self, resource_name, user_id, username, custom_parameters):
    # Check if resource is already configured
    if self.is_resource_configured(resource_name, user_id):
        logger.info(f"Resource {resource_name} already configured for {username}")
        return True
    
    # Proceed with configuration
    return self.perform_configuration(resource_name, user_id, custom_parameters)
```

### 4. Security

- Always verify webhook signatures in production
- Use secure communication (HTTPS/TLS) for all external API calls
- Sanitize and validate all input parameters
- Store sensitive configuration in secrets, not environment variables

### 5. Monitoring

Implement health checks and metrics:

```python
@router.get("/healthz")
def health_check():
    """Health check with dependency verification."""
    checks = {
        "service": "healthy",
        "database": check_database_connection(),
        "external_api": check_external_api(),
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if all(checks.values()):
        return checks
    else:
        raise HTTPException(status_code=503, detail=checks)
```

## Troubleshooting

### Common Issues

#### 1. Webhook Not Receiving Events

**Symptoms**: No webhook calls reaching your service

**Solutions**:
- Verify webhook URL is correct in the booking system
- Check network connectivity and firewall rules
- Ensure webhook service is running and accessible
- Verify webhook is registered for the correct resource type

#### 2. Signature Verification Failures

**Symptoms**: HTTP 401 errors with "Invalid webhook signature"

**Solutions**:
- Verify `WEBHOOK_SECRET` matches the one configured in booking system
- Check that raw request body is used for signature verification
- Ensure no middleware is modifying the request body

#### 3. Resource Configuration Failures

**Symptoms**: HTTP 500 errors or failed resource operations

**Solutions**:
- Check resource service connectivity and credentials
- Verify custom parameters are correctly formatted
- Review logs for specific error messages
- Test resource operations manually

#### 4. Event Processing Issues

**Symptoms**: Events processed but no resource changes

**Solutions**:
- Verify `RESOURCE_TYPE` matches exactly with booking system
- Check event type handling (EVENT_START, EVENT_END, EVENT_DELETED)
- Review payload structure and field mapping

### Debugging Tips

1. **Enable Debug Logging**:
   ```bash
   LOG_LEVEL=DEBUG
   ```

2. **Test Individual Components**:
   ```python
   # Test resource manager directly
   from app.services.resource import get_resource_manager
   manager = get_resource_manager()
   result = manager.configure_resource_for_user("test", "user1", "testuser", {})
   ```

3. **Validate Payloads**:
   ```python
   # Test payload parsing
   from app.models import WebhookPayload
   payload = WebhookPayload(**your_test_data)
   ```

4. **Check External Dependencies**:
   ```bash
   # Test API connectivity
   curl -v https://api.your-resource.com/health
   
   # Test database connectivity
   psql -h your-db-host -U your-user -d your-db -c "SELECT 1"
   ```

### Getting Help

1. **Check the logs**: Most issues are revealed in the application logs
2. **Review examples**: Look at the `examples/` directory for reference implementations
3. **Validate configuration**: Ensure all required environment variables are set
4. **Test incrementally**: Start with simple test cases and gradually add complexity

## Conclusion

The webhook-archetype provides a robust foundation for creating production-ready webhooks that integrate with the Cloud Resource Reservation System. By following this guide, you can:

- Quickly bootstrap a new webhook for any resource type
- Implement secure, reliable resource management
- Deploy with confidence using proven patterns
- Scale and maintain your webhook over time

The modular architecture and comprehensive examples make it easy to adapt the archetype to your specific use case while maintaining consistency with other webhooks in your ecosystem.

For more examples and advanced use cases, refer to the `examples/` directory and the production webhook implementations in the ecosystem.
