# Configuration Management

This document outlines the configuration management practices for the ProfileBuilder microservices application, following 12-factor app principles and ensuring secure, scalable configuration across all environments.

## Overview

Configuration management follows the principle of storing configuration in the environment, separating code from configuration to enable portability and security across development, staging, and production environments.

## Configuration Principles

### 12-Factor App Compliance
- **Codebase**: Single codebase tracked in version control
- **Dependencies**: Explicitly declared and isolated dependencies
- **Config**: Store configuration in environment variables
- **Backing Services**: Treat backing services as attached resources
- **Build, Release, Run**: Strictly separate build and run stages
- **Processes**: Execute applications as one or more stateless processes
- **Port Binding**: Export services via port binding
- **Concurrency**: Scale out via process model
- **Disposability**: Maximize robustness with fast startup and graceful shutdown
- **Dev/Prod Parity**: Keep development, staging, and production as similar as possible
- **Logs**: Treat logs as event streams
- **Admin Processes**: Run admin/management tasks as one-off processes

### Security-First Configuration
- **Secrets Management**: Never store secrets in code or version control
- **Environment Segregation**: Separate configurations for each environment
- **Access Control**: Least privilege access to configuration data
- **Audit Trails**: Track all configuration changes

## Configuration Types

### Environment Variables
All configuration is managed through environment variables, injected at runtime:

#### Application Configuration
```bash
# Service Identification
SERVICE_NAME=user-management
SERVICE_VERSION=1.0.0

# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb://user:pass@host:port/db
MONGODB_SSL=true
MONGODB_REPLICA_SET=rs0

# External Service URLs
AI_PROCESSING_URL=http://ai-processing:3000
RESUME_MANAGEMENT_URL=http://resume-management:3000
DOCUMENT_GENERATION_URL=http://document-generation:3000
FILE_UPLOAD_URL=http://file-upload:3000
```

#### Security Configuration
```bash
# JWT Configuration
JWT_SECRET=<vault-injected>
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# OAuth Configuration
GOOGLE_CLIENT_ID=<vault-injected>
GOOGLE_CLIENT_SECRET=<vault-injected>
LINKEDIN_CLIENT_ID=<vault-injected>
LINKEDIN_CLIENT_SECRET=<vault-injected>

# Encryption Keys
ENCRYPTION_KEY=<vault-injected>
AES_KEY=<vault-injected>
```

#### Feature Flags and Toggles
```bash
# Feature Flags
AI_PROCESSING_ENABLED=true
DOCUMENT_GENERATION_ENABLED=true
AD_SERVING_ENABLED=false

# Experimental Features
EXPERIMENTAL_UI_ENABLED=false
BETA_AI_FEATURES=false
```

### Service-Specific Configuration

#### User Management Service
```bash
# Authentication
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600000
MAX_LOGIN_ATTEMPTS=5

# Privacy Compliance
DATA_RETENTION_DAYS=2555
CONSENT_AUDIT_ENABLED=true
GDPR_COMPLIANCE_MODE=true
```

#### AI Processing Service
```bash
# AI Model Configuration
OPENAI_API_KEY=<vault-injected>
ANTHROPIC_API_KEY=<vault-injected>
MODEL_TEMPERATURE=0.7
MAX_TOKENS=2048

# Safety and Limits
MAX_PROMPT_LENGTH=10000
SAFETY_FILTER_ENABLED=true
CONTENT_MODERATION=true
RATE_LIMIT_PER_MINUTE=60
```

#### Resume Management Service
```bash
# Document Processing
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=pdf,docx,txt
DOCUMENT_RETENTION_DAYS=365

# Template Configuration
DEFAULT_TEMPLATE=modern
TEMPLATE_CACHE_TTL=3600
```

## Secrets Management

### HashiCorp Vault Integration
- **Centralized Storage**: All secrets stored in Vault with versioning
- **Dynamic Secrets**: Database credentials generated on-demand
- **Access Policies**: Role-based access control for secrets
- **Audit Logging**: Complete audit trail of secret access

### Secret Injection Methods
- **Kubernetes Secrets**: Mounted as environment variables
- **Vault Agent**: Sidecar injection for dynamic secrets
- **Init Containers**: Secret retrieval before application startup
- **Environment Variables**: Direct injection at pod creation

### Secret Rotation
- **Automated Rotation**: Database passwords rotated every 30 days
- **Application Keys**: JWT secrets rotated every 90 days
- **Certificate Management**: TLS certificates auto-renewed via cert-manager
- **Zero Downtime**: Rolling updates during secret rotation

## Environment Management

### Development Environment
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
      - MONGODB_URI=mongodb://mongo:27017/profilebuilder_dev
    env_file:
      - .env.development
```

### Staging Environment
- Mirror production configuration
- Use production-like data sets
- Enable additional logging and monitoring
- Test all integrations and external services

### Production Environment
- Immutable infrastructure
- Configuration as code via Helm
- Secrets injected via Vault
- Configuration validation at deployment time

## Configuration Validation

### Schema Validation
- **JSON Schema**: Validate configuration structure
- **Type Checking**: Ensure correct data types
- **Required Fields**: Validate mandatory configuration
- **Dependency Checks**: Verify service dependencies are configured

### Runtime Validation
- **Startup Checks**: Validate configuration on application boot
- **Health Checks**: Include configuration validation in health endpoints
- **Dependency Validation**: Test connections to required services
- **Configuration Drift Detection**: Monitor for configuration changes

## Configuration as Code

### Helm Charts
```yaml
# values.yaml
service:
  name: user-management
  port: 3000
  replicas: 3

