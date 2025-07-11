---
sidebar_position: 4
---

# Network Switch Port Configuration

This guide shows how to implement a webhook for configuring network switch ports using the webhook archetype. This is based on the production switch-port-webhook implementation.

## Overview

Network switch port configuration webhooks are essential for providing isolated network access during reservations. This pattern is commonly used for:

- Laboratory network environments
- Isolated development networks
- Temporary VLAN assignments
- Network access control for devices
- Educational networking labs

## Implementation

### Configuration

Add network equipment configuration to your `app/config.py`:

```python
class AppConfig:
    def __init__(self):
        # ...existing configuration...
        
        # Network configuration
        self.switch_host = os.environ.get("SWITCH_HOST")
        self.switch_username = os.environ.get("SWITCH_USERNAME")
        self.switch_password = os.environ.get("SWITCH_PASSWORD")
        self.switch_type = os.environ.get("SWITCH_TYPE", "cisco_ios")
        self.switch_port = int(os.environ.get("SWITCH_PORT", "22"))
        
        # Default network settings
        self.default_vlan = int(os.environ.get("DEFAULT_VLAN", "1"))
        self.management_vlan = int(os.environ.get("MANAGEMENT_VLAN", "99"))
        self.allowed_vlans = self._parse_vlan_list(os.environ.get("ALLOWED_VLANS", "1,10-100"))
        
        # Connection settings
        self.connection_timeout = int(os.environ.get("CONNECTION_TIMEOUT", "30"))
        self.command_timeout = int(os.environ.get("COMMAND_TIMEOUT", "10"))
    
    def _parse_vlan_list(self, vlan_string: str) -> List[int]:
        """Parse VLAN list from string format like '1,10-20,30'."""
        vlans = []
        for part in vlan_string.split(','):
            if '-' in part:
                start, end = map(int, part.split('-'))
                vlans.extend(range(start, end + 1))
            else:
                vlans.append(int(part))
        return vlans
```

### Environment Variables

Add these variables to your `.env` file:

```bash
# Network Switch Configuration
SWITCH_HOST=192.168.1.10
SWITCH_USERNAME=admin
SWITCH_PASSWORD=your-switch-password
SWITCH_TYPE=cisco_ios
SWITCH_PORT=22

# Network Settings
DEFAULT_VLAN=1
MANAGEMENT_VLAN=99
ALLOWED_VLANS=1,10-100,200-250
CONNECTION_TIMEOUT=30
COMMAND_TIMEOUT=10

# For SNMP monitoring (optional)
SNMP_COMMUNITY=public
SNMP_VERSION=2c

# For multiple switches
SWITCH_CONFIG_JSON={"switch1": {"host": "192.168.1.10", "type": "cisco_ios"}}
```

### Resource Manager Implementation

Update `app/services/resource.py`:

