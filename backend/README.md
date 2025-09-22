# Backend Module

## Overview

The backend module contains the server-side logic for the CareerVerve application, including data models, utility functions, middleware, and services. It handles database interactions, data validation, error handling, and security measures to support the API routes and frontend functionality.

## Usage

- **Database Connection**: Use `backend/dbConnect.ts` to establish MongoDB connections.
- **Models**: Define and interact with data schemas in `backend/models/` (e.g., User.ts, Resume.ts).
- **Libraries**: Access centralized utilities in `backend/lib/` for validations, messages, constants, API endpoints, error handling, and resume parsing.
- **Middleware**: Apply security and other middleware from `backend/middleware/`.
- **Services**: Utilize locale and language services for internationalization.

## Technical Details

- **Language**: TypeScript for type safety.
- **Database**: MongoDB with Mongoose ODM for schema definition and data operations.
- **Encryption**: mongoose-encryption for encrypting sensitive fields in the database.
- **Security**: Helmet for setting security headers, express-rate-limit for API rate limiting, and custom security middleware.
- **Error Handling**: Standardized error handling with structured error objects in `backend/lib/errorHandler.ts`.
- **Validation**: Centralized input validations in `backend/lib/validations.ts`.
- **Internationalization**: Locale services in `backend/lib/localeService.ts` and data in `backend/data/locales.json`.
- **Resume Parsing**: Utility for parsing resume data in `backend/lib/resumeParser.ts`.
- **Centralized Files**: Constants, messages, API endpoints, and validations are centralized for DRY compliance.

## Database Models

The backend uses MongoDB with Mongoose ODM for data modeling. All models include proper indexing, encryption for sensitive fields, and compliance features.

- **User**: Stores user authentication data and privacy preferences. Fields: email (unique), name (optional), privacyMode (boolean for cloud storage opt-in).
- **Resume**: Manages resume content with encryption for sensitive data. Includes versioning, comments, and optional fields like photos, certifications, hobbies, references. Automatic encryption/decryption for content fields.
- **SecurityEvent**: Append-only immutable log for security events. Tracks event types, severity, correlation IDs, encrypted IP/user agent data. Prevents updates/deletes for compliance.
- **ConsentRecord**: Manages GDPR consent records with encrypted audit data. Tracks consent purposes, status changes, and expiration. Immutable once granted.
- **AuditLog**: Immutable audit trail for all data processing activities. Logs actions on resources with encrypted IP/user agent. Append-only for forensic integrity.
- **ErasureRequest**: Tracks GDPR right-to-erasure requests. Manages request lifecycle with unique IDs, status tracking, and 30-day completion windows.

## Library Utilities

Centralized utilities provide reusable functionality across the backend:

- **aiSecurity.ts**: AI-specific security measures and prompt injection protection.
- **apiEndpoints.ts**: Centralized API endpoint definitions for consistency.
- **cacheManager.ts**: Caching layer for performance optimization (see `backend/lib/README-caching.md`).
- **constants.ts**: Application-wide constants and enumerations.
- **databaseManager.ts**: Database connection and query utilities.
- **encryption.ts**: AES-256 encryption/decryption for sensitive data using environment-based keys.
- **errorHandler.ts**: Standardized error handling with structured error objects and codes.
- **locale.tsx**: React component for locale handling.
- **localeService.ts**: Internationalization services and locale data management.
- **logger.ts**: Centralized logging with correlation IDs for request tracing.
- **messages.ts**: Centralized error and success messages for consistency.
- **metrics.ts**: Performance metrics collection compatible with Prometheus/Grafana.
- **privacyCompliance.ts**: GDPR compliance utilities and data processing validations.
- **resumeParser.ts**: Resume data parsing and validation utilities.
- **securityLogger.ts**: Security event logging (see `backend/lib/README-security-logging.md`).
- **validations.ts**: Input validation functions and schemas.
- **withHelmet.ts**: Security middleware wrapper using Helmet for HTTP headers.

## Dependencies

### Runtime Dependencies
- `mongoose`: ^8.18.0 - MongoDB object modeling.
- `mongoose-encryption`: ^2.1.2 - Field-level encryption for MongoDB documents.
- `crypto-js`: ^4.2.0 - Cryptographic functions.
- `helmet`: ^8.1.0 - Security middleware for HTTP headers.
- `express-rate-limit`: ^8.1.0 - Rate limiting middleware.
- `cors`: ^2.8.5 - Cross-origin resource sharing.
- `@whatwg-node/fetch`: ^0.10.10 - Fetch API polyfill.

### Development Dependencies
- `@types/node`: ^20 - Type definitions for Node.js.

## Ethical Considerations

When handling sensitive resume data in the backend:
- **Privacy**: Data is encrypted at rest using mongoose-encryption. Access is controlled via authentication and authorization.
- **Fairness**: Validations ensure consistent data handling without bias; locale services support multiple languages for inclusivity.
- **Data Minimization**: Only necessary data is stored; unnecessary fields are avoided.

## Compliance Notes

- Follows DB-first approach with schema definitions prioritized.
- Implements standardized error codes and messages for consistency.
- Security-first with input validation and least privilege access.
- No hardcoded secrets; uses environment variables for configuration.