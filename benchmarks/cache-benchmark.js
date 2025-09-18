/**
 * Caching Performance Benchmarking Script
 *
 * This script benchmarks the multi-level caching system (memory + Redis)
 * by measuring performance of cache operations under various loads.
 *
 * Usage: node benchmarks/cache-benchmark.js
 */

const { performance } = require('perf_hooks');

// Import cache manager (we'll use a test instance)
const { CacheManager } = require('../backend/lib/cacheManager');

// Configuration
const CONCURRENT_OPERATIONS = [1, 5, 10, 25];
const TEST_DURATION = 30000; // 30 seconds per test
const WARMUP_OPERATIONS = 100;

// Test data sizes
const DATA_SIZES = [
  { name: 'Small', data: 'Hello World', size: 11 },
  { name: 'Medium', data: 'A'.repeat(1000), size: 1000 },
  { name: 'Large', data: 'B'.repeat(10000), size: 10000 },
  { name: 'JSON', data: JSON.stringify({ users: Array(100).fill({ id: 1, name: 'Test User', email: 'test@example.com' }) }), size: JSON.stringify({ users: Array(100).fill({ id: 1, name: 'Test User', email: 'test@example.com' }) }).length }
];

// TTL configurations
const TTL_CONFIGS = [
  { name: 'Short', ttl: 60 },    // 1 minute
  { name: 'Medium', ttl: 300 },  // 5 minutes
  { name: 'Long', ttl: 3600 }    // 1 hour
];

// Benchmark results storage
const results = {};

/**
 * Create test cache manager instance
 */
async function createTestCacheManager() {
  const cacheManager = new CacheManager({
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    enableRedis: process.env.CACHE_REDIS_ENABLED !== 'false',
    defaultTTL: 300,
    cleanupIntervalMinutes: 1 // Faster cleanup for testing
  });

  // Wait a bit for Redis connection
  await new Promise(resolve => setTimeout(resolve, 1000));

  return cacheManager;
}

/**
 * Generate test key
 */
function generateTestKey(operation, index, size, ttl) {
  return `benchmark:${operation}:${size.name.toLowerCase()}:${ttl.name.toLowerCase()}:${index}`;
}

/**
 * Warmup cache
 */
async function warmup(cacheManager) {
  console.log('🔥 Running cache warmup...');

  for (let i = 0; i < WARMUP_OPERATIONS; i++) {
    const key = `warmup:${i}`;
    const data = DATA_SIZES[0].data; // Use small data for warmup
    await cacheManager.set(key, data, 60);
    await cacheManager.get(key);
  }

  console.log('✅ Cache warmup completed\n');
}

/**
 * Benchmark SET operations
 */
async function benchmarkSet(cacheManager, concurrency, dataSize, ttlConfig) {
  console.log(`📝 Benchmarking SET operations (${dataSize.name} data, ${ttlConfig.name} TTL) with ${concurrency} concurrency...`);

  const startTime = performance.now();
  let completed = 0;
  let successful = 0;
  let failed = 0;
  const responseTimes = [];
  const errors = [];

  const batchSize = Math.ceil(TEST_DURATION / 100);
  const delay = TEST_DURATION / batchSize;

  const startTimestamp = Date.now();

  while (Date.now() - startTimestamp < TEST_DURATION) {
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      const key = generateTestKey('set', completed + i, dataSize, ttlConfig);
      promises.push(executeSet(cacheManager, key, dataSize.data, ttlConfig.ttl));
    }

    const batchResults = await Promise.all(promises);

    batchResults.forEach(result => {
      completed++;
      if (result.success) {
        successful++;
        responseTimes.push(result.responseTime);
      } else {
        failed++;
        if (result.error) errors.push(result.error);
      }
    });

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const totalTime = performance.now() - startTime;
  const throughput = (completed / totalTime) * 1000;

  return {
    operation: 'SET',
    dataSize: dataSize.name,
    ttl: ttlConfig.name,
    concurrency,
    totalOperations: completed,
    successfulOperations: successful,
    failedOperations: failed,
    throughput: throughput.toFixed(2),
    avgResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2),
    p95: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]?.toFixed(2) || '0',
    errorRate: ((failed / completed) * 100).toFixed(2),
    errors: errors.slice(0, 5)
  };
}

/**
 * Execute set operation
 */
async function executeSet(cacheManager, key, data, ttl) {
  const startTime = performance.now();
  try {
    await cacheManager.set(key, data, ttl);
    const endTime = performance.now();
    return { success: true, responseTime: endTime - startTime };
  } catch (error) {
    const endTime = performance.now();
    return { success: false, responseTime: endTime - startTime, error: error.message };
  }
}

/**
 * Benchmark GET operations
 */