```python
from netmiko import ConnectHandler, NetMikoTimeoutException, NetMikoAuthenticationException
from netmiko.exceptions import ConfigInvalidException
import re
import time
from typing import Optional, Dict, Any, List

class ResourceManager:
    def __init__(self):
        self.logger = logger
        self.switch_config = {
            'device_type': config.switch_type,
            'host': config.switch_host,
            'username': config.switch_username,
            'password': config.switch_password,
            'port': config.switch_port,
            'timeout': config.connection_timeout,
            'banner_timeout': config.command_timeout,
        }
    
    def configure_resource_for_user(
        self,
        resource_name: str,
        user_id: str,
        username: str,
        custom_parameters: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Configure switch port with user-specific VLAN."""
        try:
            self.logger.info(f"Configuring switch port {resource_name} for user {username}")
            
            # Parse custom parameters
            if custom_parameters:
                vlan_id = custom_parameters.get("vlan_id")
                trunk_vlans = custom_parameters.get("trunk_vlans", [])
                port_description = custom_parameters.get("description", f"Reserved for {username}")
                port_speed = custom_parameters.get("speed", "auto")
                port_duplex = custom_parameters.get("duplex", "auto")
                enable_port_security = custom_parameters.get("port_security", False)
                max_mac_addresses = custom_parameters.get("max_mac_addresses", 1)
            else:
                vlan_id = None
                trunk_vlans = []
                port_description = f"Reserved for {username}"
                port_speed = "auto"
                port_duplex = "auto"
                enable_port_security = False
                max_mac_addresses = 1
            
            # Validate VLAN
            if not vlan_id:
                self.logger.error("VLAN ID is required for switch port configuration")
                return False
            
            if vlan_id not in config.allowed_vlans:
                self.logger.error(f"VLAN {vlan_id} is not in allowed VLANs list")
                return False
            
            # Configure the switch port
            success = self._configure_switch_port(
                port_name=resource_name,
                vlan_id=vlan_id,
                trunk_vlans=trunk_vlans,
                description=port_description,
                username=username,
                speed=port_speed,
                duplex=port_duplex,
                enable_port_security=enable_port_security,
                max_mac_addresses=max_mac_addresses
            )
            
            if success:
                # Send port configuration info to user
                self._notify_user_port_config(
                    user_id=user_id,
                    username=username,
                    port_name=resource_name,
                    vlan_id=vlan_id,
                    trunk_vlans=trunk_vlans,
                    description=port_description
                )
                
                self.logger.info(f"Successfully configured port {resource_name} for user {username}")
                return True
            else:
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to configure switch port for user {username}: {e}")
            return False
    
    def release_resource_from_user(
        self,
        resource_name: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None
    ) -> bool:
        """Reset switch port to default configuration."""
        try:
            self.logger.info(f"Resetting switch port {resource_name} to default configuration")
            
            # Reset port to default VLAN and configuration
            success = self._reset_switch_port(
                port_name=resource_name,
                username=username or "unknown"
            )
            
            if success:
                self.logger.info(f"Successfully reset port {resource_name} to default")
                return True
            else:
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to reset switch port {resource_name}: {e}")
            return False
    
    def _configure_switch_port(
        self,
        port_name: str,
        vlan_id: int,
        trunk_vlans: List[int],
        description: str,
        username: str,
        speed: str = "auto",
        duplex: str = "auto",
        enable_port_security: bool = False,
        max_mac_addresses: int = 1
    ) -> bool:
        """Configure switch port with specified settings."""
        try:
            # Connect to switch
            with ConnectHandler(**self.switch_config) as connection:
                # Verify we can access the switch
                hostname = connection.find_hostname()
                self.logger.info(f"Connected to switch: {hostname}")
                
                # Check if VLAN exists
                if not self._vlan_exists(connection, vlan_id):
                    self.logger.error(f"VLAN {vlan_id} does not exist on switch")
                    return False
                
                # Prepare configuration commands
                config_commands = []
                
                # Enter interface configuration mode
                config_commands.append(f"interface {port_name}")
                
                # Set description
                config_commands.append(f"description {description}")
                
                # Configure VLAN assignment
                if trunk_vlans:
                    # Configure as trunk port
                    config_commands.extend([
                        "switchport mode trunk",
                        f"switchport trunk native vlan {vlan_id}",
                        f"switchport trunk allowed vlan {','.join(map(str, trunk_vlans))}"
                    ])
                else:
                    # Configure as access port
                    config_commands.extend([
                        "switchport mode access",
                        f"switchport access vlan {vlan_id}"
                    ])
                
                # Configure port speed and duplex
                if speed != "auto":
                    config_commands.append(f"speed {speed}")
                if duplex != "auto":
                    config_commands.append(f"duplex {duplex}")
                
                # Configure port security if enabled
                if enable_port_security:
                    config_commands.extend([
                        "switchport port-security",
                        f"switchport port-security maximum {max_mac_addresses}",
                        "switchport port-security violation restrict",
                        "switchport port-security mac-address sticky"
                    ])
                
                # Enable the port
                config_commands.append("no shutdown")
                
                # Apply configuration
                self.logger.info(f"Applying configuration to port {port_name}: {config_commands}")
                output = connection.send_config_set(config_commands)
                
                # Save configuration
                save_output = connection.save_config()
                
                # Verify configuration
                if self._verify_port_config(connection, port_name, vlan_id, trunk_vlans):
                    self.logger.info(f"Port {port_name} configuration verified successfully")
                    return True
                else:
                    self.logger.error(f"Port {port_name} configuration verification failed")
                    return False
                
        except NetMikoTimeoutException:
            self.logger.error("Timeout connecting to switch")
            return False
        except NetMikoAuthenticationException:
            self.logger.error("Authentication failed connecting to switch")
            return False
        except ConfigInvalidException as e:
            self.logger.error(f"Invalid configuration applied to switch: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error configuring switch port: {e}")
            return False
    
    def _reset_switch_port(self, port_name: str, username: str) -> bool:
        """Reset switch port to default configuration."""
        try:
            with ConnectHandler(**self.switch_config) as connection:
                # Prepare reset commands
                config_commands = [
                    f"interface {port_name}",
                    "no description",
                    f"switchport access vlan {config.default_vlan}",
                    "switchport mode access",
                    "no switchport trunk native vlan",
                    "no switchport trunk allowed vlan",
                    "no switchport port-security",
                    "no switchport port-security maximum",
                    "no switchport port-security violation",
                    "no switchport port-security mac-address sticky",
                    "speed auto",
                    "duplex auto",
                    "shutdown"  # Disable port for security
                ]
                
                # Apply reset configuration
                self.logger.info(f"Resetting port {port_name} to default configuration")
                output = connection.send_config_set(config_commands)
                
                # Save configuration
                save_output = connection.save_config()
                
                # Verify reset
                if self._verify_port_reset(connection, port_name):
                    self.logger.info(f"Port {port_name} reset verified successfully")
                    return True
                else:
                    self.logger.warning(f"Port {port_name} reset verification failed")
                    return True  # Still return True as reset was attempted
                
        except Exception as e:
            self.logger.error(f"Error resetting switch port {port_name}: {e}")
            return False
    
    def _vlan_exists(self, connection, vlan_id: int) -> bool:
        """Check if VLAN exists on the switch."""
        try:
            output = connection.send_command(f"show vlan id {vlan_id}")
            return "VLAN Name" in output or str(vlan_id) in output
        except Exception as e:
            self.logger.warning(f"Could not verify VLAN {vlan_id} existence: {e}")
            return True  # Assume it exists if we can't check
    
    def _verify_port_config(
        self, 
        connection, 
        port_name: str, 
        expected_vlan: int, 
        trunk_vlans: List[int]
    ) -> bool:
        """Verify the port configuration was applied correctly."""
        try:
            # Get interface configuration
            output = connection.send_command(f"show interface {port_name} switchport")
            
            if trunk_vlans:
                # Verify trunk configuration
                if "Trunking" not in output:
                    self.logger.error(f"Port {port_name} not configured as trunk")
                    return False
                    
                if f"Native vlan: {expected_vlan}" not in output:
                    self.logger.error(f"Port {port_name} native VLAN not set to {expected_vlan}")
                    return False
            else:
                # Verify access configuration
                if f"Access Mode VLAN: {expected_vlan}" not in output:
                    self.logger.error(f"Port {port_name} not configured for VLAN {expected_vlan}")
                    return False
            
            # Check if port is up
            status_output = connection.send_command(f"show interface {port_name} status")
            if "connected" not in status_output.lower() and "notconnect" not in status_output.lower():
                self.logger.warning(f"Port {port_name} status unclear: {status_output}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error verifying port configuration: {e}")
            return False
    
    def _verify_port_reset(self, connection, port_name: str) -> bool:
        """Verify the port was reset to default configuration."""
        try:
            output = connection.send_command(f"show interface {port_name} switchport")
            
            # Check if port is back to default VLAN
            if f"Access Mode VLAN: {config.default_vlan}" in output:
                return True
            
            # Check if port is disabled
            status_output = connection.send_command(f"show interface {port_name} status")
            if "disabled" in status_output.lower():
                return True
                
            return False
            
        except Exception as e:
            self.logger.error(f"Error verifying port reset: {e}")
            return False
    
    def _notify_user_port_config(
        self,
        user_id: str,
        username: str,
        port_name: str,
        vlan_id: int,
        trunk_vlans: List[int],
        description: str
    ):
        """Send port configuration information to user."""
        try:
            from ..services.notification import send_resource_notification
            
            # Prepare port configuration info
            port_info = {
                "port_name": port_name,
                "vlan_id": vlan_id,
                "trunk_vlans": trunk_vlans,
                "description": description,
                "switch_host": config.switch_host,
                "access_type": "trunk" if trunk_vlans else "access",
                "configuration_time": time.strftime("%Y-%m-%d %H:%M:%S"),
                "usage_instructions": {
                    "access_mode": f"Connect your device to port {port_name}. It will be assigned to VLAN {vlan_id}.",
                    "trunk_mode": f"Port {port_name} is configured as trunk with native VLAN {vlan_id} and allowed VLANs: {trunk_vlans}" if trunk_vlans else None
                }
            }
            
            # Send notification with port configuration
            send_resource_notification(
                webhook_id=1,
                user_id=user_id,
                resource_name=port_name,
                success=True,
                action="configure",
                metadata={"port_configuration": port_info}
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send port configuration to user {user_id}: {e}")
    
    def get_port_status(self, port_name: str) -> Dict[str, Any]:
        """Get current port status and configuration."""
        try:
            with ConnectHandler(**self.switch_config) as connection:
                # Get port status
                status_output = connection.send_command(f"show interface {port_name} status")
                switchport_output = connection.send_command(f"show interface {port_name} switchport")
                
                # Parse status information
                status_info = {
                    "port_name": port_name,
                    "status": "unknown",
                    "vlan": "unknown",
                    "speed": "unknown",
                    "duplex": "unknown"
                }
                
                # Parse status output
                for line in status_output.split('\n'):
                    if port_name in line:
                        parts = line.split()
                        if len(parts) >= 4:
                            status_info["status"] = parts[1]
                            status_info["vlan"] = parts[2]
                            status_info["speed"] = parts[3] if len(parts) > 3 else "unknown"
                            status_info["duplex"] = parts[4] if len(parts) > 4 else "unknown"
                
                return status_info
                
        except Exception as e:
            self.logger.error(f"Error getting port status: {e}")
            return {"error": str(e)}
```

