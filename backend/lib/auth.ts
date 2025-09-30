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
// Validate required NextAuth environment variables
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

if (!NEXTAUTH_SECRET) {
  throw new Error(
    'Please define the NEXTAUTH_SECRET environment variable inside .env.local'
  );
}

if (!NEXTAUTH_URL) {
  throw new Error(
    'Please define the NEXTAUTH_URL environment variable inside .env.local'
  );
}

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
  ],
  /**
   * Custom pages configuration
   * Overrides default sign-in page location
   */
  pages: {
    signIn: "/auth/signin",
   /**
    * Callbacks for customizing JWT and session handling
    * Ensures proper session population with user data
    */
   callbacks: {
     async jwt({ token, user }) {
       // Add user ID to token on sign in
       if (user) {
         token.id = user.id;
       }
       return token;
     },
     async session({ session, token }) {
       // Populate session with user ID from token
       if (token?.id) {
         session.user.id = token.id;
       }
       return session;
     },
   },
  },
};

/**
 * Authentication middleware function
 * Checks for valid NextAuth session and returns session data or error response
 *
 * @param request - The incoming request object
 * @returns NextResponse if unauthorized, session object if authenticated
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | any> {
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

    // Session is valid, return session data
    return session;
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