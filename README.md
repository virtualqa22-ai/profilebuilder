# CareerVerve

A comprehensive resume and cover letter builder application powered by AI, designed to help users create professional documents with ease.

## Overview

CareerVerve is a full-stack web application built with Next.js, providing tools for resume creation, cover letter generation, job description parsing, and user profile management. It features a modern React frontend, robust backend APIs, and comprehensive testing suites.

## Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB instance
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd profilebuilder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
    - Copy `.env.example` to `.env.local`
    - Configure MongoDB connection string
    - Set NextAuth secret and OAuth providers
    - Configure security-related variables (JWT secrets, encryption keys)
    - Set up API keys for external services
    - **Security Note**: Never commit actual secrets to version control

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

### Testing

- Run unit and integration tests: `npm test`
- Run end-to-end tests: `npm run test:e2e`
### Performance Benchmarking

CareerVerve includes comprehensive performance benchmarking to ensure consistent high performance and detect regressions. See [benchmarks/README.md](benchmarks/README.md) for detailed documentation.

#### Running Benchmarks

```bash
# API endpoint benchmarks
npm run test:performance:api

# Database operation benchmarks
npm run test:performance:db

# Cache performance benchmarks
npm run test:performance:cache

# Load testing scenarios
npm run test:load:all
```

#### Performance SLAs

The application adheres to defined performance SLAs including:
- API response times (P95 < 1s for most endpoints)
- Error rates (< 5% for 5xx errors)
- System availability (99.5% uptime)
- Resource utilization limits

See [benchmarks/performance-slas.md](benchmarks/performance-slas.md) for complete SLA definitions.

#### Monitoring and Alerting

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Performance dashboards and visualization
- **Automated Alerts**: Performance regression detection and SLA violations

Start monitoring stack: `cd monitoring && docker-compose up -d`

## Architecture Summary

CareerVerve currently follows a monolithic architecture using Next.js for unified frontend and backend development. See [docs/architecture-overview.md](docs/architecture-overview.md) for detailed current structure and future microservices migration plan.

- **Frontend**: React components with TypeScript, Tailwind CSS, and internationalization.
- **Backend**: API routes with Mongoose models, centralized utilities, and security middleware.
- **Database**: MongoDB with encrypted sensitive fields.
- **Authentication**: NextAuth.js for secure user sessions.

## Security & Compliance

This project implements comprehensive security measures and adheres to industry best practices as outlined in [docs/security.md](docs/security.md).

### Security Features

- **Input Validation & Sanitization**: XSS and SQL injection prevention
- **Authentication & Authorization**: Secure OAuth integration with NextAuth.js
- **Rate Limiting**: API, authentication, and upload endpoint protection
- **Security Headers**: CSP, HSTS, X-Frame-Options, and more
- **Data Privacy**: GDPR-compliant consent management and data portability
- **AI Security**: Prompt injection and data poisoning protection
- **Dependency Scanning**: Automated vulnerability detection in CI/CD

### Compliance

The project follows guidelines from [docs/CareerVerve_Rule_Book.md](docs/CareerVerve_Rule_Book.md) and kilo-global-rules.md, including:

- API-first design with documented endpoints
- Comprehensive testing with >80% coverage
- Security-first principles with input validation and secrets management
- Regular code reviews and CI/CD integration
- Ethical AI practices with human oversight
- Regulatory compliance for data privacy

## Ethical Considerations

CareerVerve handles sensitive resume data with the highest ethical standards:

- **Privacy**: Data is encrypted at rest and in transit. User consent is required for all data processing. Minimal data collection follows data minimization principles.
- **Fairness**: Algorithms and interfaces are designed to be inclusive and unbiased, supporting multiple languages and cultures.
- **Transparency**: Users have control over their data with clear privacy settings and deletion options.
- **Security**: Robust access controls prevent unauthorized data access. Regular audits ensure compliance with privacy regulations.

For more details, see [docs/agent-capabilities.md](docs/agent-capabilities.md) regarding AI agent oversight.

## Project Structure

- `frontend/`: React components and pages
- `backend/`: Models, utilities, middleware, and security modules
  - `lib/`: Core utilities (validations, privacy compliance, AI security)
  - `middleware/`: Security middleware (rate limiting, CORS, headers)
  - `models/`: Database models with encryption
- `api/`: Next.js API routes with authentication
- `tests/`: Unit, integration, and e2e tests
- `docs/`: Documentation including security guidelines
- `.github/workflows/`: CI/CD pipelines with security scanning

## Contributing

1. Follow the coding standards in kilo-global-rules.md
2. Ensure tests pass and coverage is maintained
3. Submit pull requests with clear descriptions
4. All changes undergo code review

## License

[Specify license if applicable]