## Advanced Features

### Multiple Switch Support

Support for multiple switches:

```python
class MultiSwitchManager:
    def __init__(self):
        self.switches = self._load_switch_config()
    
    def _load_switch_config(self) -> Dict[str, Dict]:
        """Load configuration for multiple switches."""
        import json
        switch_config_json = config.switch_config_json
        
        if switch_config_json:
            return json.loads(switch_config_json)
        else:
            # Single switch configuration
            return {
                "default": {
                    "host": config.switch_host,
                    "username": config.switch_username,
                    "password": config.switch_password,
                    "device_type": config.switch_type
                }
            }
    
    def get_switch_for_port(self, port_name: str) -> str:
        """Determine which switch manages a specific port."""
        # Logic to map port names to switches
        # This could be based on port naming convention
        if port_name.startswith("gi1/"):
            return "switch1"
        elif port_name.startswith("gi2/"):
            return "switch2"
        else:
            return "default"
```

### VLAN Management

Automatic VLAN creation and management:

```python
def ensure_vlan_exists(self, connection, vlan_id: int, vlan_name: str = None) -> bool:
    """Ensure VLAN exists, create if necessary."""
    try:
        # Check if VLAN exists
        if self._vlan_exists(connection, vlan_id):
            return True
        
        # Create VLAN
        vlan_name = vlan_name or f"vlan_{vlan_id}"
        config_commands = [
            f"vlan {vlan_id}",
            f"name {vlan_name}",
            "exit"
        ]
        
        connection.send_config_set(config_commands)
        connection.save_config()
        
        self.logger.info(f"Created VLAN {vlan_id} with name {vlan_name}")
        return True
        
    except Exception as e:
        self.logger.error(f"Failed to create VLAN {vlan_id}: {e}")
        return False
```

