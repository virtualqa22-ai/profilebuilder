# API Module

## Overview

The API module contains Next.js API routes that handle server-side requests for the CareerVerve application. It provides endpoints for authentication, resume and cover letter management, file uploads, job description parsing, and user data operations, integrating with the backend libraries for data processing and validation.

## Usage

- **Authentication**: Use `/api/auth/[...nextauth]` for NextAuth.js integration (login, logout, session management).
- **Resumes**: CRUD operations via `/api/resumes` and `/api/resumes/[id]`, including comments at `/api/resumes/[id]/comments`.
- **Cover Letters**: Generate and manage cover letters at `/api/cover-letter` and PDF generation at `/api/generate-cover-letter-pdf`.
- **Uploads**: Handle file uploads at `/api/upload`.
- **Job Description Parsing**: Parse JD data at `/api/jd-parser`.
- **Locales**: Retrieve locale data at `/api/locales` and `/api/locales/[locale]`.
- **User Data**: Access user-specific data at `/api/user/data`, settings at `/api/user/settings`, and deletion at `/api/user/delete`.

## Technical Details

- **Framework**: Next.js API routes with TypeScript.
- **Authentication**: NextAuth.js for secure session management.
- **File Handling**: Supports PDF uploads and generation using Puppeteer for rendering and pdfjs-dist for parsing.
- **Data Processing**: Leverages backend libraries for validations, error handling, and database operations.
- **Rate Limiting**: Applied via express-rate-limit to prevent abuse.
- **Security**: Input validation, CORS handling, and security headers from backend middleware.
- **Testing**: Includes unit and integration tests with Jest and Supertest.

## API Endpoints

The API provides RESTful endpoints for resume management, file operations, and system monitoring. All endpoints include security headers and follow consistent error response formats.

### Health Check
- **GET /api/health**
  - **Description**: Comprehensive health check for service availability, database connectivity, and system metrics.
  - **Response**: JSON with status, uptime, memory usage, and database health.
  - **Status Codes**: 200 (healthy), 500 (unhealthy).

### Authentication
- **GET/POST /api/auth/[...nextauth]**
  - **Description**: NextAuth.js integration for user authentication (login, logout, session management).
  - **Methods**: Handled by NextAuth.js configuration.

### Resume Management
- **GET /api/resumes**
  - **Description**: Retrieve paginated list of resumes with optional filtering by locale.
  - **Query Parameters**: page, limit, locale, sortBy, sortOrder, includeContent.
  - **Response**: JSON with resume data array and pagination metadata.
- **POST /api/resumes**
  - **Description**: Create a new resume with validation based on locale schema.
  - **Body**: Resume data including locale, title, content, work experience, education, etc.
  - **Response**: Created resume object.
  - **Status Codes**: 201 (created), 400 (validation error).
- **GET /api/resumes/[id]**
  - **Description**: Retrieve a specific resume by ID.
  - **Query Parameters**: includeContent (default true).
  - **Response**: Resume object.
  - **Status Codes**: 200 (success), 404 (not found).
- **PUT /api/resumes/[id]**
  - **Description**: Update an existing resume with version increment.
  - **Body**: Updated resume data.
  - **Response**: Updated resume object.
  - **Status Codes**: 200 (success), 400 (validation error), 404 (not found).
- **DELETE /api/resumes/[id]**
  - **Description**: Delete a resume by ID.
  - **Response**: Success confirmation.
  - **Status Codes**: 200 (success), 404 (not found).

### Comments
- **GET/POST /api/resumes/[id]/comments**
  - **Description**: Manage comments on resume fields.
  - **Methods**: GET (retrieve comments), POST (add comment).
  - **Body (POST)**: field, text, author.

### File Operations
- **POST /api/upload**
  - **Description**: Upload files (images, PDFs) with validation and sanitization.
  - **Body**: FormData with file.
  - **Validation**: File size (5MB max), type (images/PDFs), security checks.
  - **Response**: File URL.
  - **Status Codes**: 200 (success), 400 (validation error).
- **POST /api/generate-pdf**
  - **Description**: Generate PDF from resume data using Puppeteer.
  - **Body**: Resume data object.
  - **Response**: PDF blob with attachment headers.
  - **Status Codes**: 200 (success), 400 (error).
- **POST /api/import-pdf**
  - **Description**: Parse PDF and extract resume data.
  - **Body**: FormData with PDF file.
  - **Response**: Extracted resume data.
- **POST /api/generate-cover-letter-pdf**
  - **Description**: Generate PDF cover letter.
- **POST /api/generate-cover-letter-docx**
  - **Description**: Generate DOCX cover letter.

### Job Description Processing
- **POST /api/jd-parser**
  - **Description**: Parse job description text for matching analysis.
  - **Body**: Job description text.
  - **Response**: Parsed job requirements.

### Cover Letters
- **GET/POST /api/cover-letter**
  - **Description**: Generate and manage cover letters.

### Localization
- **GET /api/locales**
  - **Description**: Retrieve available locales.
- **GET /api/locales/[locale]**
  - **Description**: Get specific locale configuration.

### User Management
- **GET /api/user/data**
  - **Description**: Retrieve user-specific data.
- **GET/PUT /api/user/settings**
  - **Description**: Manage user settings and privacy preferences.
- **POST /api/user/delete**
  - **Description**: Handle user data deletion requests.

### Metrics
- **GET /api/metrics**
  - **Description**: Expose application metrics for monitoring.

## Dependencies

### Runtime Dependencies
- `next`: ^14.2.32 - Framework for API routes.
- `next-auth`: ^4.24.11 - Authentication library.
- `puppeteer`: ^24.17.1 - Headless browser for PDF generation.
- `pdfjs-dist`: ^5.4.149 - PDF parsing library.
- `express-rate-limit`: ^8.1.0 - Rate limiting.
- `cors`: ^2.8.5 - CORS middleware.

### Development Dependencies
- `supertest`: ^7.1.4 - HTTP endpoint testing.
- `jest`: ^30.1.3 - Testing framework.
- `@testing-library/jest-dom`: ^6.8.0 - Jest DOM testing utilities.

## Ethical Considerations

When handling sensitive data via APIs:
- **Privacy**: All data transmission is over HTTPS; sensitive fields are encrypted. User consent is required for data processing.
- **Fairness**: APIs are designed to be neutral, with no discriminatory logic; supports multiple locales for inclusivity.
- **Data Minimization**: Endpoints collect only necessary data; unnecessary parameters are rejected.

## Compliance Notes

- API-first design with documented endpoints in `backend/lib/apiEndpoints.ts`.
- Versioned APIs for backward compatibility (current version implicit in routes).
- Standardized error responses using backend error handler.
- Contract testing ensures frontend-backend alignment.