CareerVerve Rule Book: Tech Stack, Structure & Standards

#Tech Stack & Hosting
Frontend: Next.js (React) with TypeScript, TailwindCSS, Shadcn UI
Backend API: Next.js API routes (recommended for simplicity on Render), or separate Express service on Render if scaling required
Database: MongoDB Atlas Shared Free Cluster, Mongoose ORM
Auth: NextAuth.js (email + OAuth [Google/LinkedIn]), JWT session handling
State Management: Zustand or Redux Toolkit
CI/CD: GitHub Actions auto-deploy to Render, lint/test pre-merge
Testing: Jest, React Testing Library, Playwright (e2e)
I18n: next-i18next for country-specific resume formats
Storage: Cloudinary/other free storage for resume exports if needed

# Project/Folder Structure

/profilebuilder
├── /public                # Static assets (logos, icons, fonts)
│   ├── /images
│   ├── /icons
│   └── /fonts
├── /src
│   ├── /api               # Backend API routes (Next.js API or Nest services)
│   ├── /components        # Reusable UI components
│   ├── /features          # Feature modules (resume, ats, auth, user, admin)
│   ├── /hooks             # Custom React hooks
│   ├── /layouts           # App layouts (dashboard/editor)
│   ├── /lib               # Utility libs (scoring, parsing)
│   ├── /pages             # Next.js routes
│   ├── /services          # Business logic (e.g., resume.service.ts)
│   ├── /store             # State management (Zustand/Redux)
│   ├── /styles            # Tailwind, globals, themes
│   ├── /types             # Shared/global TypeScript types/interfaces
│   ├── /utils             # Utility functions (validators, formatting)
│   └── app.tsx            # App entry point if using Next Router
├── .env                   # Environment variables (not committed)
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── README.md

# Coding Standards
Language: TypeScript in strict mode for all files and logic.
Components: Functional components only, utilize hooks.
Imports Order: Native/Next.js, Third-party, Absolute, Relative, Styles.

Naming Conventions:
camelCase for variables/functions
PascalCase for components/classes
ALL_CAPS for constants
snake_case for DB fields
Prefix interfaces with “I” (e.g., IResume)

# Feature & Folder Best Practices
/features/resume: Builder, templates, export, locale integration
/features/ats: Scoring algorithms, job description parser
/features/auth: All authentication logic (NextAuth/JWT/OAuth)
/features/user: Profile, settings, saved resumes
/features/admin: Locale rule/config editor, synonym map

# Quality, Testing & Accessibility
Linting: ESLint (with airbnb or recommended config), Prettier, Husky pre-commit

Testing:
Jest for unit tests
React Testing Library for components
Playwright/Cypress for e2e flows
Maintain ≥80% test coverage. Test all business logic and UI flows.

Accessibility: Achieve WCAG 2.1 AA; keyboard navigation everywhere, ARIA labels on UI, color contrast checks.
SEO: Optimize meta tags, structured data for all public pages.

# Internationalization & Localization
Internationalization via next-i18next, country formats/fields fetched per user selection.
Locale JSONs for all country templates, with fallback/defaults.

# Security, Privacy, Data & Compliance
Inputs validated server- and client-side.
Use environment variables (.env, never commit secrets).
All user data encrypted in transit (HTTPS) and critical info encrypted at rest (MongoDB Atlas).
GDPR-ready: endpoints for user data download and deletion.
Logs redact sensitive information, no PII in error traces.

# Dev & IDE Setup
Standardize on VSCode with ESLint, Prettier, Tailwind IntelliSense, i18n Ally.
Enable “format on save”.
Use path aliases via tsconfig.json.
Environment variables managed in .env.local, validated with Zod at runtime.

# Git, CI/CD & Collaboration
All work via feature branches and pull requests; no direct pushes to main/master.
CI (GitHub Actions): build, lint, test, deploy per PR and merge.
Descriptive, small, atomic commits. Use semantic prefixes (feat:, fix:, chore:, docs:).
Keep code DRY & modular, avoid magic strings—always use constants.
Refactor duplicated code into utils or shared libs.

# Performance, Optimization & Maintenance
Lazy load major components/pages, optimize images, and code-split for speed.
Lighthouse audit scores should be >90 for all major flows.
Regularly update dependencies, run npm audit weekly.
Ensure all PDF/DOCX exports are ATS-safe: text, never rasterized or image-based.
Monitor MongoDB/Render free tier limits, optimize cache/queries for cost control.

# Error Handling & User Experience
Use try/catch everywhere in async logic, always provide user-friendly error toasts/messages.
Allow users to download, restore, and revert resume versions.
Never display raw errors or stack traces to the user.
