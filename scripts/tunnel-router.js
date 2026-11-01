import http from 'node:http';
import net from 'node:net';

const PORT = process.env.ROUTER_PORT || 8000;

const TARGETS = {
  SPRING_BOOT: { host: '127.0.0.1', port: 8080 },
  CHECKOUT: { host: '127.0.0.1', port: 7000 },
  PAYMENT_API: { host: '127.0.0.1', port: 6100 },
  ADMIN: { host: '127.0.0.1', port: 6001 }
};

function setCorsHeaders(res, origin = '*') {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Merchant-Id, X-Merchant-Key, Idempotency-Key, x-internal-service-token, x-device-id, x-device-token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '*';
  setCorsHeaders(res, origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';

  // Health probe
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', timestamp: new Date().toISOString() }));
    return;
  }

  // Determine target backend service
  let target = TARGETS.SPRING_BOOT;
  let targetPath = url;

  if (url.startsWith('/api/v1/') || url.startsWith('/actuator/')) {
    target = TARGETS.SPRING_BOOT;
    targetPath = url;
  } else if (url.startsWith('/checkout/') || url.startsWith('/css/') || url.startsWith('/js/') || url.startsWith('/icons/') || url.startsWith('/assets/')) {
    target = TARGETS.CHECKOUT;
    targetPath = url;
  } else if (url.startsWith('/payment-api/')) {
    target = TARGETS.PAYMENT_API;
    targetPath = url.replace(/^\/payment-api/, '') || '/';
  } else if (url.startsWith('/admin/')) {
    target = TARGETS.ADMIN;
    targetPath = url.replace(/^\/admin/, '') || '/';
  } else if (url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
<head><title>BakeConnect & YouPi PG Gateway</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#0c0d0e;color:#f3f4f6;padding:40px;max-width:700px;margin:auto;">
  <h1 style="color:#f59e0b;">🥐 BakeConnect Gateway Online</h1>
  <p>Public Cloudflare Tunnel active. Services running:</p>
  <ul>
    <li><b>Spring Boot Backend:</b> <a style="color:#60a5fa" href="/actuator/health">/actuator/health</a></li>
    <li><b>Products API:</b> <a style="color:#60a5fa" href="/api/v1/products">/api/v1/products</a></li>
    <li><b>Payment Gateway API:</b> <a style="color:#60a5fa" href="/payment-api/health">/payment-api/health</a></li>
  </ul>
  <p>Vercel Frontend config: <code>NEXT_PUBLIC_API_URL=${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}</code></p>
</body></html>`);
    return;
  }

  // Forward HTTP request
  const proxyReq = http.request({
    host: target.host,
    port: target.port,
    method: req.method,
    path: targetPath,
    headers: {
      ...req.headers,
      host: `${target.host}:${target.port}`,
      'x-forwarded-host': req.headers.host,
      'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'https',
      'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket.remoteAddress
    }
  }, (proxyRes) => {
    // Preserve CORS headers
    setCorsHeaders(res, origin);

    // If SSE stream, disable buffering
    if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/event-stream')) {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Content-Type', 'text/event-stream');
      res.flushHeaders?.();
    }

    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[Router Error] Forwarding to ${target.host}:${target.port}${targetPath} failed:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message, target: `${target.host}:${target.port}` }));
    }
  });

  req.pipe(proxyReq);
});

// Support WebSockets (upgrade request forwarding)
server.on('upgrade', (req, clientSocket, head) => {
  const url = req.url || '';
  let target = TARGETS.CHECKOUT;
  if (url.startsWith('/api/v1/') || url.startsWith('/actuator/')) {
    target = TARGETS.SPRING_BOOT;
  }

  const serverSocket = net.connect(target.port, target.host, () => {
    serverSocket.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      serverSocket.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
    }
    serverSocket.write('\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error('[WebSocket Upgrade Error]:', err.message);
    clientSocket.destroy();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🌐 Unified Tunnel Router listening on port ${PORT}`);
  console.log(`• Spring Boot:   -> http://127.0.0.1:8080`);
  console.log(`• Checkout:      -> http://127.0.0.1:7000`);
  console.log(`• Payment API:   -> http://127.0.0.1:6100`);
  console.log(`• Admin Hub:     -> http://127.0.0.1:6001`);
  console.log(`====================================================`);
});
