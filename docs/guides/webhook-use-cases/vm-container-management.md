---
sidebar_position: 2
---

# VM/Container Management

This guide shows how to implement a webhook for provisioning and managing virtual machines or containers using the webhook archetype.

## Overview

VM/Container management webhooks are ideal for providing on-demand compute resources for reservations. This pattern is commonly used for:

- Development/testing environments
- Training and educational labs
- Temporary application deployments
- Isolated compute workloads
- CI/CD pipeline environments

## Implementation

### Configuration

Add container/VM-specific configuration to your `app/config.py`:

```python
class AppConfig:
    def __init__(self):
        # ...existing configuration...
        
        # Container/VM configuration
        self.container_runtime = os.environ.get("CONTAINER_RUNTIME", "docker")  # docker, podman, k8s
        self.docker_host = os.environ.get("DOCKER_HOST", "unix:///var/run/docker.sock")
        self.k8s_namespace = os.environ.get("K8S_NAMESPACE", "user-environments")
        self.default_image = os.environ.get("DEFAULT_IMAGE", "ubuntu:20.04")
        self.resource_limits = {
            "cpu": os.environ.get("DEFAULT_CPU_LIMIT", "1000m"),
            "memory": os.environ.get("DEFAULT_MEMORY_LIMIT", "512Mi"),
            "storage": os.environ.get("DEFAULT_STORAGE_LIMIT", "1Gi")
        }
```

### Environment Variables

Add these variables to your `.env` file:

```bash
# Container/VM Configuration
CONTAINER_RUNTIME=k8s
K8S_NAMESPACE=user-environments
DEFAULT_IMAGE=ubuntu:20.04
DEFAULT_CPU_LIMIT=1000m
DEFAULT_MEMORY_LIMIT=512Mi
DEFAULT_STORAGE_LIMIT=1Gi

# For Docker runtime
DOCKER_HOST=unix:///var/run/docker.sock

# For VM management (if using libvirt/OpenStack)
VM_HYPERVISOR_URL=qemu+ssh://user@hypervisor/system
OPENSTACK_AUTH_URL=https://your-openstack.com:5000/v3
OPENSTACK_USERNAME=your-username
OPENSTACK_PASSWORD=your-password
OPENSTACK_PROJECT_NAME=your-project
```

### Resource Manager Implementation

Update `app/services/resource.py` for container management:

```python
import docker
import yaml
from kubernetes import client, config as k8s_config
from typing import Optional, Dict, Any

class ResourceManager:
    def __init__(self):
        self.logger = logger
        self.runtime = config.container_runtime
        
        if self.runtime == "docker":
            self.docker_client = docker.from_env()
        elif self.runtime == "k8s":
            try:
                k8s_config.load_incluster_config()  # For in-cluster execution
            except:
                k8s_config.load_kube_config()  # For local development
            self.k8s_client = client.CoreV1Api()
            self.apps_client = client.AppsV1Api()
    
    def configure_resource_for_user(
        self,
        resource_name: str,
        user_id: str,
        username: str,
        custom_parameters: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Start a user-specific container/VM."""
        try:
            self.logger.info(f"Starting container for user {username} on resource {resource_name}")
            
            # Parse custom parameters
            if custom_parameters:
                image = custom_parameters.get("image", config.default_image)
                cpu_limit = custom_parameters.get("cpu_limit", config.resource_limits["cpu"])
                memory_limit = custom_parameters.get("memory_limit", config.resource_limits["memory"])
                storage_limit = custom_parameters.get("storage_limit", config.resource_limits["storage"])
                ports = custom_parameters.get("ports", [])
                env_vars = custom_parameters.get("environment", {})
            else:
                image = config.default_image
                cpu_limit = config.resource_limits["cpu"]
                memory_limit = config.resource_limits["memory"]
                storage_limit = config.resource_limits["storage"]
                ports = []
                env_vars = {}
            
            if self.runtime == "docker":
                return self._start_docker_container(
                    resource_name, user_id, username, image, 
                    cpu_limit, memory_limit, ports, env_vars
                )
            elif self.runtime == "k8s":
                return self._start_kubernetes_pod(
                    resource_name, user_id, username, image,
                    cpu_limit, memory_limit, storage_limit, ports, env_vars
                )
            else:
                self.logger.error(f"Unsupported container runtime: {self.runtime}")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to start container for user {username}: {e}")
            return False
    
    def release_resource_from_user(
        self,
        resource_name: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None
    ) -> bool:
        """Stop and remove the user's container/VM."""
        try:
            if not username:
                self.logger.warning(f"No username provided for resource cleanup: {resource_name}")
                return True
                
            self.logger.info(f"Stopping container for user {username} on resource {resource_name}")
            
            if self.runtime == "docker":
                return self._stop_docker_container(resource_name, username)
            elif self.runtime == "k8s":
                return self._stop_kubernetes_pod(resource_name, username)
            else:
                self.logger.error(f"Unsupported container runtime: {self.runtime}")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to stop container for user {username}: {e}")
            return False
    
    def _start_docker_container(
        self, resource_name: str, user_id: str, username: str,
        image: str, cpu_limit: str, memory_limit: str, 
        ports: list, env_vars: dict
    ) -> bool:
        """Start a Docker container."""
        try:
            container_name = f"user-{username}-{resource_name}"
            
            # Prepare port mappings
            port_bindings = {}
            exposed_ports = {}
            for port in ports:
                if isinstance(port, dict):
                    container_port = port.get("container_port")
                    host_port = port.get("host_port")
                    if container_port:
                        exposed_ports[f"{container_port}/tcp"] = {}
                        if host_port:
                            port_bindings[f"{container_port}/tcp"] = host_port
                
            # Prepare environment variables
            environment = {
                "USER": username,
                "USER_ID": user_id,
                "RESOURCE_NAME": resource_name,
                **env_vars
            }
            
            # Convert CPU limit (e.g., "1000m" to 1.0)
            cpu_limit_float = float(cpu_limit.replace("m", "")) / 1000 if "m" in cpu_limit else float(cpu_limit)
            
            # Convert memory limit (e.g., "512Mi" to bytes)
            memory_bytes = self._convert_memory_to_bytes(memory_limit)
            
            # Start container
            container = self.docker_client.containers.run(
                image=image,
                name=container_name,
                environment=environment,
                ports=exposed_ports,
                detach=True,
                remove=False,  # Don't auto-remove so we can inspect later
                cpu_period=100000,  # 100ms
                cpu_quota=int(cpu_limit_float * 100000),
                mem_limit=memory_bytes,
                port_bindings=port_bindings
            )
            
            self.logger.info(f"Started Docker container {container_name} (ID: {container.id})")
            
            # Get container info for user notification
            self._notify_user_container_info(user_id, username, container_name, container, ports)
            
            return True
            
        except docker.errors.ImageNotFound:
            self.logger.error(f"Docker image not found: {image}")
            return False
        except docker.errors.APIError as e:
            self.logger.error(f"Docker API error: {e}")
            return False
    
    def _stop_docker_container(self, resource_name: str, username: str) -> bool:
        """Stop and remove Docker container."""
        try:
            container_name = f"user-{username}-{resource_name}"
            
            try:
                container = self.docker_client.containers.get(container_name)
                container.stop(timeout=10)
                container.remove()
                self.logger.info(f"Stopped and removed Docker container {container_name}")
            except docker.errors.NotFound:
                self.logger.info(f"Docker container {container_name} not found (already removed)")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to stop Docker container: {e}")
            return False
    
    def _start_kubernetes_pod(
        self, resource_name: str, user_id: str, username: str,
        image: str, cpu_limit: str, memory_limit: str, storage_limit: str,
        ports: list, env_vars: dict
    ) -> bool:
        """Start a Kubernetes pod."""
        try:
            pod_name = f"user-{username}-{resource_name}".lower()
            namespace = config.k8s_namespace
            
            # Prepare environment variables
            env_list = [
                client.V1EnvVar(name="USER", value=username),
                client.V1EnvVar(name="USER_ID", value=user_id),
                client.V1EnvVar(name="RESOURCE_NAME", value=resource_name)
            ]
            for key, value in env_vars.items():
                env_list.append(client.V1EnvVar(name=key, value=str(value)))
            
            # Prepare port configuration
            container_ports = []
            for port in ports:
                if isinstance(port, dict):
                    container_port = port.get("container_port")
                    if container_port:
                        container_ports.append(
                            client.V1ContainerPort(container_port=int(container_port))
                        )
            
            # Resource requirements
            resources = client.V1ResourceRequirements(
                limits={"cpu": cpu_limit, "memory": memory_limit},
                requests={"cpu": cpu_limit, "memory": memory_limit}
            )
            
            # Container specification
            container = client.V1Container(
                name="user-container",
                image=image,
                env=env_list,
                ports=container_ports,
                resources=resources,
                image_pull_policy="IfNotPresent"
            )
            
            # Pod specification
            pod_spec = client.V1PodSpec(
                containers=[container],
                restart_policy="Never"
            )
            
            # Pod metadata with labels
            metadata = client.V1ObjectMeta(
                name=pod_name,
                namespace=namespace,
                labels={
                    "app": "user-environment",
                    "user": username,
                    "resource": resource_name,
                    "managed-by": "webhook"
                }
            )
            
            # Create pod
            pod = client.V1Pod(
                api_version="v1",
                kind="Pod",
                metadata=metadata,
                spec=pod_spec
            )
            
            self.k8s_client.create_namespaced_pod(namespace=namespace, body=pod)
            
            self.logger.info(f"Started Kubernetes pod {pod_name} in namespace {namespace}")
            
            # If ports are specified, create a service
            if ports:
                self._create_kubernetes_service(pod_name, namespace, username, resource_name, ports)
            
            # Notify user
            self._notify_user_kubernetes_info(user_id, username, pod_name, namespace, ports)
            
            return True
            
        except client.exceptions.ApiException as e:
            self.logger.error(f"Kubernetes API error: {e}")
            return False
    
    def _stop_kubernetes_pod(self, resource_name: str, username: str) -> bool:
        """Stop and remove Kubernetes pod."""
        try:
            pod_name = f"user-{username}-{resource_name}".lower()
            namespace = config.k8s_namespace
            
            try:
                # Delete pod
                self.k8s_client.delete_namespaced_pod(
                    name=pod_name,
                    namespace=namespace,
                    grace_period_seconds=30
                )
                self.logger.info(f"Deleted Kubernetes pod {pod_name}")
                
                # Delete associated service if it exists
                service_name = f"{pod_name}-service"
                try:
                    self.k8s_client.delete_namespaced_service(
                        name=service_name,
                        namespace=namespace
                    )
                    self.logger.info(f"Deleted Kubernetes service {service_name}")
                except client.exceptions.ApiException as e:
                    if e.status != 404:  # Ignore not found errors
                        self.logger.warning(f"Failed to delete service {service_name}: {e}")
                
            except client.exceptions.ApiException as e:
                if e.status == 404:
                    self.logger.info(f"Kubernetes pod {pod_name} not found (already deleted)")
                else:
                    raise
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to stop Kubernetes pod: {e}")
            return False
    
    def _create_kubernetes_service(
        self, pod_name: str, namespace: str, username: str, 
        resource_name: str, ports: list
    ):
        """Create a Kubernetes service for the pod."""
        try:
            service_name = f"{pod_name}-service"
            
            service_ports = []
            for port in ports:
                if isinstance(port, dict):
                    container_port = port.get("container_port")
                    service_port = port.get("service_port", container_port)
                    if container_port:
                        service_ports.append(
                            client.V1ServicePort(
                                port=int(service_port),
                                target_port=int(container_port),
                                name=f"port-{container_port}"
                            )
                        )
            
            if not service_ports:
                return
            
            service_spec = client.V1ServiceSpec(
                selector={"app": "user-environment", "user": username, "resource": resource_name},
                ports=service_ports,
                type="ClusterIP"
            )
            
            metadata = client.V1ObjectMeta(
                name=service_name,
                namespace=namespace,
                labels={
                    "app": "user-environment",
                    "user": username,
                    "resource": resource_name
                }
            )
            
            service = client.V1Service(
                api_version="v1",
                kind="Service",
                metadata=metadata,
                spec=service_spec
            )
            
            self.k8s_client.create_namespaced_service(namespace=namespace, body=service)
            self.logger.info(f"Created Kubernetes service {service_name}")
            
        except Exception as e:
            self.logger.error(f"Failed to create Kubernetes service: {e}")
    
    def _convert_memory_to_bytes(self, memory_str: str) -> int:
        """Convert memory string to bytes."""
        memory_str = memory_str.upper()
        if memory_str.endswith("KI"):
            return int(memory_str[:-2]) * 1024
        elif memory_str.endswith("MI"):
            return int(memory_str[:-2]) * 1024 * 1024
        elif memory_str.endswith("GI"):
            return int(memory_str[:-2]) * 1024 * 1024 * 1024
        elif memory_str.endswith("K"):
            return int(memory_str[:-1]) * 1000
        elif memory_str.endswith("M"):
            return int(memory_str[:-1]) * 1000 * 1000
        elif memory_str.endswith("G"):
            return int(memory_str[:-1]) * 1000 * 1000 * 1000
        else:
            return int(memory_str)  # Assume bytes
    
    def _notify_user_container_info(
        self, user_id: str, username: str, container_name: str, 
        container, ports: list
    ):
        """Send container access information to user."""
        try:
            from ..services.notification import send_resource_notification
            
            # Get container IP and port information
            container.reload()
            container_info = {
                "container_name": container_name,
                "container_id": container.id,
                "status": container.status,
                "ports": ports
            }
            
            # Add network information if available
            if container.attrs.get("NetworkSettings"):
                networks = container.attrs["NetworkSettings"]["Networks"]
                if networks:
                    first_network = list(networks.values())[0]
                    container_info["ip_address"] = first_network.get("IPAddress")
            
            send_resource_notification(
                webhook_id=1,
                user_id=user_id,
                resource_name=container_name,
                success=True,
                action="provision",
                metadata={"container_info": container_info}
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send container info to user {user_id}: {e}")
    
    def _notify_user_kubernetes_info(
        self, user_id: str, username: str, pod_name: str, 
        namespace: str, ports: list
    ):
        """Send Kubernetes pod access information to user."""
        try:
            from ..services.notification import send_resource_notification
            
            pod_info = {
                "pod_name": pod_name,
                "namespace": namespace,
                "ports": ports,
                "kubectl_commands": {
                    "logs": f"kubectl logs {pod_name} -n {namespace}",
                    "exec": f"kubectl exec -it {pod_name} -n {namespace} -- /bin/bash",
                    "port_forward": f"kubectl port-forward {pod_name} 8080:80 -n {namespace}"
                }
            }
            
            send_resource_notification(
                webhook_id=1,
                user_id=user_id,
                resource_name=pod_name,
                success=True,
                action="provision",
                metadata={"kubernetes_info": pod_info}
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send Kubernetes info to user {user_id}: {e}")
```

