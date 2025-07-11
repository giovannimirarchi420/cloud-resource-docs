---
sidebar_position: 2
---

# Kubernetes Deployment with Helm

This guide will walk you through deploying the Cloud Resource Reservation System on Kubernetes using the official Helm chart.

## Prerequisites

Before you begin, ensure you have the following:

- **Kubernetes cluster** (v1.19+) with proper access credentials
- **Helm 3.x** installed on your local machine
- **kubectl** configured to access your cluster
- **Ingress controller** deployed in your cluster (e.g., NGINX, Traefik)
- **DNS management** capability for configuring ingress hostnames

### Verify Prerequisites

```bash
# Check Kubernetes connection
kubectl cluster-info

# Check Helm installation
helm version

# Verify ingress controller is running
kubectl get pods -n ingress-nginx
```

## ⚠️ Important: Required Configuration

**Before deploying the Helm chart, you MUST configure the required parameters.** The chart cannot be deployed with default values alone and requires proper configuration of secrets and other parameters.

### Required Configuration Steps:

1. **Configure Keycloak secrets** (mandatory)
2. **Set database passwords** (if using internal PostgreSQL)
3. **Configure ingress hostnames** for your environment
4. **Set appropriate image tags** for your deployment

**The deployment will fail if these required parameters are not properly configured.**

## Quick Start

### 1. Clone the Helm Chart

```bash
git clone https://github.com/giovannimirarchi420/prognose-helm-chart.git
cd prognose-helm-chart
```

### 2. Configure Required Parameters

**⚠️ You cannot deploy the chart without proper configuration!**

Create a custom values file (e.g., `my-values.yaml`) with the required parameters:

```yaml
# Example minimum required configuration
be:
  secrets:
    keycloakClientSecret: <your-keycloak-client-secret>
  ingress:
    host: your-domain.com

fe:
  ingress:
    host: your-domain.com

eventProcessor:
  secrets:
    keycloakClientSecret: <your-keycloak-client-secret>

postgresql:
  auth:
    password: <secure-database-password>
```

### 3. Deploy with Custom Configuration

```bash
helm install cloud-resource-reservation ./prognose-helm-chart -f my-values.yaml
```

## Configuration Options

The Helm chart provides extensive configuration options through the `values.yaml` file. You can either modify this file directly or create your own values file.

### ⚠️ Required Parameters Checklist

Before deployment, ensure you have configured the following **mandatory** parameters:

- ✅ **Keycloak Client Secret**: `be.secrets.keycloakClientSecret` and `eventProcessor.secrets.keycloakClientSecret`
- ✅ **Database Password**: `postgresql.auth.password` (if using internal PostgreSQL)
- ✅ **Ingress Hostnames**: `be.ingress.host` and `fe.ingress.host`
- ✅ **External Database Credentials**: `be.secrets.dbUser` and `be.secrets.dbPassword` (if `postgresql.enabled: false`)

### Image Tag Requirements

- **For PostgreSQL**: Use image tags ending with `-postgres`
- **For Oracle**: Use image tags ending with `-oracle`
- **Check available versions**: Links to Docker Hub repositories are provided in the configuration examples

The Helm chart provides extensive configuration options through the `values.yaml` file. You can either modify this file directly or create your own values file.

### Key Configuration Sections

#### Application Settings
```yaml
app: prognose
```

#### Backend Configuration
```yaml
be:
  replicaCount: 1
  image:
    repository: docker.io/g420/prognose-backend
    tag: 1.9.1-postgres # Specify desired backend image version (https://hub.docker.com/repository/docker/g420/resource-management-backend/general)
  containerPort: 8080
  config:
    # If using PostgreSQL, use the -postgresql image
    # If using Oracle DB, use the -oracle image
    
    # Specify dbUrl only if postgresql.enabled is set to false, as the application will not deploy its own PostgreSQL instance.
    # dbUrl: "<db_url>" # Example Oracle: jdbc:oracle:thin:@//host:port/service_name, 
    # Example Postgres: jdbc:postgresql://host:port/database
    keycloakAuthServerUrl: https://auth.crownlabs.polito.it/auth
    keycloakRealm: prognose
    keycloakClientId: prognose-app
  secrets:
    # Provide dbUser and dbPassword only if postgresql.enabled is set to false, as the application will not deploy its own PostgreSQL instance.
    # dbUser: <db_username>
    # dbPassword: <db_password>
    keycloakClientSecret: <keycloak_client_secret>  # REQUIRED
  ingress:
    host: prognose.crownlabs.polito.it
    path: /api
  resources: {}
  # We usually recommend not to specify default resources and to leave this as a conscious
  # choice for the user. This also increases chances charts run on environments with little
  # resources, such as Minikube. If you do want to specify resources, uncomment the following
  # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
  # limits:
  #   cpu: 100m
  #   memory: 128Mi
  # requests:
  #   cpu: 100m
  #   memory: 128Mi
```

