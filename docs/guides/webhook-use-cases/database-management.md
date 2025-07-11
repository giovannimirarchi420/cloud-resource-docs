---
sidebar_position: 1
---

# Database/Schema Management

This guide shows how to implement a webhook for managing user-specific databases or schemas using the webhook archetype.

## Overview

Database/schema management webhooks are perfect for scenarios where you need to provide isolated database environments for each reservation. This pattern is commonly used for:

- Development/testing environments
- Educational databases for students
- Temporary data analysis workspaces
- Isolated application instances

## Implementation

### Configuration

First, add database-specific configuration to your `app/config.py`:

```python
class AppConfig:
    def __init__(self):
        # ...existing configuration...
        
        # Database configuration
        self.db_host = os.environ.get("DB_HOST", "localhost")
        self.db_port = int(os.environ.get("DB_PORT", "5432"))
        self.db_admin_user = os.environ.get("DB_ADMIN_USER", "postgres")
        self.db_admin_password = os.environ.get("DB_ADMIN_PASSWORD")
        self.db_name = os.environ.get("DB_NAME", "postgres")
        
        # Build connection string
        self.db_connection_string = (
            f"postgresql://{self.db_admin_user}:{self.db_admin_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )
```

### Environment Variables

Add these variables to your `.env` file:

```bash
# Database Configuration
DB_HOST=your-db-host.com
DB_PORT=5432
DB_ADMIN_USER=postgres
DB_ADMIN_PASSWORD=your-admin-password
DB_NAME=postgres
```

### Resource Manager Implementation

Update `app/services/resource.py`:

```python
import psycopg2
import secrets
import string
from typing import Optional, Dict, Any

class ResourceManager:
    def __init__(self):
        self.logger = logger
        self.db_connection_string = config.db_connection_string
    
    def configure_resource_for_user(
        self,
        resource_name: str,
        user_id: str,
        username: str,
        custom_parameters: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Create a dedicated database/schema for the user."""
        try:
            self.logger.info(f"Creating database for user {username} on resource {resource_name}")
            
            # Parse custom parameters
            db_type = custom_parameters.get("database_type", "postgresql") if custom_parameters else "postgresql"
            db_size_limit = custom_parameters.get("size_limit", "100MB") if custom_parameters else "100MB"
            
            # Generate unique database name
            db_name = f"user_{username}_{resource_name}".lower().replace("-", "_")
            
            # Generate secure password for user
            password = self._generate_password()
            
            # Connect to database server as admin
            conn = psycopg2.connect(self.db_connection_string)
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Create user if not exists
            cursor.execute(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '{username}') THEN
                        CREATE USER {username} WITH PASSWORD '{password}';
                    END IF;
                END
                $$;
            """)
            
            # Create database
            cursor.execute(f"CREATE DATABASE {db_name} OWNER {username}")
            
            # Set database size limit if specified
            if db_size_limit:
                cursor.execute(f"""
                    ALTER DATABASE {db_name} SET default_tablespace = '';
                    -- Add size monitoring/limits as per your DB system
                """)
            
            # Grant necessary permissions
            cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {username}")
            
            cursor.close()
            conn.close()
            
            self.logger.info(f"Successfully created database {db_name} for user {username}")
            
            # Store connection info for user notification
            self._notify_user_credentials(user_id, username, db_name, password)
            
            return True
            
        except psycopg2.Error as e:
            self.logger.error(f"Database error creating resource for {username}: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Failed to create database for user {username}: {e}")
            return False
    
    def release_resource_from_user(
        self,
        resource_name: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None
    ) -> bool:
        """Clean up and remove the user's database."""
        try:
            if not username:
                self.logger.warning(f"No username provided for resource cleanup: {resource_name}")
                return True
                
            self.logger.info(f"Cleaning up database for user {username} on resource {resource_name}")
            
            # Generate database name (same logic as creation)
            db_name = f"user_{username}_{resource_name}".lower().replace("-", "_")
            
            # Connect to database server as admin
            conn = psycopg2.connect(self.db_connection_string)
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Terminate active connections to the database
            cursor.execute(f"""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '{db_name}'
                AND pid <> pg_backend_pid()
            """)
            
            # Drop the database
            cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
            
            # Optionally remove the user (be careful if user has other resources)
            # cursor.execute(f"DROP USER IF EXISTS {username}")
            
            cursor.close()
            conn.close()
            
            self.logger.info(f"Successfully cleaned up database {db_name} for user {username}")
            return True
            
        except psycopg2.Error as e:
            self.logger.error(f"Database error during cleanup for {username}: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Failed to cleanup database for user {username}: {e}")
            return False
    
    def _generate_password(self, length: int = 16) -> str:
        """Generate a secure random password."""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def _notify_user_credentials(self, user_id: str, username: str, db_name: str, password: str):
        """Send database credentials to user via notification system."""
        try:
            from ..services.notification import send_resource_notification
            
            # Create connection details message
            connection_info = {
                "database_name": db_name,
                "username": username,
                "password": password,
                "host": config.db_host,
                "port": config.db_port,
                "connection_string": f"postgresql://{username}:{password}@{config.db_host}:{config.db_port}/{db_name}"
            }
            
            # Send notification with connection details
            send_resource_notification(
                webhook_id=1,  # This should come from the webhook payload
                user_id=user_id,
                resource_name=db_name,
                success=True,
                action="provision",
                metadata={"connection_info": connection_info}
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send credentials to user {user_id}: {e}")
```