## Configuration Examples

### Docker Setup

For Docker-based container management:

```bash
# Environment variables
CONTAINER_RUNTIME=docker
DOCKER_HOST=unix:///var/run/docker.sock
DEFAULT_IMAGE=ubuntu:20.04

# Required Python packages in requirements.txt
docker>=6.0.0
```

### Kubernetes Setup

For Kubernetes-based container management:

```bash
# Environment variables
CONTAINER_RUNTIME=k8s
K8S_NAMESPACE=user-environments

# Required Python packages in requirements.txt
kubernetes>=24.2.0

# Kubernetes RBAC (apply to cluster)
```

### Kubernetes RBAC Configuration

Create the necessary RBAC permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: webhook-service-account
  namespace: user-environments
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: user-environments
  name: webhook-role
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "create", "delete", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: webhook-role-binding
  namespace: user-environments
subjects:
- kind: ServiceAccount
  name: webhook-service-account
  namespace: user-environments
roleRef:
  kind: Role
  name: webhook-role
  apiGroup: rbac.authorization.k8s.io
```

## Advanced Features

### Custom Container Images

Support for custom container images:

```python
def configure_resource_for_user(self, resource_name, user_id, username, custom_parameters):
    # Support custom images with validation
    allowed_images = ["ubuntu:20.04", "python:3.9", "node:16", "postgres:13"]
    image = custom_parameters.get("image", config.default_image)
    
    if image not in allowed_images:
        self.logger.warning(f"Image {image} not in allowed list, using default")
        image = config.default_image
    
    # Continue with container creation...
