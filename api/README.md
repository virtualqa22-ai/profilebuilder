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