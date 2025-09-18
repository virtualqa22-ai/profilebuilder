import { NextResponse } from 'next/server';
import { register, updateMemoryMetrics } from '../../backend/lib/metrics';

/**
 * Metrics Endpoint
 *
 * Exposes Prometheus-compatible metrics for monitoring.
 * Includes HTTP requests, database queries, AI operations, and system metrics.
 */

export async function GET() {
  try {
    // Update memory metrics before exposing
    updateMemoryMetrics();

    // Get metrics in Prometheus format
    const metrics = await register.metrics();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': register.contentType,
      },
    });
  } catch (error: any) {
    console.error('Error generating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}