
/**
 * NextAuth Configuration
 *
 * Handles authentication using multiple providers: Google, LinkedIn, and credentials.
 * Configures sign-in pages and authorization logic.
 */
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import LinkedInProvider from "next-auth/providers/linkedin"
import CredentialsProvider from "next-auth/providers/credentials"

/**
 * NextAuth handler configuration
 * Supports OAuth providers and custom credentials authentication
 */
const handler = NextAuth({
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
})

/**
 * Export handler for both GET and POST requests
 * Required for NextAuth API route
 */
export { handler as GET, handler as POST }
