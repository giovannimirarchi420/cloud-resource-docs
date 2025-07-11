---
sidebar_position: 3
---

# API Key Management

This guide shows how to implement a webhook for managing temporary API keys and access tokens using the webhook archetype.

## Overview

API key management webhooks are perfect for providing temporary, scoped access to APIs and services during reservations. This pattern is commonly used for:

- Temporary access to cloud services
- Development/testing API credentials
- Time-limited service integrations
- Educational API access for students
- Partner/vendor temporary access

## Implementation

### Configuration

Add API management configuration to your `app/config.py`:

```python
class AppConfig:
    def __init__(self):
        # ...existing configuration...
        
        # API Management configuration
        self.api_management_endpoint = os.environ.get("API_MANAGEMENT_ENDPOINT")
        self.api_management_token = os.environ.get("API_MANAGEMENT_TOKEN")
        self.api_management_timeout = int(os.environ.get("API_MANAGEMENT_TIMEOUT", "30"))
        
        # Default API settings
        self.default_api_quota = int(os.environ.get("DEFAULT_API_QUOTA", "1000"))
        self.default_rate_limit = os.environ.get("DEFAULT_RATE_LIMIT", "100/hour")
        self.api_key_prefix = os.environ.get("API_KEY_PREFIX", "temp")
        
        # Supported API scopes
        self.available_scopes = os.environ.get("AVAILABLE_SCOPES", "read,write,admin").split(",")
```

### Environment Variables

Add these variables to your `.env` file:

```bash
# API Management Configuration
API_MANAGEMENT_ENDPOINT=https://api-manager.your-company.com
API_MANAGEMENT_TOKEN=your-management-api-token
API_MANAGEMENT_TIMEOUT=30

# Default API Settings
DEFAULT_API_QUOTA=1000
DEFAULT_RATE_LIMIT=100/hour
API_KEY_PREFIX=temp
AVAILABLE_SCOPES=read,write,admin

# For AWS API Gateway
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
API_GATEWAY_ID=your-api-gateway-id

# For Azure API Management
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=your-resource-group
AZURE_API_MANAGEMENT_NAME=your-apim-instance

# For Google Cloud API Gateway
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_API_CONFIG_ID=your-api-config-id
```

### Resource Manager Implementation

Update `app/services/resource.py`:

```python
import requests
import secrets
import string
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

class ResourceManager:
    def __init__(self):
        self.logger = logger
        self.api_endpoint = config.api_management_endpoint
        self.api_token = config.api_management_token
        self.timeout = config.api_management_timeout
    
    def configure_resource_for_user(
        self,
        resource_name: str,
        user_id: str,
        username: str,
        custom_parameters: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Generate and configure API key for the user."""
        try:
            self.logger.info(f"Creating API key for user {username} on resource {resource_name}")
            
            # Parse custom parameters
            if custom_parameters:
                scopes = custom_parameters.get("scopes", ["read"])
                quota = custom_parameters.get("quota", config.default_api_quota)
                rate_limit = custom_parameters.get("rate_limit", config.default_rate_limit)
                expiration_hours = custom_parameters.get("expiration_hours", 24)
                api_endpoints = custom_parameters.get("endpoints", [])
            else:
                scopes = ["read"]
                quota = config.default_api_quota
                rate_limit = config.default_rate_limit
                expiration_hours = 24
                api_endpoints = []
            
            # Validate scopes
            valid_scopes = [scope for scope in scopes if scope in config.available_scopes]
            if not valid_scopes:
                valid_scopes = ["read"]  # Default fallback
            
            # Generate API key
            api_key = self._generate_api_key(username, resource_name)
            
            # Calculate expiration time
            expiration_time = datetime.utcnow() + timedelta(hours=expiration_hours)
            
            # Create API key in management system
            key_created = self._create_api_key(
                api_key=api_key,
                user_id=user_id,
                username=username,
                resource_name=resource_name,
                scopes=valid_scopes,
                quota=quota,
                rate_limit=rate_limit,
                expiration=expiration_time,
                endpoints=api_endpoints
            )
            
            if not key_created:
                return False
            
            # Configure API access policies
            policies_configured = self._configure_api_policies(
                api_key=api_key,
                scopes=valid_scopes,
                quota=quota,
                rate_limit=rate_limit,
                endpoints=api_endpoints
            )
            
            if not policies_configured:
                # Cleanup if policy configuration failed
                self._cleanup_api_key(api_key)
                return False
            
            # Send API key to user
            self._notify_user_api_credentials(
                user_id=user_id,
                username=username,
                api_key=api_key,
                scopes=valid_scopes,
                quota=quota,
                rate_limit=rate_limit,
                expiration=expiration_time,
                endpoints=api_endpoints
            )
            
            self.logger.info(f"Successfully created API key for user {username}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create API key for user {username}: {e}")
            return False
    
    def release_resource_from_user(
        self,
        resource_name: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None
    ) -> bool:
        """Revoke and cleanup the user's API key."""
        try:
            if not username:
                self.logger.warning(f"No username provided for API key cleanup: {resource_name}")
                return True
                
            self.logger.info(f"Revoking API key for user {username} on resource {resource_name}")
            
            # Generate the same API key that was created
            api_key = self._generate_api_key(username, resource_name)
            
            # Revoke API key
            revoked = self._revoke_api_key(api_key, username, resource_name)
            
            if revoked:
                self.logger.info(f"Successfully revoked API key for user {username}")
            else:
                self.logger.warning(f"API key for user {username} may not have existed")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to revoke API key for user {username}: {e}")
            return False
    
    def _generate_api_key(self, username: str, resource_name: str) -> str:
        """Generate a deterministic but secure API key."""
        # Create deterministic seed from username and resource
        seed = f"{username}:{resource_name}:{config.api_key_prefix}"
        
        # Generate hash-based key
        hash_object = hashlib.sha256(seed.encode())
        hash_hex = hash_object.hexdigest()
        
        # Add random component for security
        random_part = secrets.token_hex(8)
        
        # Combine prefix, hash part, and random part
        api_key = f"{config.api_key_prefix}_{hash_hex[:16]}_{random_part}"
        
        return api_key
    
    def _create_api_key(
        self,
        api_key: str,
        user_id: str,
        username: str,
        resource_name: str,
        scopes: List[str],
        quota: int,
        rate_limit: str,
        expiration: datetime,
        endpoints: List[str]
    ) -> bool:
        """Create API key in the management system."""
        try:
            # Prepare API key creation payload
            payload = {
                "api_key": api_key,
                "name": f"{resource_name}-{username}",
                "description": f"Temporary API key for {username} on {resource_name}",
                "user_id": user_id,
                "username": username,
                "resource_name": resource_name,
                "scopes": scopes,
                "quota": quota,
                "rate_limit": rate_limit,
                "expires_at": expiration.isoformat(),
                "allowed_endpoints": endpoints,
                "metadata": {
                    "created_by": "webhook",
                    "resource_type": "temporary_access",
                    "reservation_id": resource_name
                }
            }
            
            # Send request to API management system
            response = requests.post(
                f"{self.api_endpoint}/api/keys",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json"
                },
                timeout=self.timeout
            )
            
            if response.status_code in [200, 201]:
                self.logger.info(f"API key created successfully in management system")
                return True
            else:
                self.logger.error(f"Failed to create API key: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Request error creating API key: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error creating API key: {e}")
            return False
    
    def _configure_api_policies(
        self,
        api_key: str,
        scopes: List[str],
        quota: int,
        rate_limit: str,
        endpoints: List[str]
    ) -> bool:
        """Configure API access policies for the key."""
        try:
            # Configure rate limiting
            rate_policy = {
                "api_key": api_key,
                "policy_type": "rate_limit",
                "configuration": {
                    "limit": rate_limit,
                    "scope": "api_key"
                }
            }
            
            response = requests.post(
                f"{self.api_endpoint}/api/policies",
                json=rate_policy,
                headers={
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json"
                },
                timeout=self.timeout
            )
            
            if response.status_code not in [200, 201]:
                self.logger.error(f"Failed to create rate limit policy: {response.text}")
                return False
            
            # Configure quota policy
            quota_policy = {
                "api_key": api_key,
                "policy_type": "quota",
                "configuration": {
                    "limit": quota,
                    "period": "month",
                    "scope": "api_key"
                }
            }
            
            response = requests.post(
                f"{self.api_endpoint}/api/policies",
                json=quota_policy,
                headers={
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json"
                },
                timeout=self.timeout
            )
            
            if response.status_code not in [200, 201]:
                self.logger.error(f"Failed to create quota policy: {response.text}")
                return False
            
            # Configure scope-based access policies
            for scope in scopes:
                scope_policy = {
                    "api_key": api_key,
                    "policy_type": "scope_access",
                    "configuration": {
                        "scope": scope,
                        "allowed_methods": self._get_methods_for_scope(scope),
                        "allowed_endpoints": endpoints if endpoints else None
                    }
                }
                
                response = requests.post(
                    f"{self.api_endpoint}/api/policies",
                    json=scope_policy,
                    headers={
                        "Authorization": f"Bearer {self.api_token}",
                        "Content-Type": "application/json"
                    },
                    timeout=self.timeout
                )
                
                if response.status_code not in [200, 201]:
                    self.logger.error(f"Failed to create scope policy for {scope}: {response.text}")
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to configure API policies: {e}")
            return False
    
    def _get_methods_for_scope(self, scope: str) -> List[str]:
        """Get allowed HTTP methods for a scope."""
        scope_methods = {
            "read": ["GET"],
            "write": ["GET", "POST", "PUT", "PATCH"],
            "admin": ["GET", "POST", "PUT", "PATCH", "DELETE"],
            "delete": ["DELETE"]
        }
        return scope_methods.get(scope, ["GET"])
    
    def _revoke_api_key(self, api_key: str, username: str, resource_name: str) -> bool:
        """Revoke API key from the management system."""
        try:
            # Find and revoke the API key
            response = requests.delete(
                f"{self.api_endpoint}/api/keys/{api_key}",
                headers={
                    "Authorization": f"Bearer {self.api_token}"
                },
                timeout=self.timeout
            )
            
            if response.status_code in [200, 204, 404]:  # 404 is OK - key doesn't exist
                self.logger.info(f"API key revoked successfully")
                return True
            else:
                self.logger.error(f"Failed to revoke API key: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Request error revoking API key: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error revoking API key: {e}")
            return False
    
    def _cleanup_api_key(self, api_key: str):
        """Cleanup API key if creation partially failed."""
        try:
            self._revoke_api_key(api_key, "cleanup", "cleanup")
        except Exception as e:
            self.logger.error(f"Failed to cleanup API key {api_key}: {e}")
    
    def _notify_user_api_credentials(
        self,
        user_id: str,
        username: str,
        api_key: str,
        scopes: List[str],
        quota: int,
        rate_limit: str,
        expiration: datetime,
        endpoints: List[str]
    ):
        """Send API credentials and usage information to user."""
        try:
            from ..services.notification import send_resource_notification
            
            # Prepare API usage information
            api_info = {
                "api_key": api_key,
                "scopes": scopes,
                "quota": quota,
                "rate_limit": rate_limit,
                "expires_at": expiration.isoformat(),
                "allowed_endpoints": endpoints,
                "usage_examples": {
                    "curl": f"curl -H 'X-API-Key: {api_key}' {self.api_endpoint}/api/data",
                    "python": f"headers = {{'X-API-Key': '{api_key}'}}\\nresponse = requests.get('{self.api_endpoint}/api/data', headers=headers)",
                    "javascript": f"fetch('{self.api_endpoint}/api/data', {{\\n  headers: {{'X-API-Key': '{api_key}'}}\\n}})"
                },
                "documentation": f"{self.api_endpoint}/docs",
                "monitoring": f"{self.api_endpoint}/api/keys/{api_key}/usage"
            }
            
            # Send notification with API credentials
            send_resource_notification(
                webhook_id=1,
                user_id=user_id,
                resource_name=f"API-{username}",
                success=True,
                action="provision",
                metadata={"api_credentials": api_info}
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send API credentials to user {user_id}: {e}")
    
    def get_api_key_usage(self, api_key: str) -> Dict[str, Any]:
        """Get current API key usage statistics."""
        try:
            response = requests.get(
                f"{self.api_endpoint}/api/keys/{api_key}/usage",
                headers={
                    "Authorization": f"Bearer {self.api_token}"
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self.logger.error(f"Failed to get API usage: {response.status_code}")
                return {}
                
        except Exception as e:
            self.logger.error(f"Error getting API usage: {e}")
            return {}
```