config:
  mongodb:
    uri: ${MONGODB_URI}
  jwt:
    secret: ${JWT_SECRET}
  features:
    ai: true
    audit: true

secrets:
  jwtSecret: vault:secret/jwt#secret
  dbPassword: vault:secret/database#password
```

### Kustomize Overlays
```yaml
# kustomization.yaml
bases:
  - ../../base

patchesStrategicMerge:
  - config-patch.yaml

configMapGenerator:
  - name: app-config
    literals:
      - ENVIRONMENT=production
      - LOG_LEVEL=warn
```

## Configuration Deployment

### GitOps Workflow
1. **Configuration Changes**: Made via pull requests
2. **Automated Testing**: Configuration validation in CI
3. **ArgoCD Sync**: Automated deployment of configuration changes
4. **Rollbacks**: Version-controlled configuration rollbacks

### Deployment Strategies
- **Blue-Green**: Configuration changes deployed to inactive environment
- **Canary**: Gradual rollout with configuration validation
- **Rolling Updates**: Zero-downtime configuration updates
- **Feature Flags**: Runtime configuration changes without redeployment

## Monitoring and Alerting

### Configuration Drift Detection
- **Config Audits**: Regular scans for configuration drift
- **Compliance Checks**: Ensure configurations meet security policies
- **Change Tracking**: Log all configuration modifications
- **Anomaly Detection**: Alert on unexpected configuration changes

### Performance Monitoring
- **Configuration Load Times**: Monitor environment variable loading
- **Memory Usage**: Track configuration object memory consumption
- **Cache Hit Rates**: Monitor configuration caching effectiveness
- **Error Rates**: Alert on configuration-related failures

## Backup and Recovery

### Configuration Backups
- **Version Control**: All configuration changes tracked in Git
- **Helm Release History**: Maintain release history for rollbacks
- **Vault Backups**: Encrypted backups of all secrets
- **Disaster Recovery**: Cross-region configuration replication

### Recovery Procedures
- **Configuration Restore**: Automated restoration from backups
- **Secret Recovery**: Emergency procedures for secret access
- **Environment Reconstruction**: Automated environment rebuilding
- **Business Continuity**: Configuration available during outages

## Security Considerations

### Access Control
- **Principle of Least Privilege**: Minimal access to configuration systems
- **Role-Based Access**: Different permissions for different roles
- **Multi-Factor Authentication**: Required for configuration access
- **Network Security**: Configuration systems behind firewalls

### Encryption
- **Data at Rest**: All configuration encrypted in storage
- **Data in Transit**: TLS encryption for configuration access
- **Key Management**: Secure key storage and rotation
- **Cryptographic Agility**: Support for multiple encryption algorithms

## Compliance and Audit

### Regulatory Compliance
- **GDPR**: Data processing configuration auditable
- **SOX**: Change management and audit trails
- **PCI DSS**: Secure handling of payment-related configuration
- **ISO 27001**: Information security management for configuration

### Audit Trails
- **Change Logs**: Complete history of configuration changes
- **Access Logs**: Who accessed what configuration when
- **Approval Workflows**: Required approvals for sensitive changes
- **Retention Policies**: Long-term retention of audit logs

## Best Practices

### Development
- **Local Configuration**: Use `.env` files for local development
- **Configuration Templates**: Provide configuration examples
- **Documentation**: Document all configuration options
- **Validation**: Validate configuration early in development

### Operations
- **Immutable Config**: Treat configuration as immutable
- **Version Pinning**: Pin dependency versions explicitly
- **Testing**: Test configuration changes thoroughly
- **Monitoring**: Monitor configuration impact on performance

### Security
- **Secret Scanning**: Scan for accidental secret commits
- **Access Reviews**: Regular review of configuration access
- **Vulnerability Management**: Keep configuration tools updated
- **Incident Response**: Include configuration in security incidents

## Troubleshooting

### Common Issues
- **Missing Environment Variables**: Startup failures due to missing config
- **Invalid Configuration**: Schema validation errors
- **Secret Access Denied**: Vault permission issues
- **Configuration Drift**: Environment differences causing issues

### Debugging Tools
- **Configuration Dumps**: Safe logging of non-sensitive config
- **Health Endpoints**: Include configuration status in health checks
- **Debug Mode**: Additional logging for configuration issues
- **Validation Tools**: Command-line configuration validators

## Future Enhancements

- **Configuration Service**: Centralized configuration service for dynamic updates
- **Policy as Code**: Automated policy enforcement for configuration
- **AI-Assisted Configuration**: ML-based configuration optimization
- **Multi-Cloud Support**: Consistent configuration across cloud providers

## Ethical Considerations

- **Privacy Protection**: Configuration prevents accidental data exposure
- **User Consent**: Configuration controls respect user privacy preferences
- **Fairness**: Consistent configuration ensures equal service quality
- **Transparency**: Configuration practices are documented and auditable