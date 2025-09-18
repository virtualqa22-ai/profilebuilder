/**
 * API Endpoint Performance Benchmarking Script
 *
 * This script benchmarks the performance of ProfileBuilder API endpoints
 * by measuring response times, throughput, and error rates under various loads.
 *
 * Usage: node benchmarks/api-benchmark.js
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENT_REQUESTS = [1, 10, 50, 100];
const TEST_DURATION = 30000; // 30 seconds per test
const WARMUP_REQUESTS = 10;

// API endpoints to benchmark
const ENDPOINTS = [
  { path: '/api/health', method: 'GET', name: 'Health Check' },
  { path: '/api/resumes', method: 'GET', name: 'Get Resumes' },
  { path: '/api/locales', method: 'GET', name: 'Get Locales' },
  { path: '/api/metrics', method: 'GET', name: 'Get Metrics' }
];

// Sample data for POST requests (if needed)
const SAMPLE_RESUME = {
  locale: 'en-US',
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123'
  },
  summary: 'Experienced software engineer with 5+ years in web development.',
  workExperience: [{
    company: 'Tech Corp',
    position: 'Senior Developer',
    startDate: '2020-01-01',
    endDate: '2023-12-31',
    description: 'Developed web applications using React and Node.js.'
  }],
  education: [{
    institution: 'University of Technology',
    degree: 'Bachelor of Science',
    field: 'Computer Science',
    graduationYear: 2019
  }],
  skills: ['JavaScript', 'React', 'Node.js', 'Python']
};

// Benchmark results storage
const results = {};

/**
 * Make HTTP request and measure response time
 */
function makeRequest(endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ProfileBuilder-Benchmark/1.0'
      }
    };

    const startTime = performance.now();
    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        resolve({
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 300,
          body: body.length
        });
      });
    });

    req.on('error', (err) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      resolve({
        statusCode: null,
        responseTime,
        success: false,
        error: err.message
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.setTimeout(10000, () => {
      req.abort();
      resolve({
        statusCode: null,
        responseTime: 10000,
        success: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

/**
 * Run warmup requests
 */
async function warmup() {
  console.log('🔥 Running warmup requests...');
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    await makeRequest(ENDPOINTS[0]); // Use health check for warmup
  }
  console.log('✅ Warmup completed\n');
}

/**
 * Run benchmark for specific endpoint and concurrency
 */
async function benchmarkEndpoint(endpoint, concurrency) {
  console.log(`📊 Benchmarking ${endpoint.name} with ${concurrency} concurrent requests...`);

  const startTime = performance.now();
  let completed = 0;
  let successful = 0;
  let failed = 0;
  const responseTimes = [];
  const errors = [];

  // Create concurrent requests
  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(runConcurrentRequests(endpoint, concurrency));
  }

  // Wait for all concurrent batches to complete
  const batchResults = await Promise.all(promises);

  // Aggregate results
  batchResults.forEach(batch => {
    completed += batch.completed;
    successful += batch.successful;
    failed += batch.failed;
    responseTimes.push(...batch.responseTimes);
    errors.push(...batch.errors);
  });

  const totalTime = performance.now() - startTime;
  const throughput = (completed / totalTime) * 1000; // requests per second

  // Calculate percentiles
  responseTimes.sort((a, b) => a - b);
  const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;

  const result = {
    endpoint: endpoint.name,
    concurrency,
    totalRequests: completed,
    successfulRequests: successful,
    failedRequests: failed,
    throughput: throughput.toFixed(2),
    avgResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2),
    p50: p50.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
    errorRate: ((failed / completed) * 100).toFixed(2),
    errors: errors.slice(0, 5) // Show first 5 errors
  };

  console.log(`   ✅ Completed: ${completed} requests`);
  console.log(`   📈 Throughput: ${result.throughput} req/sec`);
  console.log(`   ⏱️  Avg Response: ${result.avgResponseTime}ms`);
  console.log(`   📊 P95: ${result.p95}ms, P99: ${result.p99}ms`);
  console.log(`   ❌ Error Rate: ${result.errorRate}%\n`);

  return result;
}

/**
 * Run concurrent requests for a batch
 */
async function runConcurrentRequests(endpoint, totalConcurrency) {
  const batchSize = Math.ceil(TEST_DURATION / 100); // Requests per batch
  const delay = TEST_DURATION / batchSize; // Delay between batches

  let completed = 0;
  let successful = 0;
  let failed = 0;
  const responseTimes = [];
  const errors = [];

  const startTime = Date.now();

  while (Date.now() - startTime < TEST_DURATION) {
    const promises = [];
    for (let i = 0; i < totalConcurrency; i++) {
      promises.push(makeRequest(endpoint));
    }

    const results = await Promise.all(promises);

    results.forEach(result => {
      completed++;
      if (result.success) {
        successful++;
        responseTimes.push(result.responseTime);
      } else {
        failed++;
        if (result.error) errors.push(result.error);
      }
    });

    // Small delay to prevent overwhelming
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return { completed, successful, failed, responseTimes, errors };
}

/**
 * Main benchmark function
 */
async function runBenchmarks() {
  console.log('🚀 Starting ProfileBuilder API Performance Benchmarks\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Duration: ${TEST_DURATION / 1000} seconds per test\n`);

  try {
    await warmup();

    for (const endpoint of ENDPOINTS) {
      results[endpoint.name] = {};

      for (const concurrency of CONCURRENT_REQUESTS) {
        const result = await benchmarkEndpoint(endpoint, concurrency);
        results[endpoint.name][concurrency] = result;

        // Add small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    printSummary();
    saveResults();

  } catch (error) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

/**
 * Print summary of results
 */
function printSummary() {
  console.log('📋 BENCHMARK SUMMARY');
  console.log('='.repeat(80));

  ENDPOINTS.forEach(endpoint => {
    console.log(`\n🔍 ${endpoint.name}`);
    console.log('-'.repeat(40));

    CONCURRENT_REQUESTS.forEach(concurrency => {
      const result = results[endpoint.name][concurrency];
      if (result) {
        console.log(`Concurrency ${concurrency}: ${result.throughput} req/sec, ${result.p95}ms P95, ${result.errorRate}% errors`);
      }
    });
  });

  console.log('\n✅ Benchmarks completed successfully!');
}

/**
 * Save results to file
 */
function saveResults() {
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `benchmarks/results/api-benchmark-${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: BASE_URL,
      concurrentRequests: CONCURRENT_REQUESTS,
      testDuration: TEST_DURATION,
      warmupRequests: WARMUP_REQUESTS
    },
    results
  }, null, 2));

  console.log(`💾 Results saved to ${filename}`);
}

// Run benchmarks if called directly
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

module.exports = { runBenchmarks, makeRequest };