#### Frontend Configuration
```yaml
fe:
  replicaCount: 1
  image:
    repository: docker.io/g420/prognose-frontend
    tag: 1.5.4 # Specify desired frontend image version (https://hub.docker.com/repository/docker/g420/resource-management-frontend/general)
  config:
    keycloakClientId: prognose-fe
  ingress:
    host: prognose.crownlabs.polito.it
  resources: {}
  # We usually recommend not to specify default resources and to leave this as a conscious
  # choice for the user. This also increases chances charts run on environments with little
  # resources, such as Minikube. If you do want to specify resources, uncomment the following
  # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
  # limits:
  #   cpu: 100m
  #   memory: 128Mi
  # requests:
  #   cpu: 100m
  #   memory: 128Mi
```

#### Event Processor Configuration
```yaml
eventProcessor:
  replicaCount: 1
  image:
    repository: docker.io/g420/reservation-event-processor
    tag: 0.1.18-postgres # Specify desired backend image version (https://hub.docker.com/repository/docker/g420/reservation-event-processor/general) 
  containerPort: 8080
  config:
    keycloakClientId: prognose-app
  secrets:
    keycloakClientSecret: <keycloak_client_secret>  # REQUIRED
  resources: {}
  # We usually recommend not to specify default resources and to leave this as a conscious
  # choice for the user. This also increases chances charts run on environments with little
  # resources, such as Minikube. If you do want to specify resources, uncomment the following
  # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
  # limits:
  #   cpu: 100m
  #   memory: 128Mi
  # requests:
  #   cpu: 100m
  #   memory: 128Mi
```

#### Database Configuration
```yaml
# PostgreSQL configuration section
postgresql:
  enabled: true # Set to true to deploy PostgreSQL alongside the application
  image:
    repository: postgres
    tag: "15-alpine" # Specify desired PostgreSQL version
  auth:
    username: prognose_user
    password: <db_password> # Set a secure password for the PostgreSQL user - REQUIRED
    database: prognosedb # Default database name
  persistence:
    enabled: true
    storageClass: rook-ceph-block # Specify storage class or leave empty for default
    size: 8Gi # Default PVC size
  resources: {}
  # We usually recommend not to specify default resources and to leave this as a conscious
  # choice for the user. This also increases chances charts run on environments with little
  # resources, such as Minikube. If you do want to specify resources, uncomment the following
  # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
  # limits:
  #   cpu: 1000m
  #   memory: 512Mi
  # requests:
  #   cpu: 500m
  #   memory: 1Gi
```

## Deployment Scenarios

### Scenario 1: Development Environment with Internal Database

Create a custom values file `dev-values.yaml`:

```yaml
app: prognose

be:
  replicaCount: 1
  image:
    repository: docker.io/g420/prognose-backend
    tag: 1.9.1-postgres
  config:
    keycloakAuthServerUrl: https://auth.crownlabs.polito.it/auth
    keycloakRealm: prognose
    keycloakClientId: prognose-app
  secrets:
    keycloakClientSecret: your-dev-keycloak-secret
  ingress:
    host: dev.your-domain.com
    path: /api

fe:
  replicaCount: 1
  image:
    repository: docker.io/g420/prognose-frontend
    tag: 1.5.4
  config:
    keycloakClientId: prognose-fe
  ingress:
    host: dev.your-domain.com

eventProcessor:
  replicaCount: 1
  image:
    repository: docker.io/g420/reservation-event-processor
    tag: 0.1.18-postgres
  config:
    keycloakClientId: prognose-app
  secrets:
    keycloakClientSecret: your-dev-keycloak-secret

postgresql:
  enabled: true
  image:
    repository: postgres
    tag: "15-alpine"
  auth:
    username: prognose_user
    password: dev-secure-password
    database: prognosedb
  persistence:
    enabled: true
    size: 5Gi
```

Deploy with:

```bash
# Create namespace
kubectl create namespace dev

# Install the chart
helm install prognose-dev ./prognose-helm-chart -f dev-values.yaml -n dev
```

### Scenario 2: Production Environment with External PostgreSQL Database

Create a production values file `prod-values.yaml`:

