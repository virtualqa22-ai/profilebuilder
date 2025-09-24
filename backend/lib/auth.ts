/**
 * Authentication utilities for NextAuth session validation
 *
 * Provides reusable authentication middleware for API routes
 * Ensures consistent session checking across protected endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import LinkedInProvider from 'next-auth/providers/linkedin';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * NextAuth configuration options
 * Centralized auth configuration for consistent session management
 */
export const authOptions = {
  providers: [
    /**
     * Google OAuth provider
     * Uses environment variables for client credentials
     */
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    /**
     * LinkedIn OAuth provider
     * Uses environment variables for client credentials
     */
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID as string,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET as string,
    }),
    /**
     * Credentials provider for email/password authentication
     * Uses secure password hashing and database lookup
     * Note: Implement proper password hashing (e.g., bcrypt) in production
     */
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // Validate input
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // TODO: Replace with actual database lookup
          // Example implementation:
          // const user = await User.findOne({ email: credentials.email });
          // if (user && await bcrypt.compare(credentials.password, user.passwordHash)) {
          //   return { id: user._id.toString(), name: user.name, email: user.email };
          // }

          // Placeholder - remove in production
          console.warn('Credentials provider is using placeholder authentication. Implement proper user lookup.');
          return null;
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  /**
   * Custom pages configuration
   * Overrides default sign-in page location
   */
  pages: {
    signIn: "/auth/signin",
  },
};

/**
 * Authentication middleware function
 * Checks for valid NextAuth session and returns appropriate error response for unauthenticated requests
 *
 * @param request - The incoming request object
 * @returns NextResponse if unauthorized, null if authenticated
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  try {
    // Get server session using NextAuth options
    const session = await getServerSession(authOptions);

    // Check if session exists and is valid
    if (!session || !session.user) {
      // Return unauthorized response with consistent error format
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        },
        {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer',
          }
        }
      );
    }

    // Session is valid, allow request to proceed
    return null;
  } catch (error) {
    console.error('Authentication middleware error:', error);

    // Return internal server error for auth failures
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication service unavailable',
        code: 'AUTH_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * NextAuth handler instance
 * Exported for use in auth route
 */
export const authHandler = NextAuth(authOptions);