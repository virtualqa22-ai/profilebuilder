# Developer Experience Guide

This document outlines tools, processes, and best practices to ensure a great developer experience for the ProfileBuilder project.

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git
- VS Code (recommended)

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd profilebuilder

# Install dependencies
npm ci

# Copy environment file
cp .env.example .env.local

# Start development environment
docker-compose up -d

# Start the application
npm run dev
```

### Environment Configuration
Create `.env.local` with the following variables:
```env
MONGODB_URI=mongodb://localhost:27017/profilebuilder
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## Development Workflow

### Daily Development
```bash
# Start development server
npm run dev

# Run tests in watch mode
npm run test -- --watch

# Run linting
npm run lint

# Format code
npm run prettier
```

### Code Quality Checks
```bash
# Type checking
npm run type-check

# Security audit
npm run security:audit

# Full quality check
npm run pre-commit
```

## Tooling and Extensions

### VS Code Extensions (Recommended)
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens
- Docker
- MongoDB for VS Code
- Jest Runner
- Auto Rename Tag
- Bracket Pair Colorizer

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "typescriptreact",
    "javascript": "javascriptreact"
  }
}
```

## Project Structure

### Directory Organization
```
profilebuilder/
├── api/                    # Next.js API routes
├── backend/               # Backend utilities and models
├── frontend/              # Frontend components and pages
├── docs/                  # Documentation
├── tests/                 # Test files
├── k8s/                  # Kubernetes configurations
├── .github/              # GitHub Actions and templates
└── docker-compose.yml    # Local development setup
```

### File Naming Conventions
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Tests: `*.test.ts` or `*.spec.ts`
- API routes: `route.ts`

## Development Scripts

### Available NPM Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prettier": "prettier --write .",
    "test": "jest",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage",
    "type-check": "tsc --noEmit",
    "security:audit": "npm audit --audit-level=moderate",
    "pre-commit": "npm run lint && npm run type-check && npm run security:audit"
  }
}
```

### Custom Scripts for DX
Add these to `package.json` for better DX:
```json
{
  "scripts": {
    "setup": "npm ci && cp .env.example .env.local",
    "dev:full": "docker-compose up -d && npm run dev",
    "clean": "rm -rf .next node_modules/.cache",
    "db:seed": "node scripts/seed.js",
    "db:migrate": "node scripts/migrate.js",
    "storybook": "storybook dev -p 6006",
    "analyze": "ANALYZE=true npm run build"
  }
}
```

## Local Development Environment

### Docker Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/profilebuilder

  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### Database Management
```bash
# Start MongoDB
docker-compose up mongo -d

# Connect to database
mongosh mongodb://localhost:27017/profilebuilder

# Seed database
npm run db:seed
```

## Testing Strategy

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- tests/unit/components/ResumeBuilder.test.tsx

# Run with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run API integration tests
npm run test -- tests/integration

# Run with verbose output
npm run test -- --verbose
```

### End-to-End Tests
```bash
# Run E2E tests
npm run test:e2e

# Run tests in headed mode (visible browser)
npm run test:e2e -- --headed

# Run specific test
npm run test:e2e -- tests/e2e/resume-creation.spec.ts
```

## Debugging

### Frontend Debugging
- Use React Developer Tools
- Enable source maps in development
- Use VS Code debugger with launch configuration

### Backend Debugging
```javascript
// Add debug logging
console.log('Debug:', variable);

// Use debugger statement
debugger;
```

### API Debugging
- Use Postman or Insomnia for API testing
- Check network tab in browser dev tools
- Use Morgan for request logging

## Performance Optimization

### Development Performance
- Use Fast Refresh for React components
- Enable SWC compiler for faster builds
- Use webpack bundle analyzer

### Production Performance
```bash
# Analyze bundle size
npm run analyze

# Check Lighthouse scores
# Use browser dev tools
```

## Code Quality Tools

### Linting and Formatting
- ESLint for code quality
- Prettier for consistent formatting
- Husky for pre-commit hooks

### Static Analysis
- TypeScript for type checking
- SonarQube for code quality metrics
- Dependency vulnerability scanning

## Collaboration Tools

### Code Review
- Use GitHub pull requests
- Follow conventional commit format
- Require at least one approval
- Use review checklists

### Documentation
- Keep README files updated
- Use inline code comments
- Maintain API documentation
- Create video walkthroughs for complex features

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- -p 3001
```

#### Node Modules Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Docker Issues
```bash
# Restart Docker services
docker-compose down
docker-compose up --build
```

#### Database Connection Issues
```bash
# Check MongoDB status
docker-compose ps

# View logs
docker-compose logs mongo

# Reset database
docker-compose down -v
docker-compose up -d
```

## Best Practices

### Code Organization
- Keep components small and focused
- Use custom hooks for shared logic
- Follow atomic design principles
- Maintain consistent file structure

### Performance
- Use React.memo for expensive components
- Implement lazy loading for routes
- Optimize images and assets
- Monitor bundle size

### Security
- Never commit secrets
- Use environment variables
- Validate all inputs
- Keep dependencies updated

### Accessibility
- Use semantic HTML
- Add ARIA labels where needed
- Test with screen readers
- Maintain keyboard navigation

## Continuous Learning

### Resources
- Next.js documentation
- React documentation
- TypeScript handbook
- MDN Web Docs

### Training
- Regular tech talks
- Code review sessions
- Pair programming
- External conferences/webinars

## Support and Help

### Getting Help
- Check existing documentation first
- Search GitHub issues
- Ask in team chat
- Create detailed bug reports

### Escalation
- For urgent issues: tag team lead
- For blocking issues: create high-priority ticket
- For architectural decisions: schedule design review

## Implementation Checklist

- [ ] Set up development environment
- [ ] Configure VS Code and extensions
- [ ] Test all npm scripts
- [ ] Verify Docker setup
- [ ] Run full test suite
- [ ] Review code quality tools
- [ ] Test debugging workflow
- [ ] Document any custom processes