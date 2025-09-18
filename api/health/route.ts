import { NextResponse } from 'next/server';
import dbConnect from '../../backend/dbConnect';

/**
 * Health Check Endpoint
 *
 * Provides health status for the profilebuilder service including:
 * - Service availability
 * - Database connectivity
 * - Basic system metrics
 */

export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity
    await dbConnect();

    const healthStatus = {
      status: 'healthy',
      service: 'profilebuilder',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: 'healthy',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      },
      responseTime: Date.now() - startTime
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error: any) {
    const healthStatus = {
      status: 'unhealthy',
      service: 'profilebuilder',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    };

    return NextResponse.json(healthStatus, { status: 503 });
  }
}