## Cloud Provider Integrations

### AWS API Gateway Integration

For AWS API Gateway:

```python
import boto3
from botocore.exceptions import ClientError

class AWSAPIGatewayManager:
    def __init__(self):
        self.apigateway = boto3.client('apigateway')
        self.api_id = config.api_gateway_id
    
    def create_api_key(self, key_name: str, description: str) -> str:
        """Create AWS API Gateway API key."""
        try:
            response = self.apigateway.create_api_key(
                name=key_name,
                description=description,
                enabled=True
            )
            return response['id']
        except ClientError as e:
            self.logger.error(f"Failed to create AWS API key: {e}")
            return None
    
    def create_usage_plan_key(self, usage_plan_id: str, api_key_id: str):
        """Attach API key to usage plan."""
        try:
            self.apigateway.create_usage_plan_key(
                usagePlanId=usage_plan_id,
                keyId=api_key_id,
                keyType='API_KEY'
            )
        except ClientError as e:
            self.logger.error(f"Failed to attach API key to usage plan: {e}")
    
    def delete_api_key(self, api_key_id: str):
        """Delete AWS API Gateway API key."""
        try:
            self.apigateway.delete_api_key(apiKey=api_key_id)
        except ClientError as e:
            self.logger.error(f"Failed to delete AWS API key: {e}")
```

