/**
 * Database Operations Performance Benchmarking Script
 *
 * This script benchmarks MongoDB operations for the ProfileBuilder application
 * by measuring performance of CRUD operations under various loads.
 *
 * Usage: node benchmarks/db-benchmark.js
 */

const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/profilebuilder';
const CONCURRENT_OPERATIONS = [1, 5, 10, 25];
const TEST_DURATION = 30000; // 30 seconds per test
const WARMUP_OPERATIONS = 50;

// Sample data for testing
const SAMPLE_RESUMES = [
  {
    title: 'Software Engineer Resume',
    content: JSON.stringify({
      personalInfo: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      summary: 'Experienced software engineer',
      workExperience: [{ company: 'Tech Corp', position: 'Developer' }],
      education: [{ institution: 'University', degree: 'BS CS' }],
      skills: ['JavaScript', 'React', 'Node.js']
    }),
    locale: 'en-US',
    version: 1
  },
  {
    title: 'Data Scientist Resume',
    content: JSON.stringify({
      personalInfo: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      summary: 'Data scientist with ML expertise',
      workExperience: [{ company: 'Data Inc', position: 'Data Scientist' }],
      education: [{ institution: 'Tech University', degree: 'MS Data Science' }],
      skills: ['Python', 'Machine Learning', 'SQL']
    }),
    locale: 'en-US',
    version: 1
  },
  {
    title: 'Product Manager Resume',
    content: JSON.stringify({
      personalInfo: { firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com' },
      summary: 'Product manager with startup experience',
      workExperience: [{ company: 'StartupXYZ', position: 'Product Manager' }],
      education: [{ institution: 'Business School', degree: 'MBA' }],
      skills: ['Product Strategy', 'Agile', 'Analytics']
    }),
    locale: 'en-US',
    version: 1
  }
];

// Benchmark results storage
const results = {};

// Resume schema for benchmarking (simplified, without encryption for testing)
const BenchmarkResumeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  locale: { type: String, required: true },
  version: { type: Number, default: 1 },
  photos: String,
  certifications: String,
  hobbies: String,
  references: String,
}, { timestamps: true });

const BenchmarkResume = mongoose.models.BenchmarkResume || mongoose.model('BenchmarkResume', BenchmarkResumeSchema);

/**
 * Connect to database
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 100, // Allow high concurrency for benchmarking
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Clean up test data
 */
