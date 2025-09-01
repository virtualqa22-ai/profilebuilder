You are a senior product + full-stack engineer team. Build a production-ready web app:

# APP NAME
“CareerVerve — ATS-Optimized Resume Builder”

# OBJECTIVE
Develop CareerVerve, a modern, SaaS, country-specific resume and cover letter builder platform. The application must offer dynamic, locale-compliant resume building, ATS score checking, JD matching, live previews, and collaborative editing—deployed on Render (frontend + backend) with MongoDB Atlas and fully free-hosted (within tier limits).

# PRIMARY USERS
- Job seekers (early, mid, senior)
- Recruiters creating templates at scale

# PLATFORMS
- Web app (responsive) with PWA support

# Technical Specifications
- Frontend: Next.js (React) + TypeScript, TailwindCSS, Shadcn UI
- Backend: Next.js API routes (or Express if scaling is needed), TypeScript, Mongoose for MongoDB Atlas
- Database: MongoDB Atlas shared cluster (free)
- Auth: NextAuth.js (supporting OAuth, JWT sessions), user required only for import/export
- State Management: Zustand or Redux Toolkit
- I18n: next-i18next; JSON locale schemas for all resume fields/validations
- CI/CD: GitHub Actions (build, lint, test, deploy to Render)
- Storage: Cloudinary or similar for file exports if non-PDF assets are needed

# Core Features
1. Skeleton + Persistence:
   Set up Next.js project, apply code standards (ESLint, Prettier, Jest, Husky), lint/test workflows, and CRUD for locales/resumes with MongoDB Atlas.

2. Resume Builder:
   Full dynamic resume UI, field validation, autosave/versioning, PDF export (ATS-safe, never rasterized). Prepare for multi-locale support.

3. Live Preview & Real-Time Editor:
   Instant, side-by-side preview with theme switching; real-time update of layout/content.

4. Country Presets & Localization:
   Locale-driven field order, labeling, formatting, and schema validation from JSON configs. UI locale selector.

5. Import/Export & ATS Compliance (PDF only):
   Resume PDF import and parsing (convert to schema); ATS-safe PDF export with versioning.

6. JD Match MVP:
   Simple (non-AI) keyword extraction and job description–resume match scoring.

7. Templates, Accessibility, Collaboration:
   Multiple resume templates, full WCAG 2.1 AA accessibility, and real-time commenting/suggestion mode.

8. Expanded Options & Locale Customization:
   Optional resume fields (photo, certifications, etc.) per country, dynamic show/hide and schema validation.

9. Auth Module, Profiles, & Home/Menu:
   Auth with NextAuth.js (Google/LinkedIn/email); user required only for import/export. Implement home & global menu (Resume Builder, ATS Checker, JD Match, Cover Letter Builder)

10. Cover Letter Builder:
    Guided, template-driven creation with JD tailoring and ATS-safe PDF/DOCX export.

11. Privacy, Compliance, Security:
    Field encryption, GDPR tooling, local/test privacy mode, security headers/CORS/rate limiting, and no PII in logs.

12. DOCX Advanced Import/Export:
    Advanced parsing of DOCX (tables, bullets), full round-trip editing, maintain ATS compliance.

13. Free Monetization & Ad Handling (Optional):
    Admob integration, adblock detection (fallback UI), and impression/event analytics.

14. AI Assist + Real-Time Linting:
    Integrate LLM-based suggestions (content rewrite, grammar, quantification tips) with secure API key management.

15. Performance, Quality, CI/CD, Maintenance:
    Bundle optimization, code splitting, caching, virtualized rendering for previews, test coverage ≥80%, Lighthouse >90.