### Azure API Management Integration

For Azure API Management:

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.apimanagement import ApiManagementClient

class AzureAPIManagementManager:
    def __init__(self):
        credential = DefaultAzureCredential()
        self.client = ApiManagementClient(
            credential,
            config.azure_subscription_id
        )
        self.resource_group = config.azure_resource_group
        self.service_name = config.azure_api_management_name
    
    def create_subscription(self, subscription_id: str, user_id: str, product_id: str):
        """Create Azure APIM subscription."""
        try:
            self.client.subscription.create_or_update(
                resource_group_name=self.resource_group,
                service_name=self.service_name,
                sid=subscription_id,
                parameters={
                    'owner_id': f'/users/{user_id}',
                    'scope': f'/products/{product_id}',
                    'display_name': f'Temp subscription for {user_id}',
                    'state': 'active'
                }
            )
        except Exception as e:
            self.logger.error(f"Failed to create Azure subscription: {e}")
    
    def delete_subscription(self, subscription_id: str):
        """Delete Azure APIM subscription."""
        try:
            self.client.subscription.delete(
                resource_group_name=self.resource_group,
                service_name=self.service_name,
                sid=subscription_id,
                if_match='*'
            )
        except Exception as e:
            self.logger.error(f"Failed to delete Azure subscription: {e}")
```

## Advanced Features

### API Key Rotation

Implement automatic key rotation:

```python
def rotate_api_key(self, old_api_key: str, username: str, resource_name: str) -> str:
    """Rotate an existing API key."""
    try:
        # Generate new API key
        new_api_key = self._generate_api_key(username, f"{resource_name}-rotated")
        
        # Get current key configuration
        current_config = self._get_api_key_config(old_api_key)
        
        # Create new key with same configuration
        if self._create_api_key(new_api_key, **current_config):
            # Revoke old key
            self._revoke_api_key(old_api_key, username, resource_name)
            return new_api_key
        
        return None
        
    except Exception as e:
        self.logger.error(f"Failed to rotate API key: {e}")
        return None