```

### Persistent Storage

Add persistent storage support:

```python
def _create_persistent_volume(self, username: str, resource_name: str, size: str):
    """Create persistent volume for user data."""
    pv_name = f"pv-{username}-{resource_name}"
    
    # Create PersistentVolumeClaim
    pvc = client.V1PersistentVolumeClaim(
        metadata=client.V1ObjectMeta(name=pv_name),
        spec=client.V1PersistentVolumeClaimSpec(
            access_modes=["ReadWriteOnce"],
            resources=client.V1ResourceRequirements(
                requests={"storage": size}
            )
        )
    )
    
    self.k8s_client.create_namespaced_persistent_volume_claim(
        namespace=config.k8s_namespace,
        body=pvc
    )
```

### Resource Monitoring

Monitor container resource usage:

```python
def _monitor_container_resources(self, container_name: str) -> dict:
    """Monitor container resource usage."""
    try:
        container = self.docker_client.containers.get(container_name)
        stats = container.stats(stream=False)
        
        # Calculate CPU percentage
        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                   stats['precpu_stats']['cpu_usage']['total_usage']
        system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                      stats['precpu_stats']['system_cpu_usage']
        cpu_percent = (cpu_delta / system_delta) * 100.0
        
        # Get memory usage
        memory_usage = stats['memory_stats']['usage']
        memory_limit = stats['memory_stats']['limit']
        memory_percent = (memory_usage / memory_limit) * 100.0
        
        return {
            "cpu_percent": cpu_percent,
            "memory_usage_mb": memory_usage / (1024 * 1024),
            "memory_percent": memory_percent
        }
        
    except Exception as e:
        self.logger.error(f"Failed to get container stats: {e}")
        return {}