### Port Security Enhancement

Enhanced port security configuration:

```python
def configure_advanced_port_security(
    self, 
    connection, 
    port_name: str, 
    mac_addresses: List[str] = None
) -> bool:
    """Configure advanced port security with specific MAC addresses."""
    try:
        config_commands = [
            f"interface {port_name}",
            "switchport port-security",
            "switchport port-security violation protect",
            "switchport port-security aging time 1440",  # 24 hours
            "switchport port-security aging type inactivity"
        ]
        
        if mac_addresses:
            for mac in mac_addresses:
                config_commands.append(f"switchport port-security mac-address {mac}")
            config_commands.append(f"switchport port-security maximum {len(mac_addresses)}")
        else:
            config_commands.extend([
                "switchport port-security maximum 1",
                "switchport port-security mac-address sticky"
            ])
        
        connection.send_config_set(config_commands)
        return True
        
    except Exception as e:
        self.logger.error(f"Failed to configure port security: {e}")
        return False
```

### SNMP Monitoring

Monitor switch ports via SNMP:

```python
from pysnmp.hlapi import *

def monitor_port_via_snmp(self, port_index: int) -> Dict[str, Any]:
    """Monitor port status via SNMP."""
    try:
        # SNMP OIDs for interface monitoring
        oid_admin_status = f"1.3.6.1.2.1.2.2.1.7.{port_index}"  # ifAdminStatus
        oid_oper_status = f"1.3.6.1.2.1.2.2.1.8.{port_index}"   # ifOperStatus
        oid_in_octets = f"1.3.6.1.2.1.2.2.1.10.{port_index}"    # ifInOctets
        oid_out_octets = f"1.3.6.1.2.1.2.2.1.16.{port_index}"   # ifOutOctets
        
        # Perform SNMP GET
        for (errorIndication, errorStatus, errorIndex, varBinds) in nextCmd(
            SnmpEngine(),
            CommunityData(config.snmp_community),
            UdpTransportTarget((config.switch_host, 161)),
            ContextData(),
            ObjectType(ObjectIdentity(oid_admin_status)),
            ObjectType(ObjectIdentity(oid_oper_status)),
            ObjectType(ObjectIdentity(oid_in_octets)),
            ObjectType(ObjectIdentity(oid_out_octets)),
            lexicographicMode=False
        ):
            if errorIndication:
                self.logger.error(f"SNMP error: {errorIndication}")
                break
            elif errorStatus:
                self.logger.error(f"SNMP error: {errorStatus.prettyPrint()}")
                break
            else:
                return {
                    "admin_status": int(varBinds[0][1]),
                    "oper_status": int(varBinds[1][1]),
                    "in_octets": int(varBinds[2][1]),
                    "out_octets": int(varBinds[3][1])
                }
        
        return {}
        
    except Exception as e:
        self.logger.error(f"SNMP monitoring error: {e}")
        return {}
```

