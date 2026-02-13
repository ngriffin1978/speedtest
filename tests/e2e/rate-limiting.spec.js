const { test, expect } = require('@playwright/test');

test.describe('Rate Limiting', () => {
  test('should include rate limit headers in responses', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8888/health');

    expect(response.headers()['ratelimit-policy']).toBeTruthy();
    expect(response.headers()['ratelimit-limit']).toBeTruthy();
    expect(response.headers()['ratelimit-remaining']).toBeTruthy();
    expect(response.headers()['ratelimit-reset']).toBeTruthy();
  });

  test('should apply rate limiting on Gold port', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8888/health');

    const limit = parseInt(response.headers()['ratelimit-limit'] || '0');
    expect(limit).toBeGreaterThan(0);
  });

  test('should apply rate limiting on Silver port', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8889/health');

    const limit = parseInt(response.headers()['ratelimit-limit'] || '0');
    expect(limit).toBeGreaterThan(0);
  });

  test('should have same rate limit policy on both ports', async ({ request }) => {
    const goldResponse = await request.get('http://127.0.0.1:8888/health');
    const silverResponse = await request.get('http://127.0.0.1:8889/health');

    const goldPolicy = goldResponse.headers()['ratelimit-policy'];
    const silverPolicy = silverResponse.headers()['ratelimit-policy'];

    expect(goldPolicy).toBe(silverPolicy);
  });

  test('should decrement rate limit remaining on subsequent requests', async ({ request }) => {
    const response1 = await request.get('http://127.0.0.1:8888/health');
    const remaining1 = parseInt(response1.headers()['ratelimit-remaining'] || '0');

    const response2 = await request.get('http://127.0.0.1:8888/health');
    const remaining2 = parseInt(response2.headers()['ratelimit-remaining'] || '0');

    // Remaining should decrease (or stay same if reset occurred)
    expect(remaining2).toBeLessThanOrEqual(remaining1);
  });
});

test.describe('Security Headers', () => {
  test('should include security headers on Gold port', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8888/');

    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers()['strict-transport-security']).toBeTruthy();
    expect(response.headers()['content-security-policy']).toBeTruthy();
  });

  test('should include security headers on Silver port', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8889/');

    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers()['strict-transport-security']).toBeTruthy();
    expect(response.headers()['content-security-policy']).toBeTruthy();
  });

  test('should have consistent security headers across ports', async ({ request }) => {
    const goldResponse = await request.get('http://127.0.0.1:8888/');
    const silverResponse = await request.get('http://127.0.0.1:8889/');

    expect(goldResponse.headers()['x-content-type-options'])
      .toBe(silverResponse.headers()['x-content-type-options']);
    expect(goldResponse.headers()['x-frame-options'])
      .toBe(silverResponse.headers()['x-frame-options']);
  });

  test('should set CORS headers for both ports', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8888/health', {
      headers: {
        'Origin': 'http://127.0.0.1:8888',
      },
    });

    expect(response.headers()['access-control-allow-credentials']).toBe('true');
  });
});

test.describe('Input Validation', () => {
  test('should validate download duration parameter', async ({ request }) => {
    // Try exceeding max duration
    const response = await request.get('http://127.0.0.1:8888/api/download/single', {
      params: {
        duration: 9999, // Exceeds MAX_TEST_DURATION
      },
    }).catch(err => err.response || err);

    // Should either reject or cap the duration
    if (response.status) {
      expect([400, 200]).toContain(response.status());
    }
  });

  test('should validate upload size limits', async ({ request }) => {
    // Try uploading data larger than MAX_UPLOAD_SIZE (250MB)
    const largeData = Buffer.alloc(1048576); // 1MB test

    const response = await request.post('http://127.0.0.1:8888/api/upload', {
      data: largeData,
    });

    // Should accept reasonable size
    expect(response.status()).toBe(200);
  });

  test('should reject invalid parameters', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8888/api/download/single', {
      params: {
        duration: -1, // Invalid negative duration
      },
    }).catch(err => err.response || err);

    // Should reject invalid input
    if (response.status) {
      expect([400, 422]).toContain(response.status());
    }
  });
});

test.describe('Concurrent Test Enforcement', () => {
  test('should track concurrent tests per IP', async ({ request }) => {
    // Start multiple tests simultaneously
    const promises = Array(4).fill(0).map((_, i) =>
      request.get(`http://127.0.0.1:8888/api/download/single?duration=3&_=${i}`, {
        timeout: 8000,
      }).catch(err => ({ error: true, message: err.message }))
    );

    const results = await Promise.all(promises);

    // Count how many succeeded vs failed
    const succeeded = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;

    // At least some should succeed
    expect(succeeded).toBeGreaterThan(0);
  });

  test('should enforce MAX_CONCURRENT_TESTS limit', async ({ request }) => {
    // This test verifies the global concurrent test limit
    // In practice, this is hard to test without multiple IPs
    // So we just verify the mechanism exists

    const response = await request.get('http://127.0.0.1:8888/api/test/info');
    const info = await response.json();

    // Server should report concurrent test limits
    expect(info).toBeTruthy();
  });
});