## Configuration Examples

### PostgreSQL Setup

For PostgreSQL databases:

```bash
# Environment variables
DB_HOST=postgresql.example.com
DB_PORT=5432
DB_ADMIN_USER=postgres
DB_ADMIN_PASSWORD=your-admin-password
DB_NAME=postgres

# Required Python packages in requirements.txt
psycopg2-binary>=2.9.0
```

### MySQL Setup

For MySQL databases, modify the implementation:

```python
import mysql.connector

def configure_resource_for_user(self, resource_name, user_id, username, custom_parameters):
    try:
        # Connect to MySQL
        conn = mysql.connector.connect(
            host=config.db_host,
            port=config.db_port,
            user=config.db_admin_user,
            password=config.db_admin_password
        )
        cursor = conn.cursor()
        
        # Create database
        db_name = f"user_{username}_{resource_name}".lower()
        cursor.execute(f"CREATE DATABASE {db_name}")
        
        # Create user and grant permissions
        password = self._generate_password()
        cursor.execute(f"CREATE USER '{username}'@'%' IDENTIFIED BY '{password}'")
        cursor.execute(f"GRANT ALL PRIVILEGES ON {db_name}.* TO '{username}'@'%'")
        cursor.execute("FLUSH PRIVILEGES")
        
        return True
    except mysql.connector.Error as e:
        self.logger.error(f"MySQL error: {e}")
        return False
```

### MongoDB Setup

For MongoDB databases:

```python
from pymongo import MongoClient

def configure_resource_for_user(self, resource_name, user_id, username, custom_parameters):
    try:
        # Connect to MongoDB
        client = MongoClient(config.mongodb_connection_string)
        
        # Create database
        db_name = f"user_{username}_{resource_name}".lower()
        db = client[db_name]
        
        # Create a user for the database
        password = self._generate_password()
        db.command("createUser", username, pwd=password, roles=["readWrite"])
        
        # Create initial collection to ensure database exists
        db.create_collection("user_data")
        
        return True
    except Exception as e:
        self.logger.error(f"MongoDB error: {e}")
        return False
```

## Advanced Features

### Database Templates

You can create databases from templates:

```python
def configure_resource_for_user(self, resource_name, user_id, username, custom_parameters):
    # Create database from template
    template_db = custom_parameters.get("template", "default_template")
    
    cursor.execute(f"""
        CREATE DATABASE {db_name} 
        WITH TEMPLATE {template_db} 
        OWNER {username}
    """)
```

### Size Monitoring

Implement database size monitoring:

```python
def _check_database_size(self, db_name: str) -> int:
    """Check current database size in MB."""
    cursor.execute(f"""
        SELECT pg_size_pretty(pg_database_size('{db_name}')) as size,
               pg_database_size('{db_name}') as size_bytes
    """)
    result = cursor.fetchone()
    return result[1] if result else 0

def _enforce_size_limit(self, db_name: str, limit_mb: int):
    """Enforce database size limits."""
    current_size = self._check_database_size(db_name) / (1024 * 1024)  # Convert to MB
    if current_size > limit_mb:
        self.logger.warning(f"Database {db_name} exceeds size limit: {current_size}MB > {limit_mb}MB")
        # Implement your size enforcement policy here
```

## Testing

### Unit Tests

Create tests for your database operations:

```python
import pytest
from unittest.mock import Mock, patch
from app.services.resource import ResourceManager

class TestDatabaseResourceManager:
    def setup_method(self):
        self.manager = ResourceManager()
    
    @patch('psycopg2.connect')
    def test_configure_database_success(self, mock_connect):
        # Mock database connection
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Test database creation
        result = self.manager.configure_resource_for_user(
            resource_name="test-db",
            user_id="user123",
            username="testuser"
        )
        
        assert result is True
        mock_cursor.execute.assert_called()
    
    def test_database_name_generation(self):
        # Test database name generation logic
        db_name = f"user_testuser_test-db".lower().replace("-", "_")
        assert db_name == "user_testuser_test_db"
```

### Integration Tests

Test with a real database:

```python
def test_full_database_lifecycle():
    """Test complete database creation and cleanup."""
    manager = ResourceManager()
    
    # Create database
    success = manager.configure_resource_for_user(
        resource_name="integration-test",
        user_id="test-user",
        username="testuser"
    )
    assert success
    
    # Verify database exists
    # ... verification logic ...
    
    # Cleanup database
    cleanup_success = manager.release_resource_from_user(
        resource_name="integration-test",
        username="testuser"
    )
    assert cleanup_success
```

## Security Considerations

1. **Password Security**: Use strong, randomly generated passwords
2. **User Isolation**: Ensure users can only access their own databases
3. **Network Security**: Use SSL/TLS for database connections
4. **Access Control**: Implement proper role-based access control
5. **Audit Logging**: Log all database operations for security auditing

## Troubleshooting

### Common Issues

**Database creation fails**:
- Check admin user permissions
- Verify database server connectivity
- Ensure database name is valid

**User authentication issues**:
- Verify password generation
- Check user creation syntax
- Ensure proper permission grants

**Cleanup failures**:
- Check for active connections
- Verify admin permissions for DROP operations
- Handle missing databases gracefully

This implementation provides a robust foundation for database/schema management webhooks that can be adapted to various database systems and use cases.