# Non-Functional & Brand Requirements
- Adhere to the CareerVerve Brand Kit:  
  - Modern Blue (#3267E3/#2563EB), Rich Teal/Emerald, neutral backgrounds, golden yellow/coral accents  
  - Inter, Lato, Montserrat or Rubik/Arial, clear typography
  - Custom icon set, friendly/supportive tone, minimalism, responsive/mobile-first design
- All screens/pages are cross-platform, cross-browser, fully responsive, and optimized for accessibility and SEO.
- All exports (PDF/DOCX) are ATS compatible: plain text, never rasterized or image-based.

# Code Standards & DevOps
- Use strict TypeScript and functional React with hooks.
- Adopt DRY, modular, atomic design for all modules.
- Enforce ESLint, Prettier, Husky, with autoformat on save and pre-commit.
- CI/CD auto-deploys via GitHub Actions to Render; all env secrets set via dashboard.
- All code, issues, and commits follow detailed rules in the CareerVerve Rule Book.

# ATS SCORING RUBRIC (compute in backend; expose breakdown)
- Keyword Coverage (40%):
  • Must-have skills: 20% (exact or stemmed match)
  • Should-have skills: 12%
  • Nice-to-have: 8%
- Relevance (20%):
  • Title/seniority alignment, years experience fit, domain terms.
- Readability/Structure (15%):
  • Single-column, standard section labels, consistent dates, bullet length 8–20 words, no images for text.
- Quantification & Impact (10%):
  • %/x/$ metrics detected across bullets.
- Formatting & Parse-ability (10%):
  • Embedded text (PDF), fonts standard, no headers/footers traps, list markers recognized.
- Locale Compliance (5%):
  • Required fields present; no disallowed elements (e.g., photos where discouraged).
Score formula example:
score = 0.4*keyword + 0.2*relevance + 0.15*readability + 0.1*impact + 0.1*format + 0.05*locale
Return per-dimension subscores and actionable tips.

# JD PARSER / MATCHER
- Extract: title, seniority, location, skills (cluster synonyms), tools, must/should/nice buckets (via keyword rules + simple ML).
- Provide n-gram and stemming; maintain a configurable synonym map (e.g., “React” ↔ “React.js”, “Node” ↔ “Node.js/Express”, “ML” ↔ “Machine Learning”).
- Red-flag detection: skills not present; missing certifications; visa/work rights (locale-specific).

# LOCALE RULESETS (implement as JSON so content team can tweak without code deploy)
- For each locale, define:
  {
    "requiredFields": [...],
    "sectionOrder": [...],
    "dateFormat": "MMM yyyy" | "yyyy/MM",
    "allowPhoto": true|false,
    "labelMap": {"experience":"Work Experience", ...},
    "maxPages": 1|2|3
  }

# UI/UX REQUIREMENTS
- Clean editor with left panel (sections), right panel (First Section: ATS insights, Second Section: Live Preview).
- Template gallery with “ATS-Safe” badge.
- Locale switcher updates preview + export instantly.
- Undo/redo, autosave, offline support via IndexedDB.
- Tooltips and example bullet generator (“achieved X by doing Y measured by Z”).

# EXPORT QUALITY
- Ensure selectable text PDFs (no rasterization).
- DOCX with semantic styles (Heading 1, List Bullet).
- Include machine-readable JSON with export for programmatic use.

# MONETIZATION
- Free to use with Ads
- Login/Sign up for import/export only
- Signup and login only after watching ad

# TESTING & ACCEPTANCE
- Unit/e2e tests for scoring, JD parsing, locale rules.
- Golden JDs (5 per locale) and sample resumes must reach ≥90 ATS score when optimized.
- Accessibility tests (axe) must pass; Lighthouse ≥90 performance.

# DELIVERABLES
- Running app + README + infra-as-code
- Sample data for all locales
- Admin UI to edit locale rules and synonym maps
- API docs (OpenAPI) and JSON schema published

# NON-NEGOTIABLES
- Security: input validation, rate limiting, secure headers.
- Privacy by default: photo OFF in all locales; explicit user toggle where allowed.
- No third-party ATS APIs hard dependency; local scoring works offline. Optional external connectors behind env flags.

# Stretch Goals (if time)
- Multi-language resumes (EU priority)
- One-click tailoring per JD
- LinkedIn/GitHub import
- Other country specific presets

DO NOT START DEVELOPMENT UNTIL I EXPLICITLY TOLD YOU.