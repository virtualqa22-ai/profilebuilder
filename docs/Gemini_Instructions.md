# Gemini's Internal Guide for CareerVerve

This document contains the essential instructions and guidelines for me, Gemini, to follow while developing the CareerVerve application. It is a synthesis of the main prompt, brand guidelines, rule book, and development roadmap.

## 1. Core Objective

My primary goal is to build "CareerVerve," a modern, SaaS, country-specific, ATS-optimized resume and cover letter builder. I will act as a senior product and full-stack engineering team.

## 2. Phased Development

I must follow the phased roadmap and not execute any development without explicit permission from the user.

-   **Phase 1: Skeleton + Persistence (DONE)**
-   **Current Phase:** Awaiting user instruction, likely to start **Phase 2: Resume Builder**.

## 3. Tech Stack

-   **Frontend**: Next.js (React) + TypeScript, TailwindCSS, Shadcn UI
-   **Backend**: Next.js API routes
-   **Database**: MongoDB Atlas (via Mongoose)
-   **Authentication**: NextAuth.js (Google/LinkedIn/email)
-   **State Management**: Zustand or Redux Toolkit
-   **Styling**: TailwindCSS
-   **Testing**: Jest, React Testing Library, Playwright (e2e)
-   **CI/CD**: GitHub Actions to Render

## 4. Brand & UI/UX Guidelines

-   **Logo**: Use `CareerVerve_Logo_Transparent.png`.
-   **Primary Color**: Modern Blue (`#3267E3` or `#2563EB`).
-   **Secondary Color**: Rich Teal (`#17B1A8`) or Emerald (`#2BB572`).
-   **Neutral Colors**: Ivory (`#FAFAFA`), Light Gray (`#F5F7FA`), Dark Charcoal (`#23282D`).
-   **Typography**: Sans-serif (Inter, Lato, Montserrat, or Rubik).
-   **UI Style**: Minimalist, clean, modern, with rounded corners and subtle shadows.
-   **Voice & Tone**: Friendly, direct, and empowering.
-   **General**: All pages must be responsive, cross-browser compatible, and accessible (WCAG 2.1 AA).

## 5. Project Structure & Coding Standards

-   **Structure**: I will adhere to the folder structure defined in `CareerVerve_Rule_Book.md`.
    -   `/src/api`, `/src/components`, `/src/features`, `/src/hooks`, `/src/lib`, `/src/pages`, etc.
-   **Language**: Strict TypeScript.
-   **Components**: Functional components with hooks.
-   **Naming**: `camelCase` for functions/variables, `PascalCase` for components, `I` prefix for interfaces (e.g., `IResume`).
-   **Code Quality**: Enforce ESLint, Prettier. Use `format on save`.
-   **Git Workflow**:
    -   Work on feature branches.
    -   Use atomic commits with semantic prefixes (`feat:`, `fix:`, `docs:`, etc.).
    -   Create Pull Requests for merging to `main`. No direct pushes.

## 6. Key Functional Requirements

-   **Resume Builder**: Dynamic UI, field validation, autosave, versioning.
-   **Live Preview**: Real-time, side-by-side preview with theme switching.
-   **Localization**: Country-specific presets driven by JSON schemas for fields, labels, and validation.
-   **ATS Scoring**: Implement the backend scoring rubric based on keywords, relevance, readability, etc.
-   **JD Matcher**: Extract keywords from job descriptions and score resume match.
-   **Export**: Generate ATS-safe PDFs (selectable text, no images for text). DOCX support is a later phase.
-   **Authentication**: Required only for import/export features.
-   **Security & Privacy**: Input validation, no secrets in code, encrypt sensitive data, GDPR compliance.

## 7. My Process

1.  **Wait for Go-Ahead**: I will not start any phase or task without the user's explicit instruction.
2.  **Clarify**: If a request is ambiguous, I will ask for clarification.
3.  **Plan**: I will create and communicate a clear plan before implementing significant changes.
4.  **Adhere to Rules**: I will strictly follow all guidelines in the project documents and this summary.
5.  **Verify**: I will run linting and tests to verify changes.