```yaml
app: prognose

be:
  replicaCount: 3
  image:
    repository: docker.io/g420/prognose-backend
    tag: 1.9.1-postgres
  config:
    dbUrl: "jdbc:postgresql://prod-postgres.company.com:5432/prognosedb"
    keycloakAuthServerUrl: https://auth.company.com/auth
    keycloakRealm: prognose
    keycloakClientId: prognose-app
  secrets:
    dbUser: prod_db_user
    dbPassword: prod_db_password
    keycloakClientSecret: production-keycloak-secret
  ingress:
    host: prognose.company.com
    path: /api
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"

fe:
  replicaCount: 3
  image:
    repository: docker.io/g420/prognose-frontend
    tag: 1.5.4
  config:
    keycloakClientId: prognose-fe
  ingress:
    host: prognose.company.com
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"

eventProcessor:
  replicaCount: 2
  image:
    repository: docker.io/g420/reservation-event-processor
    tag: 0.1.18-postgres
  config:
    keycloakClientId: prognose-app
  secrets:
    keycloakClientSecret: production-keycloak-secret
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"

postgresql:
  enabled: false  # Using external database
```

Deploy with:

```bash
# Create namespace
kubectl create namespace production

# Install the chart
helm install prognose-prod ./prognose-helm-chart -f prod-values.yaml -n production
```

### Scenario 3: Oracle Database Integration

For environments using Oracle databases, create `oracle-values.yaml`:

```yaml
app: prognose

be:
  image:
    repository: docker.io/g420/prognose-backend
    tag: 1.9.1-oracle  # Use -oracle suffix for Oracle database
  config:
    dbUrl: "jdbc:oracle:thin:@//oracle.company.com:1521/ORCL"
    keycloakAuthServerUrl: https://auth.company.com/auth
    keycloakRealm: prognose
    keycloakClientId: prognose-app
  secrets:
    dbUser: oracle_user
    dbPassword: oracle_password
    keycloakClientSecret: your-keycloak-secret

eventProcessor:
  image:
    repository: docker.io/g420/reservation-event-processor
    tag: 0.1.18-oracle  # Note: Check documentation for Oracle support
  secrets:
    keycloakClientSecret: your-keycloak-secret

postgresql:
  enabled: false  # Not using PostgreSQL
```

Deploy with:

```bash
# Create namespace
kubectl create namespace production

# Install the chart
helm install resource-management-prod ./prognose-helm-chart -f oracle-values.yaml
```

## Post-Deployment Configuration

### 1. Verify Deployment

```bash
# Check pod status
kubectl get pods -n your-namespace

# Check services
kubectl get services -n your-namespace

# Check ingress
kubectl get ingress -n your-namespace

# View logs
kubectl logs -f deployment/resource-management-be -n your-namespace
```

### 2. Access the Application

Once deployed, you can access the application through the configured ingress hosts:

- **Frontend**: `https://your-frontend-host`
- **Backend API**: `https://your-backend-host/api`
- **Backend Swagger**: `https://your-backend-host/api/swagger-ui/index.html#/` 

### 3. Configure DNS

Ensure your DNS records point to your ingress controller's external IP:

```bash
# Get ingress controller external IP
kubectl get svc -n ingress-nginx
```

Then create A records:
- `app.your-domain.com` → `<ingress-external-ip>`
- `api.your-domain.com` → `<ingress-external-ip>`

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

Check pod events and logs:
```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```

#### 2. Database Connection Issues

Verify database configuration and credentials:
```bash
# For internal PostgreSQL
kubectl exec -it <postgres-pod> -n <namespace> -- psql -U <username> -d <database>

# Check secrets
kubectl get secret <secret-name> -n <namespace> -o yaml
```

#### 3. Ingress Not Working

Check ingress controller and configuration:
```bash
kubectl get ingress -n <namespace>
kubectl describe ingress <ingress-name> -n <namespace>
```

#### 4. Image Pull Errors

Verify image names and tags:
```bash
# Check if images exist
docker pull giovannimirarchi420/reservation-be:latest-postgres
docker pull giovannimirarchi420/reservation-fe:latest
```

### Health Checks

Monitor application health:

```bash
# Check readiness and liveness probes
kubectl get pods -n <namespace> -o wide

# View application metrics (if monitoring is enabled)
kubectl port-forward svc/<service-name> 8080:8080 -n <namespace>
```

## Upgrading

To upgrade your deployment:

```bash
# Pull latest chart changes
git pull origin main

# Upgrade the release
helm upgrade resource-management ./prognose-helm-chart -f your-values.yaml

# Check upgrade status
helm status resource-management
```

## Uninstalling

To remove the deployment:

```bash
# Uninstall the release
helm uninstall resource-management

# Clean up namespace (if needed)
kubectl delete namespace your-namespace
```

## Next Steps

After successful deployment:

1. **Configure Keycloak**: Set up authentication realms and clients
2. **Set up Monitoring**: Deploy monitoring stack for observability  
3. **Configure Webhooks**: Follow the [Webhooks Guide](./webhooks.md) to integrate with external systems
4. **Backup Strategy**: Implement database backup procedures
5. **CI/CD Integration**: Set up automated deployments

For more detailed configuration options, refer to the [Helm chart repository](https://github.com/giovannimirarchi420/prognose-helm-chart) and the complete [setup guide](../complete-setup-guide.md).