```

### Usage Monitoring

Monitor API key usage:

```python
def monitor_api_usage(self, api_key: str) -> Dict[str, Any]:
    """Monitor API key usage and alert on thresholds."""
    try:
        usage = self.get_api_key_usage(api_key)
        
        quota_used = usage.get('quota_used', 0)
        quota_limit = usage.get('quota_limit', 0)
        rate_limit_hits = usage.get('rate_limit_hits', 0)
        
        # Check thresholds
        alerts = []
        if quota_limit > 0 and (quota_used / quota_limit) > 0.8:
            alerts.append("Quota usage above 80%")
        
        if rate_limit_hits > 10:
            alerts.append("Multiple rate limit hits detected")
        
        return {
            "usage": usage,
            "alerts": alerts,
            "healthy": len(alerts) == 0
        }
        
    except Exception as e:
        self.logger.error(f"Failed to monitor API usage: {e}")
        return {"healthy": False, "error": str(e)}
```

### Scoped Access Control

Implement fine-grained access control:

```python
def create_scoped_access(self, api_key: str, resource_paths: List[str], methods: List[str]):
    """Create fine-grained access control for API key."""
    try:
        for path in resource_paths:
            policy = {
                "api_key": api_key,
                "policy_type": "path_access",
                "configuration": {
                    "path_pattern": path,
                    "allowed_methods": methods,
                    "deny_by_default": True
                }
            }
            
            response = requests.post(
                f"{self.api_endpoint}/api/policies",
                json=policy,
                headers={"Authorization": f"Bearer {self.api_token}"},
                timeout=self.timeout
            )
            
            if response.status_code not in [200, 201]:
                self.logger.error(f"Failed to create path policy: {response.text}")
                return False
        
        return True
        
    except Exception as e:
        self.logger.error(f"Failed to create scoped access: {e}")
        return False
```

## Testing

### Unit Tests

```python
import pytest
from unittest.mock import Mock, patch
from app.services.resource import ResourceManager

class TestAPIKeyResourceManager:
    def setup_method(self):
        self.manager = ResourceManager()
    
    @patch('requests.post')
    def test_api_key_creation(self, mock_post):
        # Mock successful API key creation
        mock_response = Mock()
        mock_response.status_code = 201
        mock_post.return_value = mock_response
        
        # Test API key creation
        result = self.manager.configure_resource_for_user(
            resource_name="test-api",
            user_id="user123",
            username="testuser",
            custom_parameters={"scopes": ["read", "write"]}
        )
        
        assert result is True
        mock_post.assert_called()
    
    def test_api_key_generation(self):
        # Test API key generation is deterministic
        key1 = self.manager._generate_api_key("testuser", "resource1")
        key2 = self.manager._generate_api_key("testuser", "resource1")
        
        # Keys should be different due to random component
        assert key1 != key2
        
        # But should have same prefix and username/resource hash part
        assert key1.split('_')[1] == key2.split('_')[1]
```

### Integration Tests

```python
def test_api_key_lifecycle():
    """Test complete API key creation and revocation."""
    manager = ResourceManager()
    
    # Create API key
    success = manager.configure_resource_for_user(
        resource_name="integration-test",
        user_id="test-user",
        username="testuser",
        custom_parameters={"scopes": ["read"]}
    )
    assert success
    
    # Test API key works
    api_key = manager._generate_api_key("testuser", "integration-test")
    # ... test API calls with the key ...
    
    # Revoke API key
    cleanup_success = manager.release_resource_from_user(
        resource_name="integration-test",
        username="testuser"
    )
    assert cleanup_success
    
    # Verify API key no longer works
    # ... test API calls fail ...
```

## Security Considerations

1. **Key Generation**: Use cryptographically secure random generation
2. **Scope Limitation**: Implement least-privilege access principles
3. **Expiration**: Always set reasonable expiration times
4. **Monitoring**: Log all API key operations and usage
5. **Revocation**: Implement immediate revocation capabilities
6. **Storage**: Never log or store API keys in plain text

## Troubleshooting

### Common Issues

**API key creation fails**:
- Check API management system connectivity
- Verify authentication tokens
- Review scope and quota limits

**Policy configuration errors**:
- Validate scope names and permissions
- Check endpoint patterns and methods
- Verify policy syntax

**Key revocation issues**:
- Ensure proper cleanup order
- Handle non-existent keys gracefully
- Check for dependent policies

This implementation provides a robust foundation for API key management webhooks that can be adapted to various API management platforms and use cases.