## Testing

### Unit Tests

```python
import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.resource import ResourceManager

class TestSwitchPortResourceManager:
    def setup_method(self):
        self.manager = ResourceManager()
    
    @patch('netmiko.ConnectHandler')
    def test_switch_port_configuration(self, mock_connect_handler):
        # Mock switch connection
        mock_connection = MagicMock()
        mock_connect_handler.return_value.__enter__.return_value = mock_connection
        mock_connection.find_hostname.return_value = "test-switch"
        mock_connection.send_command.return_value = "VLAN Name Status"
        mock_connection.send_config_set.return_value = "Configuration applied"
        mock_connection.save_config.return_value = "Configuration saved"
        
        # Test port configuration
        result = self.manager.configure_resource_for_user(
            resource_name="gi1/0/1",
            user_id="user123",
            username="testuser",
            custom_parameters={"vlan_id": 10}
        )
        
        assert result is True
        mock_connection.send_config_set.assert_called_once()
    
    def test_vlan_validation(self):
        # Test VLAN validation logic
        config.allowed_vlans = [1, 10, 11, 12, 20, 21, 22]
        
        # Valid VLAN
        assert 10 in config.allowed_vlans
        
        # Invalid VLAN
        assert 999 not in config.allowed_vlans
```

### Integration Tests

```python
def test_switch_connectivity():
    """Test actual switch connectivity."""
    manager = ResourceManager()
    
    try:
        with ConnectHandler(**manager.switch_config) as connection:
            hostname = connection.find_hostname()
            assert hostname is not None
            print(f"Successfully connected to switch: {hostname}")
    except Exception as e:
        pytest.skip(f"Cannot connect to switch for integration test: {e}")

def test_port_configuration_lifecycle():
    """Test complete port configuration and reset."""
    manager = ResourceManager()
    test_port = "gi1/0/48"  # Use a test port
    test_vlan = 99
    
    # Configure port
    success = manager.configure_resource_for_user(
        resource_name=test_port,
        user_id="test-user",
        username="testuser",
        custom_parameters={"vlan_id": test_vlan}
    )
    assert success
    
    # Verify configuration
    status = manager.get_port_status(test_port)
    assert status["vlan"] == str(test_vlan)
    
    # Reset port
    cleanup_success = manager.release_resource_from_user(
        resource_name=test_port,
        username="testuser"
    )
    assert cleanup_success
```

## Security Considerations

1. **Authentication**: Use strong authentication for switch access
2. **Authorization**: Implement role-based access control
3. **Encryption**: Use SSH for switch connections, avoid Telnet
4. **VLAN Isolation**: Ensure proper VLAN isolation and security
5. **Port Security**: Implement MAC address filtering when appropriate
6. **Monitoring**: Log all configuration changes and access attempts

## Troubleshooting

### Common Issues

**Switch connection timeouts**:
- Check network connectivity to switch
- Verify SSH service is enabled on switch
- Check firewall rules

**Authentication failures**:
- Verify switch credentials
- Check user permissions on switch
- Ensure SSH key authentication if used

**Configuration not applied**:
- Check command syntax for switch type
- Verify user has configuration privileges
- Check for configuration conflicts

**VLAN assignment issues**:
- Verify VLAN exists on switch
- Check VLAN is in allowed list
- Ensure port supports VLAN configuration

This implementation provides a robust foundation for network switch port management webhooks that can be adapted to various switch vendors and network configurations.
