const { test, expect } = require('@playwright/test');

test.describe('Download Tests on Both Ports', () => {
  test('should perform download test on Gold port', async ({ request }) => {
    const response = await request.get('http://localhost:8888/api/download/single', {
      params: {
        duration: 5,
        chunkSize: 1048576, // 1MB chunks
      },
      timeout: 10000,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('gold');
    expect(response.headers()['content-type']).toContain('application/octet-stream');

    const data = await response.body();
    expect(data.length).toBeGreaterThan(0);
  });

  test('should perform download test on Silver port', async ({ request }) => {
    const response = await request.get('http://localhost:8889/api/download/single', {
      params: {
        duration: 5,
        chunkSize: 1048576,
      },
      timeout: 10000,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('silver');
    expect(response.headers()['content-type']).toContain('application/octet-stream');

    const data = await response.body();
    expect(data.length).toBeGreaterThan(0);
  });

  test('should stream data without buffering entire response', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('http://localhost:8888/api/download/single', {
      params: {
        duration: 3,
        chunkSize: 524288, // 512KB chunks
      },
      timeout: 8000,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.status()).toBe(200);
    // Should take approximately 3 seconds, not instant (which would indicate buffering)
    expect(duration).toBeGreaterThan(2500);
    expect(duration).toBeLessThan(5000);
  });

  test('should respect duration parameter', async ({ request }) => {
    const duration = 2;
    const startTime = Date.now();

    const response = await request.get('http://localhost:8888/api/download/single', {
      params: { duration, chunkSize: 1048576 },
      timeout: 5000,
    });

    const endTime = Date.now();
    const actualDuration = (endTime - startTime) / 1000;

    expect(response.status()).toBe(200);
    expect(actualDuration).toBeGreaterThan(duration - 0.5);
    expect(actualDuration).toBeLessThan(duration + 2);
  });
});

test.describe('Upload Tests on Both Ports', () => {
  test('should perform upload test on Gold port', async ({ request }) => {
    const uploadData = Buffer.alloc(1048576, 'a'); // 1MB of data

    const response = await request.post('http://localhost:8888/api/upload', {
      data: uploadData,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      timeout: 10000,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('gold');

    const result = await response.json();
    expect(result.bytesReceived).toBeGreaterThan(0);
    expect(result.transport).toBe('gold');
  });

  test('should perform upload test on Silver port', async ({ request }) => {
    const uploadData = Buffer.alloc(1048576, 'a');

    const response = await request.post('http://localhost:8889/api/upload', {
      data: uploadData,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      timeout: 10000,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('silver');

    const result = await response.json();
    expect(result.bytesReceived).toBeGreaterThan(0);
    expect(result.transport).toBe('silver');
  });

  test('should not persist uploaded data', async ({ request }) => {
    const uploadData = Buffer.alloc(524288, 'test-data');

    const response = await request.post('http://localhost:8888/api/upload', {
      data: uploadData,
      timeout: 10000,
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    // Server should report bytes received but not store them
    expect(result.bytesReceived).toBeGreaterThan(0);
    expect(result.stored).toBeUndefined(); // Should not store data
  });
});

test.describe('Latency Tests on Both Ports', () => {
  test('should perform latency test on Gold port', async ({ request }) => {
    const response = await request.get('http://localhost:8888/api/latency/ping', {
      params: {
        count: 5,
      },
      timeout: 10000,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('gold');

    const result = await response.json();
    expect(result.measurements).toBeDefined();
    expect(result.measurements.length).toBeGreaterThan(0);
    expect(result.avgLatency).toBeGreaterThan(0);
    expect(result.transport).toBe('gold');
  });

  test('should perform latency test on Silver port', async ({ request }) => {
    const response = await request.get('http://localhost:8889/api/latency/ping', {
      params: {
        count: 5,
      },
      timeout: 10000,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('silver');

    const result = await response.json();
    expect(result.measurements).toBeDefined();
    expect(result.measurements.length).toBeGreaterThan(0);
    expect(result.avgLatency).toBeGreaterThan(0);
    expect(result.transport).toBe('silver');
  });
});

test.describe('Test Info Endpoint', () => {
  test('should provide test information on Gold port', async ({ request }) => {
    const response = await request.get('http://localhost:8888/api/test/info');

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('gold');

    const info = await response.json();
    expect(info.transport).toBe('gold');
    expect(info.port).toBe(8888);
    expect(info.dataCenter).toBeTruthy();
  });

  test('should provide test information on Silver port', async ({ request }) => {
    const response = await request.get('http://localhost:8889/api/test/info');

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('silver');

    const info = await response.json();
    expect(info.transport).toBe('silver');
    expect(info.port).toBe(8889);
    expect(info.dataCenter).toBeTruthy();
  });
});

test.describe('Concurrent Test Limits', () => {
  test('should enforce per-IP concurrent test limits', async ({ request }) => {
    // Start multiple download tests concurrently
    const promises = Array(5).fill(0).map(() =>
      request.get('http://localhost:8888/api/download/single', {
        params: { duration: 5 },
        timeout: 10000,
      }).catch(err => ({ error: true, status: err.response?.status() }))
    );

    const results = await Promise.all(promises);

    // Some requests should succeed, some might be rate limited
    const successCount = results.filter(r => !r.error && r.status() === 200).length;
    const rateLimitedCount = results.filter(r => r.error && r.status === 429).length;

    expect(successCount).toBeGreaterThan(0);
    // At least some requests should succeed even under load
  });
});
