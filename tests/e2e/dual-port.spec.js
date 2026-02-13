const { test, expect } = require('@playwright/test');

test.describe('Dual Port Architecture', () => {
  test('should detect Gold transport on port 8888', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8888/health');

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('gold');
    expect(response.headers()['x-transport-port']).toBe('8888');
    expect(response.headers()['x-data-center']).toBeTruthy();
  });

  test('should detect Silver transport on port 8889', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8889/health');

    expect(response.status()).toBe(200);
    expect(response.headers()['x-transport-type']).toBe('silver');
    expect(response.headers()['x-transport-port']).toBe('8889');
    expect(response.headers()['x-data-center']).toBeTruthy();
  });

  test('should return different transport types for same endpoint on different ports', async ({ request }) => {
    const goldResponse = await request.get('http://127.0.0.1:8888/api/test/info');
    const silverResponse = await request.get('http://127.0.0.1:8889/api/test/info');

    expect(goldResponse.headers()['x-transport-type']).toBe('gold');
    expect(silverResponse.headers()['x-transport-type']).toBe('silver');
  });

  test('should include transport headers in all responses', async ({ request }) => {
    const endpoints = ['/health', '/api/test/info', '/'];

    for (const endpoint of endpoints) {
      const goldResponse = await request.get(`http://127.0.0.1:8888${endpoint}`);
      const silverResponse = await request.get(`http://127.0.0.1:8889${endpoint}`);

      expect(goldResponse.headers()['x-transport-type']).toBe('gold');
      expect(silverResponse.headers()['x-transport-type']).toBe('silver');
    }
  });

  test('should have consistent data center ID across both ports', async ({ request }) => {
    const goldResponse = await request.get('http://127.0.0.1:8888/health');
    const silverResponse = await request.get('http://127.0.0.1:8889/health');

    const goldDC = goldResponse.headers()['x-data-center'];
    const silverDC = silverResponse.headers()['x-data-center'];

    expect(goldDC).toBeTruthy();
    expect(silverDC).toBeTruthy();
    expect(goldDC).toBe(silverDC);
  });

  test('should handle concurrent requests to both ports', async ({ request }) => {
    const promises = [
      request.get('http://127.0.0.1:8888/health'),
      request.get('http://127.0.0.1:8889/health'),
      request.get('http://127.0.0.1:8888/api/test/info'),
      request.get('http://127.0.0.1:8889/api/test/info'),
    ];

    const responses = await Promise.all(promises);

    expect(responses[0].headers()['x-transport-type']).toBe('gold');
    expect(responses[1].headers()['x-transport-type']).toBe('silver');
    expect(responses[2].headers()['x-transport-type']).toBe('gold');
    expect(responses[3].headers()['x-transport-type']).toBe('silver');
  });
});

test.describe('Port Detection Middleware', () => {
  test('should correctly identify port from socket connection', async ({ request }) => {
    const goldResponse = await request.get('http://127.0.0.1:8888/health');
    const goldBody = await goldResponse.json();

    expect(goldBody.transport).toBe('gold');
    expect(goldBody.port).toBe(8888);
  });

  test('should set transport in request object', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8888/api/test/info');
    const body = await response.json();

    expect(body.transport).toBe('gold');
  });
});