async function benchmarkGet(cacheManager, concurrency, dataSize, ttlConfig) {
  console.log(`📖 Benchmarking GET operations (${dataSize.name} data, ${ttlConfig.name} TTL) with ${concurrency} concurrency...`);

  // First, populate cache with test data
  console.log('   Populating cache for GET benchmark...');
  const populatePromises = [];
  for (let i = 0; i < concurrency * 10; i++) {
    const key = generateTestKey('get', i, dataSize, ttlConfig);
    populatePromises.push(cacheManager.set(key, dataSize.data, ttlConfig.ttl));
  }
  await Promise.all(populatePromises);

  const startTime = performance.now();
  let completed = 0;
  let successful = 0;
  let failed = 0;
  const responseTimes = [];
  const errors = [];

  const batchSize = Math.ceil(TEST_DURATION / 100);
  const delay = TEST_DURATION / batchSize;

  const startTimestamp = Date.now();

  while (Date.now() - startTimestamp < TEST_DURATION) {
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      const key = generateTestKey('get', Math.floor(Math.random() * (concurrency * 10)), dataSize, ttlConfig);
      promises.push(executeGet(cacheManager, key));
    }

    const batchResults = await Promise.all(promises);

    batchResults.forEach(result => {
      completed++;
      if (result.success) {
        successful++;
        responseTimes.push(result.responseTime);
      } else {
        failed++;
        if (result.error) errors.push(result.error);
      }
    });

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const totalTime = performance.now() - startTime;
  const throughput = (completed / totalTime) * 1000;

  return {
    operation: 'GET',
    dataSize: dataSize.name,
    ttl: ttlConfig.name,
    concurrency,
    totalOperations: completed,
    successfulOperations: successful,
    failedOperations: failed,
    throughput: throughput.toFixed(2),
    avgResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2),
    p95: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]?.toFixed(2) || '0',
    errorRate: ((failed / completed) * 100).toFixed(2),
    errors: errors.slice(0, 5)
  };
}

/**
 * Execute get operation
 */
async function executeGet(cacheManager, key) {
  const startTime = performance.now();
  try {
    const result = await cacheManager.get(key);
    const endTime = performance.now();
    return { success: result !== null, responseTime: endTime - startTime };
  } catch (error) {
    const endTime = performance.now();
    return { success: false, responseTime: endTime - startTime, error: error.message };
  }
}

/**
 * Benchmark DELETE operations
 */
async function benchmarkDelete(cacheManager, concurrency, dataSize, ttlConfig) {
  console.log(`🗑️  Benchmarking DELETE operations (${dataSize.name} data, ${ttlConfig.name} TTL) with ${concurrency} concurrency...`);

  // First, populate cache with test data
  console.log('   Populating cache for DELETE benchmark...');
  const populatePromises = [];
  for (let i = 0; i < concurrency * 10; i++) {
    const key = generateTestKey('delete', i, dataSize, ttlConfig);
    populatePromises.push(cacheManager.set(key, dataSize.data, ttlConfig.ttl));
  }
  await Promise.all(populatePromises);

  const startTime = performance.now();
  let completed = 0;
  let successful = 0;
  let failed = 0;
  const responseTimes = [];
  const errors = [];

  const batchSize = Math.ceil(TEST_DURATION / 100);
  const delay = TEST_DURATION / batchSize;

  const startTimestamp = Date.now();

  while (Date.now() - startTimestamp < TEST_DURATION) {
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      const key = generateTestKey('delete', Math.floor(Math.random() * (concurrency * 10)), dataSize, ttlConfig);
      promises.push(executeDelete(cacheManager, key));
    }

    const batchResults = await Promise.all(promises);

    batchResults.forEach(result => {
      completed++;
      if (result.success) {
        successful++;
        responseTimes.push(result.responseTime);
      } else {
        failed++;
        if (result.error) errors.push(result.error);
      }
    });

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const totalTime = performance.now() - startTime;
  const throughput = (completed / totalTime) * 1000;

  return {
    operation: 'DELETE',
    dataSize: dataSize.name,
    ttl: ttlConfig.name,
    concurrency,
    totalOperations: completed,
    successfulOperations: successful,
    failedOperations: failed,
    throughput: throughput.toFixed(2),
    avgResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2),
    p95: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]?.toFixed(2) || '0',
    errorRate: ((failed / completed) * 100).toFixed(2),
    errors: errors.slice(0, 5)
  };
}

/**
 * Execute delete operation
 */
async function executeDelete(cacheManager, key) {
  const startTime = performance.now();
  try {
    const result = await cacheManager.delete(key);
    const endTime = performance.now();
    return { success: result, responseTime: endTime - startTime };
  } catch (error) {
    const endTime = performance.now();
    return { success: false, responseTime: endTime - startTime, error: error.message };
  }
}

/**
 * Benchmark cache hit/miss ratio
 */