```

## Testing

### Unit Tests

```python
import pytest
from unittest.mock import Mock, patch
from app.services.resource import ResourceManager

class TestContainerResourceManager:
    def setup_method(self):
        self.manager = ResourceManager()
    
    @patch('docker.from_env')
    def test_docker_container_creation(self, mock_docker):
        # Mock Docker client
        mock_client = Mock()
        mock_container = Mock()
        mock_docker.return_value = mock_client
        mock_client.containers.run.return_value = mock_container
        mock_container.id = "test-container-id"
        
        # Test container creation
        result = self.manager.configure_resource_for_user(
            resource_name="test-env",
            user_id="user123",
            username="testuser"
        )
        
        assert result is True
        mock_client.containers.run.assert_called_once()
```

### Integration Tests

```python
def test_kubernetes_pod_lifecycle():
    """Test complete pod creation and cleanup."""
    manager = ResourceManager()
    
    # Create pod
    success = manager.configure_resource_for_user(
        resource_name="integration-test",
        user_id="test-user",
        username="testuser",
        custom_parameters={"image": "nginx:latest"}
    )
    assert success
    
    # Verify pod exists
    # ... verification logic ...
    
    # Cleanup pod
    cleanup_success = manager.release_resource_from_user(
        resource_name="integration-test",
        username="testuser"
    )
    assert cleanup_success
```

## Security Considerations

1. **Image Security**: Use trusted container images only
2. **Resource Limits**: Enforce CPU, memory, and storage limits
3. **Network Isolation**: Use network policies to isolate user containers
4. **Privilege Management**: Run containers with minimal privileges
5. **Runtime Security**: Use security contexts and pod security standards

## Troubleshooting

### Common Issues

**Container fails to start**:
- Check image availability
- Verify resource limits
- Check port conflicts

**Permission denied errors**:
- Verify RBAC permissions for Kubernetes
- Check Docker daemon permissions
- Ensure service account has proper roles

**Resource constraints**:
- Monitor cluster/node resources
- Adjust resource requests/limits
- Implement resource quotas

This implementation provides a robust foundation for VM/container management webhooks that can be adapted to various container runtimes and orchestration platforms.
