import helmet from 'helmet';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest } from 'next/server';

// For Next.js 13/14 app directory API routes (Edge or Node):
// This is a wrapper for Node.js (not Edge) handlers only.
export function withHelmet(handler: (req: any, res: any) => any) {
  return async function (req: NextApiRequest, res: NextApiResponse) {
    // helmet is an express middleware, so we call it manually
    await new Promise((resolve, reject) => {
      helmet()(req as any, res as any, (err: any) => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });
    return handler(req, res);
  };
}

// Usage in API route:
// export default withHelmet(async function handler(req, res) { ... });