async function cleanup() {
  try {
    await BenchmarkResume.deleteMany({ title: { $regex: /^Benchmark/ } });
    console.log('🧹 Cleaned up test data');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

/**
 * Create operation benchmark
 */
async function benchmarkCreate(concurrency) {
  console.log(`📝 Benchmarking CREATE operations with ${concurrency} concurrency...`);

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
      const sampleData = SAMPLE_RESUMES[Math.floor(Math.random() * SAMPLE_RESUMES.length)];
      const data = {
        ...sampleData,
        title: `Benchmark Resume ${Date.now()}-${i}-${Math.random()}`
      };

      promises.push(executeCreate(data));
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
    operation: 'CREATE',
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
 * Execute create operation
 */
async function executeCreate(data) {
  const startTime = performance.now();
  try {
    await BenchmarkResume.create(data);
    const endTime = performance.now();
    return { success: true, responseTime: endTime - startTime };
  } catch (error) {
    const endTime = performance.now();
    return { success: false, responseTime: endTime - startTime, error: error.message };
  }
}

/**
 * Read operation benchmark
 */
async function benchmarkRead(concurrency) {
  console.log(`📖 Benchmarking READ operations with ${concurrency} concurrency...`);

  // First, ensure we have some data to read
  const existingCount = await BenchmarkResume.countDocuments();
  if (existingCount < 10) {
    console.log('   Creating sample data for read benchmark...');
    for (let i = 0; i < 100; i++) {
      const sampleData = SAMPLE_RESUMES[Math.floor(Math.random() * SAMPLE_RESUMES.length)];
      await BenchmarkResume.create({
        ...sampleData,
        title: `Read Benchmark Resume ${i}`
      });
    }
  }

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
      promises.push(executeRead());
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
    operation: 'READ',
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
 * Execute read operation
 */
async function executeRead() {
  const startTime = performance.now();
  try {
    // Random read - find all and pick one, or find by random criteria
    const count = await BenchmarkResume.countDocuments();
    if (count === 0) {
      await BenchmarkResume.findOne();
    } else {
      const randomIndex = Math.floor(Math.random() * count);
      await BenchmarkResume.findOne().skip(randomIndex);
    }
    const endTime = performance.now();
    return { success: true, responseTime: endTime - startTime };
  } catch (error) {
    const endTime = performance.now();
    return { success: false, responseTime: endTime - startTime, error: error.message };
  }
}

/**
 * Update operation benchmark
 */
async function benchmarkUpdate(concurrency) {
  console.log(`✏️  Benchmarking UPDATE operations with ${concurrency} concurrency...`);

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
      promises.push(executeUpdate());
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
    operation: 'UPDATE',
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
 * Execute update operation
 */
async function executeUpdate() {
  const startTime = performance.now();
  try {
    // Find a random document and update it
    const count = await BenchmarkResume.countDocuments();
    if (count === 0) {
      // Create one if none exist
      await BenchmarkResume.create({
        ...SAMPLE_RESUMES[0],
        title: `Update Benchmark Resume ${Date.now()}`
      });
      const endTime = performance.now();
      return { success: true, responseTime: endTime - startTime };
    }

    const randomIndex = Math.floor(Math.random() * count);
    const doc = await BenchmarkResume.findOne().skip(randomIndex);
    if (doc) {
      await BenchmarkResume.updateOne(
        { _id: doc._id },
        { $set: { version: (doc.version || 1) + 1, updatedAt: new Date() } }
      );
    }
    const endTime = performance.now();
    return { success: true, responseTime: endTime - startTime };
  } catch (error) {
    const endTime = performance.now();
    return { success: false, responseTime: endTime - startTime, error: error.message };
  }
}

/**
 * Delete operation benchmark
 */
async function benchmarkDelete(concurrency) {
  console.log(`🗑️  Benchmarking DELETE operations with ${concurrency} concurrency...`);

  // Ensure we have data to delete
  const existingCount = await BenchmarkResume.countDocuments({ title: { $regex: /^Delete/ } });
  if (existingCount < concurrency * 10) {
    console.log('   Creating sample data for delete benchmark...');
    const createPromises = [];
    for (let i = 0; i < concurrency * 20; i++) {
      const sampleData = SAMPLE_RESUMES[Math.floor(Math.random() * SAMPLE_RESUMES.length)];
      createPromises.push(BenchmarkResume.create({
        ...sampleData,
        title: `Delete Benchmark Resume ${i}-${Date.now()}`
      }));
    }
    await Promise.all(createPromises);
  }

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
      promises.push(executeDelete());
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
async function executeDelete() {
  const startTime = performance.now();
  try {
    // Find and delete a document with "Delete Benchmark" in title
    const doc = await BenchmarkResume.findOne({ title: { $regex: /^Delete/ } });
    if (doc) {
      await BenchmarkResume.deleteOne({ _id: doc._id });
    }
    const endTime = performance.now();
    return { success: true, responseTime: endTime - startTime };
  } catch (error) {
    const endTime = performance.now();
    return { success: false, responseTime: endTime - startTime, error: error.message };
  }
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
  console.log('🚀 Starting Database Operations Performance Benchmarks\n');
  console.log(`MongoDB URI: ${MONGODB_URI}`);
  console.log(`Test Duration: ${TEST_DURATION / 1000} seconds per test\n`);

  await connectDB();
  await cleanup();

  const operations = [
    { name: 'CREATE', func: benchmarkCreate },
    { name: 'READ', func: benchmarkRead },
    { name: 'UPDATE', func: benchmarkUpdate },
    { name: 'DELETE', func: benchmarkDelete }
  ];

  for (const op of operations) {
    results[op.name] = {};

    for (const concurrency of CONCURRENT_OPERATIONS) {
      const result = await op.func(concurrency);
      results[op.name][concurrency] = result;

      console.log(`   ✅ Completed: ${result.totalOperations} operations`);
      console.log(`   📈 Throughput: ${result.throughput} ops/sec`);
      console.log(`   ⏱️  Avg Response: ${result.avgResponseTime}ms`);
      console.log(`   📊 P95: ${result.p95}ms`);
      console.log(`   ❌ Error Rate: ${result.errorRate}%\n`);

      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  printSummary();
  saveResults();
  await cleanup();
  await mongoose.disconnect();
}

/**
 * Print summary
 */
function printSummary() {
  console.log('📋 DATABASE BENCHMARK SUMMARY');
  console.log('='.repeat(80));

  ['CREATE', 'READ', 'UPDATE', 'DELETE'].forEach(operation => {
    console.log(`\n🔍 ${operation} Operations`);
    console.log('-'.repeat(40));

    CONCURRENT_OPERATIONS.forEach(concurrency => {
      const result = results[operation][concurrency];
      if (result) {
        console.log(`Concurrency ${concurrency}: ${result.throughput} ops/sec, ${result.p95}ms P95, ${result.errorRate}% errors`);
      }
    });
  });

  console.log('\n✅ Database benchmarks completed successfully!');
}

/**
 * Save results to file
 */
function saveResults() {
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `benchmarks/results/db-benchmark-${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      mongodbUri: MONGODB_URI,
      concurrentOperations: CONCURRENT_OPERATIONS,
      testDuration: TEST_DURATION,
      warmupOperations: WARMUP_OPERATIONS
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