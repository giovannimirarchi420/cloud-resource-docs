---
sidebar_position: 1
---

# Cloud Resource Reservation System Overview

Welcome to the **Cloud Resource Access Control** - a comprehensive platform designed to automate and manage cloud resource reservations with intelligent webhook integration and real-time monitoring capabilities.

## 🎯 What is Cloud Resource Access Control?

The Cloud Resource Access Control system is an enterprise-grade platform that provides:

- **Centralized Resource Management**: Manage all your cloud resources from a single dashboard
- **Intelligent Booking System**: Calendar-based reservation system with conflict resolution
- **Real-time Webhook Integration**: Seamless integration with external systems through configurable webhooks
- **Comprehensive Audit Logging**: Track every action with detailed logs and status monitoring
- **Multi-site Support**: Manage resources across multiple sites and locations
- **Role-based Access Control**: Secure user management with Keycloak integration

## 🏢 Common Use Cases & Problem Solutions

The Cloud Resource Access Control system addresses critical challenges in modern IT infrastructure management:

### Infrastructure Management Challenges
- **Resource Conflicts**: Eliminate scheduling conflicts when multiple teams need the same specialized computing resources
- **Manual Coordination**: Replace inefficient spreadsheet and email-based resource scheduling with automated systems
- **Integration Complexity**: Simplify complex integrations between different tools and APIs used by various teams
- **Audit Requirements**: Meet compliance needs with comprehensive logging and tracking capabilities
- **Multi-site Management**: Centrally manage resources distributed across different physical locations or cloud providers

### Complete Workflow Solutions

**🗓️ Centralized Booking & Scheduling**
The platform provides:
- Unified calendar interface for viewing all available resources
- Automatic conflict detection and resolution
- Support for recurring reservations for ongoing projects
- Automated notifications for upcoming reservations and status changes

![Booking Calendar Interface](/img/booking_calendar.png)

**🔗 Automated Resource Provisioning**
When a resource is booked, the system can automatically:
1. Trigger webhooks to configure the target infrastructure
2. Provision SSH access with appropriate authentication keys
3. Update network policies to enable team access
4. Notify monitoring systems to track resource utilization

![Webhook Configuration](/img/webhook_logs.png)

**📊 Comprehensive Monitoring & Oversight**
The dashboard provides real-time visibility into:
- **Live status** of all webhook integrations and system health
- **Detailed audit logs** tracking all user actions and system events
- **Resource utilization** metrics across all managed sites and locations

![Admin Dashboard](/img/admin_dashboard.png)

![Audit Logs](/img/audit_logs.png)

**🔐 Enterprise-Grade Security**
Security features include:
- Role-based access control ensuring users only see authorized resources
- Granular permissions management for different user groups
- Webhook signature validation for authenticated external communications

### Infrastructure Components

- **🖥️ reservation-fe**: React-based frontend application providing an intuitive user interface
- **🔌 reservation-be**: Backend service handling business logic, APIs, and database operations
- **⚡ reservation-event-processor**: Event-driven microservice for asynchronous processing
- **🔑 Keycloak**: Authentication and authorization service
- **🗄️ PostgreSQL**: Database for persistent data storage

## How Components Interact


![Architecture Diagram](/img/arch-diagram.png)


1. **User Interaction**: Users interact with the React frontend to create reservations and configure resources
2. **API Layer**: The backend provides RESTful APIs secured with Keycloak authentication
3. **Event Processing**: Asynchronous events are processed by the event processor microservice
4. **Webhook Integration**: Custom webhooks enable integration with external resource providers
5. **Data Persistence**: All data is stored in PostgreSQL with proper transaction management

### Deployments

- **🐳 Docker & Docker Compose**: Containerization and local development environment - see on [github](https://github.com/giovannimirarchi420/cloud-resource-reservation)
- **☸️ prognose-helm-chart**: Kubernetes deployment using Helm charts - see our [Kubernetes Deployment Guide](./guides/kubernetes-deployment.md)
- **🔗 Webhook System**: Extensible webhook framework for resource integration - see our [Webhooks Guide](./guides/webhooks.md)

## 🗝️ Key Features

### 📋 Dashboard & Resource Management
- **Unified Dashboard**: Single-pane view of all resources across multiple sites
- **Interactive Calendar**: Visual booking interface with drag-and-drop scheduling
- **Resource Types**: Support for diverse resource types (servers, GPU clusters, lab equipment)
- **Multi-site Support**: Manage resources across different physical or cloud locations

![Resource Explorer](/img/resource_explorer.png)

![Resource Types](/img/resource_type.png)

![Sites Management](/img/sites.png)

### 🔗 Webhook System
Based on the webhook management interface shown in your screenshots:

- **Visual Configuration**: Easy-to-use web interface for webhook setup
- **Event Filtering**: Choose specific events (Booking Created, Started, Ended) to trigger webhooks
- **Resource Scoping**: Configure webhooks for all resources, specific resources, or resource types
- **Real-time Monitoring**: Live status dashboard showing webhook success/failure rates
- **Comprehensive Logging**: Detailed audit trail with timestamps and HTTP status codes

![Webhooks Dashboard](/img/webhooks.png)

### 📊 Monitoring & Audit Capabilities
Your system provides enterprise-grade monitoring:

- **Status Tracking**: Real-time webhook execution status (Success/Failed indicators)
- **HTTP Response Codes**: Detailed logging of webhook responses (200, 500, etc.)
- **Event Timeline**: Chronological view of all booking events and webhook triggers
- **Performance Metrics**: Track webhook response times and reliability
- **Failure Analysis**: Identify and troubleshoot integration issues quickly

### 🔐 Enterprise Security
- Keycloak-based authentication and authorization
- Role-based access control (RBAC)
- Secure API endpoints with JWT tokens

![User Management](/img/user_management.png)

![User Profile](/img/profile.png)

### 🚀 Deployment & Scalability
- Docker containerization for consistent deployments
- Kubernetes support with Helm charts - see our [Kubernetes Deployment Guide](./guides/kubernetes-deployment.md)
- Microservices architecture for horizontal scaling

## Getting Started

To get started with the Cloud Resource Reservation System:

1. **Development Environment**: Use Docker Compose for local development
2. **Production Deployment**: Deploy using Kubernetes with our [Helm Chart Deployment Guide](./guides/kubernetes-deployment.md)
3. **Webhook Integration**: Follow our [Webhooks Guide](./guides/webhooks.md) to integrate custom resources

## Demo Environment

A live demo is available at:
- **URL**: https://204.216.215.139/
- **Username**: admin
- **Password**: password

For local development, check out the [main repository](https://github.com/giovannimirarchi420/cloud-resource-reservation) for setup instructions.
