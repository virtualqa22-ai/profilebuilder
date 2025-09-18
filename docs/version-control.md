# Version Control and Branching Strategy

This document outlines the version control practices and branching strategy for the ProfileBuilder project, following Git Flow methodology and semantic versioning principles.

## Branching Strategy

We use Git Flow branching model with the following branches:

### Main Branches
- `main` - Production-ready code, always deployable
- `develop` - Integration branch for features, latest development changes

### Supporting Branches
- `feature/*` - Feature branches for new functionality
- `release/*` - Release preparation branches
- `hotfix/*` - Emergency fixes for production issues

### Branch Naming Convention
- Features: `feature/description-of-feature`
- Releases: `release/v1.2.3`
- Hotfixes: `hotfix/critical-bug-fix`

## Workflow

### Feature Development
1. Create feature branch from `develop`
2. Develop and test feature
3. Create pull request to `develop`
4. After review and CI passes, merge to `develop`

### Release Process
1. Create release branch from `develop`
2. Final testing and bug fixes
3. Merge to `main` and tag with version
4. Deploy to production

### Hotfix Process
1. Create hotfix branch from `main`
2. Fix critical issue
3. Merge to both `main` and `develop`
4. Tag with patch version

## Semantic Versioning

We follow [Semantic Versioning](https://semver.org/) (SemVer) with the format `MAJOR.MINOR.PATCH`:

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

## Conventional Commits

All commits must follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```
feat: add user authentication
fix: resolve memory leak in PDF generation
docs: update API documentation
```

## Pre-commit Hooks

Pre-commit hooks are configured using Husky to ensure:
- Code linting passes
- Type checking passes
- Security audit runs
- Tests pass (if applicable)

## Release Automation

We use semantic-release for automated versioning and changelog generation based on conventional commits.

### Release Types
- **Major**: Breaking changes (`BREAKING CHANGE` footer)
- **Minor**: New features (`feat` commits)
- **Patch**: Bug fixes (`fix` commits)

## Pull Request Guidelines

### Requirements for Merging
- [ ] All CI checks pass
- [ ] Code review approved
- [ ] Tests added/updated if needed
- [ ] Documentation updated if needed
- [ ] Conventional commit format used

### PR Template
Use the following template for pull requests:

```
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
```

## Branch Protection

### Main Branch
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Include administrators in restrictions

### Develop Branch
- Require pull request reviews
- Require status checks to pass
- Allow force pushes (for maintainers only)

## Version Tagging

Tags follow the pattern `vMAJOR.MINOR.PATCH`:
- `v1.0.0` - Initial release
- `v1.1.0` - New features
- `v1.1.1` - Bug fixes

Tags are created automatically by semantic-release or manually for hotfixes.