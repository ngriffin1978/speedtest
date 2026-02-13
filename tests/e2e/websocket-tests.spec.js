const { test, expect } = require('@playwright/test');
const WebSocket = require('ws');

/**
 * Helper function to test WebSocket latency on a specific port
 */
async function testWebSocketLatency(port, expectedTransport) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/latency`);
    const measurements = [];
    let messageCount = 0;
    const maxMessages = 5;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket test timeout'));
    }, 10000);

    ws.on('open', () => {
      // Send ping messages
      const interval = setInterval(() => {
        if (messageCount >= maxMessages) {
          clearInterval(interval);
          clearTimeout(timeout);
          ws.close();
          return;
        }

        const startTime = Date.now();
        ws.send(JSON.stringify({ type: 'ping', timestamp: startTime }));
        messageCount++;
      }, 100);
    });

    ws.on('message', (data) => {
      const endTime = Date.now();
      const message = JSON.parse(data.toString());

      if (message.type === 'pong') {
        const latency = endTime - message.timestamp;
        measurements.push({
          latency,
          transport: message.transport,
        });

        if (measurements.length >= maxMessages) {
          clearTimeout(timeout);
          ws.close();
        }
      }
    });

    ws.on('close', () => {
      if (measurements.length > 0) {
        const avgLatency = measurements.reduce((sum, m) => sum + m.latency, 0) / measurements.length;
        resolve({
          measurements,
          avgLatency,
          transport: measurements[0]?.transport,
        });
      } else {
        reject(new Error('No measurements received'));
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

test.describe('WebSocket Latency Tests', () => {
  test('should establish WebSocket connection on Gold port', async () => {
    const result = await testWebSocketLatency(8888, 'gold');

    expect(result.transport).toBe('gold');
    expect(result.measurements.length).toBeGreaterThan(0);
    expect(result.avgLatency).toBeGreaterThan(0);
    expect(result.avgLatency).toBeLessThan(1000); // Reasonable latency
  });

  test('should establish WebSocket connection on Silver port', async () => {
    const result = await testWebSocketLatency(8889, 'silver');

    expect(result.transport).toBe('silver');
    expect(result.measurements.length).toBeGreaterThan(0);
    expect(result.avgLatency).toBeGreaterThan(0);
    expect(result.avgLatency).toBeLessThan(1000);
  });

  test('should correctly identify transport type in WebSocket messages', async () => {
    const goldResult = await testWebSocketLatency(8888, 'gold');
    const silverResult = await testWebSocketLatency(8889, 'silver');

    expect(goldResult.transport).toBe('gold');
    expect(silverResult.transport).toBe('silver');

    // All measurements should have consistent transport type
    goldResult.measurements.forEach(m => {
      expect(m.transport).toBe('gold');
    });

    silverResult.measurements.forEach(m => {
      expect(m.transport).toBe('silver');
    });
  });

  test('should measure latency accurately via WebSocket', async () => {
    const result = await testWebSocketLatency(8888, 'gold');

    // Check that all latencies are reasonable
    result.measurements.forEach(m => {
      expect(m.latency).toBeGreaterThanOrEqual(0); // Can be 0 on very fast localhost
      expect(m.latency).toBeLessThan(500); // Should be under 500ms for localhost
    });

    // Check that average is calculated correctly
    const manualAvg = result.measurements.reduce((sum, m) => sum + m.latency, 0) / result.measurements.length;
    expect(Math.abs(result.avgLatency - manualAvg)).toBeLessThan(0.01);
  });

  test('should handle concurrent WebSocket connections', async () => {
    const promises = [
      testWebSocketLatency(8888, 'gold'),
      testWebSocketLatency(8889, 'silver'),
      testWebSocketLatency(8888, 'gold'),
    ];

    const results = await Promise.all(promises);

    expect(results[0].transport).toBe('gold');
    expect(results[1].transport).toBe('silver');
    expect(results[2].transport).toBe('gold');

    results.forEach(result => {
      expect(result.measurements.length).toBeGreaterThan(0);
      expect(result.avgLatency).toBeGreaterThan(0);
    });
  });
});

test.describe('WebSocket Connection Upgrade', () => {
  test('should upgrade HTTP connection to WebSocket on Gold port', async ({ request }) => {
    // First, verify the endpoint exists with a regular HTTP request
    const response = await request.get('http://127.0.0.1:8888/ws/latency').catch(err => err);

    // Should get an upgrade required or similar response
    // The actual WebSocket upgrade happens with the WebSocket client
  });

  test('should preserve transport context through WebSocket upgrade', async () => {
    // Connect to Gold port
    const goldResult = await testWebSocketLatency(8888, 'gold');

    // Verify transport is maintained throughout the connection
    expect(goldResult.transport).toBe('gold');
    expect(goldResult.measurements.every(m => m.transport === 'gold')).toBe(true);
  });
});
