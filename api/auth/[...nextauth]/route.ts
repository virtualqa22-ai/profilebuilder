/**
 * NextAuth Configuration
 *
 * Handles authentication using multiple providers: Google, LinkedIn, and credentials.
 * Uses shared authentication configuration for consistency.
 */

import { authHandler } from '../../../backend/lib/auth';

/**
 * Export handler for both GET and POST requests
 * Required for NextAuth API route
 */
export { authHandler as GET, authHandler as POST }