async function benchmarkHitMissRatio(cacheManager) {
  console.log('🎯 Benchmarking cache hit/miss ratio...');

  const testKeys = 1000;
  const hitKeys = [];
  const missKeys = [];

  // Populate some keys for hits
  for (let i = 0; i < testKeys / 2; i++) {
    const key = `hitmiss:hit:${i}`;
    await cacheManager.set(key, `data${i}`, 300);
    hitKeys.push(key);
  }

  // Generate miss keys
  for (let i = 0; i < testKeys / 2; i++) {
    missKeys.push(`hitmiss:miss:${i}`);
  }

  let hits = 0;
  let misses = 0;
  const responseTimes = [];
  const startTime = performance.now();

  // Test mixed hits and misses
  for (let i = 0; i < testKeys; i++) {
    const isHit = Math.random() > 0.5;
    const key = isHit ? hitKeys[Math.floor(Math.random() * hitKeys.length)] : missKeys[Math.floor(Math.random() * missKeys.length)];

    const opStart = performance.now();
    const result = await cacheManager.get(key);
    const opEnd = performance.now();

    responseTimes.push(opEnd - opStart);

    if (result !== null) {
      hits++;
    } else {
      misses++;
    }
  }

  const totalTime = performance.now() - startTime;
  const throughput = (testKeys / totalTime) * 1000;

  return {
    operation: 'HIT_MISS_RATIO',
    totalOperations: testKeys,
    hits,
    misses,
    hitRate: ((hits / testKeys) * 100).toFixed(2),
    missRate: ((misses / testKeys) * 100).toFixed(2),
    throughput: throughput.toFixed(2),
    avgResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2),
    p95: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)].toFixed(2)
  };
}

/**
 * Run all cache benchmarks
 */
async function runBenchmarks() {
  console.log('🚀 Starting Cache Performance Benchmarks\n');

  const cacheManager = await createTestCacheManager();

  // Check cache health
  const health = await cacheManager.healthCheck();
  console.log(`Cache Health - Memory: ${health.memory ? '✅' : '❌'}, Redis: ${health.redis ? '✅' : '❌'}\n`);

  await warmup(cacheManager);

  const operations = [
    { name: 'SET', func: benchmarkSet },
    { name: 'GET', func: benchmarkGet },
    { name: 'DELETE', func: benchmarkDelete }
  ];

  for (const op of operations) {
    results[op.name] = {};

    for (const dataSize of DATA_SIZES) {
      for (const ttlConfig of TTL_CONFIGS) {
        for (const concurrency of CONCURRENT_OPERATIONS) {
          const result = await op.func(cacheManager, concurrency, dataSize, ttlConfig);
          const key = `${dataSize.name}_${ttlConfig.name}_${concurrency}`;
          results[op.name][key] = result;

          console.log(`   ✅ Completed: ${result.totalOperations} operations`);
          console.log(`   📈 Throughput: ${result.throughput} ops/sec`);
          console.log(`   ⏱️  Avg Response: ${result.avgResponseTime}ms`);
          console.log(`   📊 P95: ${result.p95}ms`);
          console.log(`   ❌ Error Rate: ${result.errorRate}%\n`);

          // Add delay between tests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  // Run hit/miss ratio test
  console.log('🎯 Running hit/miss ratio benchmark...');
  const hitMissResult = await benchmarkHitMissRatio(cacheManager);
  results['HIT_MISS_RATIO'] = hitMissResult;

  console.log(`   Hit Rate: ${hitMissResult.hitRate}%, Miss Rate: ${hitMissResult.missRate}%`);
  console.log(`   Throughput: ${hitMissResult.throughput} ops/sec\n`);

  printSummary();
  saveResults();

  // Cleanup
  await cacheManager.clear();
  await cacheManager.shutdown();
}

/**
 * Print summary
 */
function printSummary() {
  console.log('📋 CACHE BENCHMARK SUMMARY');
  console.log('='.repeat(80));

  ['SET', 'GET', 'DELETE'].forEach(operation => {
    console.log(`\n🔍 ${operation} Operations`);
    console.log('-'.repeat(40));

    // Show average throughput across all configurations
    const operationResults = Object.values(results[operation]);
    const avgThroughput = operationResults.reduce((sum, result) => sum + parseFloat(result.throughput), 0) / operationResults.length;
    const avgResponseTime = operationResults.reduce((sum, result) => sum + parseFloat(result.avgResponseTime), 0) / operationResults.length;

    console.log(`Average Throughput: ${avgThroughput.toFixed(2)} ops/sec`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  });

  if (results['HIT_MISS_RATIO']) {
    console.log(`\n🎯 Hit/Miss Ratio: ${results['HIT_MISS_RATIO'].hitRate}% hits, ${results['HIT_MISS_RATIO'].missRate}% misses`);
  }

  console.log('\n✅ Cache benchmarks completed successfully!');
}

/**
 * Save results to file
 */
function saveResults() {
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `benchmarks/results/cache-benchmark-${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      concurrentOperations: CONCURRENT_OPERATIONS,
      testDuration: TEST_DURATION,
      warmupOperations: WARMUP_OPERATIONS,
      dataSizes: DATA_SIZES.map(ds => ({ name: ds.name, size: ds.size })),
      ttlConfigs: TTL_CONFIGS
    },
    results
  }, null, 2));

  console.log(`💾 Results saved to ${filename}`);
}

// Run benchmarks if called directly
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

module.exports = { runBenchmarks };