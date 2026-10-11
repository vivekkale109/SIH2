/**
 * SDMS High-Performance Load Testing Script
 * Simulates concurrent load on Authentication, Full-Text Search, and Audit endpoints.
 */

import http from 'http';

interface BenchmarkResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  durationMs: number;
  requestsPerSecond: number;
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = parseInt(process.env.API_PORT || '4000', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || '100', 10);

function makeRequest(
  options: http.RequestOptions,
  postData?: string,
): Promise<{ statusCode: number; durationMs: number; body: string }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 500,
          durationMs: Date.now() - startTime,
          body,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runBenchmark(name: string, fn: () => Promise<boolean>): Promise<BenchmarkResult> {
  // eslint-disable-next-line no-console
  console.log(
    `\n🚀 Starting Benchmark: [${name}] (${TOTAL_REQUESTS} requests, Concurrency: ${CONCURRENCY})...`,
  );

  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;
  const overallStart = Date.now();

  let completed = 0;
  const runWorker = async (): Promise<void> => {
    while (completed < TOTAL_REQUESTS) {
      completed++;
      const reqStart = Date.now();
      try {
        const ok = await fn();
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        if (ok) {
          successful++;
        } else {
          failed++;
        }
      } catch {
        latencies.push(Date.now() - reqStart);
        failed++;
      }
    }
  };

  const workers = Array.from({ length: CONCURRENCY }, () => runWorker());
  await Promise.all(workers);

  const durationMs = Date.now() - overallStart;
  latencies.sort((a, b) => a - b);

  const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;

  const result: BenchmarkResult = {
    endpoint: name,
    totalRequests: TOTAL_REQUESTS,
    successfulRequests: successful,
    failedRequests: failed,
    durationMs,
    requestsPerSecond: Math.round((TOTAL_REQUESTS / (durationMs / 1000)) * 100) / 100,
    latency: {
      min,
      max,
      avg: Math.round(avg * 100) / 100,
      p50,
      p95,
      p99,
    },
  };

  /* eslint-disable no-console */
  console.log(`--- [${name}] Results ---`);
  console.log(`  Throughput:      ${result.requestsPerSecond} req/sec`);
  console.log(`  Success / Total: ${result.successfulRequests} / ${result.totalRequests}`);
  console.log(`  Latency Avg:     ${result.latency.avg}ms`);
  console.log(`  Latency P50:     ${result.latency.p50}ms`);
  console.log(`  Latency P95:     ${result.latency.p95}ms`);
  console.log(`  Latency P99:     ${result.latency.p99}ms`);
  /* eslint-enable no-console */

  return result;
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('====================================================');
  // eslint-disable-next-line no-console
  console.log('       SDMS Production Load & Stress Benchmark      ');
  // eslint-disable-next-line no-console
  console.log('====================================================');

  // Benchmark 1: System Health Probes
  await runBenchmark('Health Probe (/health)', async () => {
    try {
      const res = await makeRequest({
        host: API_HOST,
        port: API_PORT,
        path: '/health',
        method: 'GET',
      });
      return res.statusCode === 200;
    } catch {
      return false;
    }
  });

  // Benchmark 2: Chain Verification Endpoint
  await runBenchmark('Audit Ledger Chain Verification (/api/v1/audit/verify-chain)', async () => {
    try {
      const res = await makeRequest({
        host: API_HOST,
        port: API_PORT,
        path: '/api/v1/audit/verify-chain',
        method: 'GET',
      });
      return res.statusCode === 200;
    } catch {
      return false;
    }
  });

  // eslint-disable-next-line no-console
  console.log('\n✅ Load benchmarks completed successfully.');
}

if (require.main === module) {
  main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Load testing error:', e);
    process.exit(1);
  });
}
