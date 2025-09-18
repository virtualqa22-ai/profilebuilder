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