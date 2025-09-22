# Frontend Module

## Overview

The frontend module is the user-facing part of the CareerVerve application, built with Next.js. It provides an interactive interface for users to create, edit, and manage resumes and cover letters, including features like live preview, template selection, and internationalization support.

## Usage

- **Development**: Run `npm run dev` from the project root to start the development server. Access the application at `http://localhost:3000`.
- **Navigation**: Use the header navigation to access pages such as profile, resumes, cover-letter, jd-match, settings, and admin.
- **Resume Building**: On the resumes page, use the ResumeBuilder component to input personal details, experience, education, and skills. The LivePreview component shows real-time updates.
- **Templates**: Select from available templates (e.g., Classic, Modern) for resumes and cover letters.
- **Internationalization**: Switch languages using the LanguageSelector component, supporting multiple locales.
- **Settings**: Manage user settings and privacy preferences.

## Technical Details

- **Framework**: Next.js 14 with App Router for server-side rendering and routing.
- **Language**: TypeScript for type safety and better developer experience.
- **UI Library**: React 18 with custom components and Tailwind CSS for responsive styling.
- **State Management**: Zustand for lightweight, scalable state management (e.g., resume data in `frontend/store/resumeStore.ts`).
- **Internationalization**: next-i18next for multi-language support, with locale files in `frontend/i18n/` and `frontend/locales/`.
- **Components Structure**:
  - `frontend/components/ui/`: Reusable UI components like Header, LanguageSelector, SessionProvider.
  - `frontend/features/`: Feature-specific components, e.g., resume builder, cover letter templates.
- **Styling**: Tailwind CSS with PostCSS configuration, avoiding inline CSS for maintainability.
- **Security**: Integrates with NextAuth for session management and security headers via next-safe.

## Critical Components

### ResumeBuilder Component

The ResumeBuilder component is the core of the resume creation functionality, featuring complex state management and dynamic form handling.

**Key Features:**
- **State Management**: Uses Zustand store (`resumeStore.ts`) for centralized resume data management with actions for updating personal info, work experience, education, skills, etc.
- **Dynamic Forms**: Supports locale-based dynamic form fields with optional/required validation. Handles multiple work experience and education entries with add/remove functionality.
- **File Uploads**: Integrates with `/api/upload` for handling photos and certifications with privacy toggles.
- **Comments System**: Inline commenting on form fields with threaded discussions stored via `/api/resumes/[id]/comments`.
- **Validation**: Comprehensive client-side validation with error display, ensuring required fields are filled before PDF generation.
- **PDF Generation**: Exports resume data to PDF via `/api/generate-pdf` with validation checks.
- **Import Functionality**: Imports resume data from PDF using `/api/import-pdf`.
- **Auto-save**: Debounced auto-saving with visual status indicators (saving/saved/error).
- **Internationalization**: Locale-aware rendering using `getLocaleByCode` and context locale fallback.
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support.

**State Complexity:**
- Manages multiple arrays (workExperience, education) with individual item updates.
- Handles optional fields visibility toggles and validation states.
- Tracks comment threads and file upload states.
- Coordinates with backend for real-time data persistence.

### ErrorBoundary Component

The ErrorBoundary component provides robust error handling for the React component tree.

**Key Features:**
- **Error Catching**: Catches JavaScript errors in child components using React's error boundary API.
- **Fallback UI**: Displays user-friendly error messages instead of white screens.
- **Retry Mechanism**: Allows users to retry failed operations with state reset.
- **Development Mode**: Shows detailed error information in development environment.
- **Logging**: Logs errors to console (integrates with backend logger in production).
- **Custom Fallbacks**: Accepts custom fallback components as props for specific error handling.

**Usage:**
```tsx
<ErrorBoundary>
  <ComplexComponent />
</ErrorBoundary>
```

**Error Handling Strategy:**
- Prevents application crashes by isolating component failures.
- Provides graceful degradation with retry options.
- Maintains user experience continuity during unexpected errors.

## Dependencies

### Runtime Dependencies
- `next`: ^14.2.32 - React framework for web applications.
- `react`: ^18 - UI library.
- `react-dom`: ^18 - React DOM rendering.
- `next-i18next`: ^15.4.2 - Internationalization for Next.js.
- `zustand`: ^5.0.8 - State management.
- `react-flags-select`: ^2.5.0 - Country/language flag selector.
- `next-auth`: ^4.24.11 - Authentication (shared with backend).
- `next-safe`: ^3.5.0 - Security headers.

### Development Dependencies
- `typescript`: ^5 - TypeScript compiler.
- `@types/react`: ^18 - Type definitions for React.
- `@types/react-dom`: ^18 - Type definitions for React DOM.
- `tailwindcss`: ^3.4.1 - CSS framework.
- `dotenv`: ^17.2.2 - Environment variable loading.

## Ethical Considerations

When handling user resume data in the frontend:
- **Privacy**: Data is processed client-side where possible to minimize server exposure. User consent is obtained for data storage.
- **Fairness**: The interface is designed to be accessible, with internationalization to support diverse users.
- **Data Minimization**: Only necessary data is collected and displayed; no unnecessary tracking.

## Compliance Notes

- Follows DRY and YAGNI principles in component design.
- Centralized constants and messages in backend/lib/ are referenced where applicable.
- No third-party libraries used unnecessarily; all dependencies are justified for functionality.