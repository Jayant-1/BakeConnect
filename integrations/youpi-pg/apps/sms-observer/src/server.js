import http from 'node:http';
import { hasBearer, getObserverToken, getAdminToken } from '@youpi/common';
import { SmsObserverService } from './sms-service.js';
import { GoogleMessagesAutomator } from './browser-automator.js';

export class SmsObserverServer {
  /**
   * @param {{
   *   service?: SmsObserverService,
   *   apiBaseUrl?: string,
   *   receivingAccountId?: string
   * }} options
   */
  constructor(options = {}) {
    this.service = options.service || new SmsObserverService(options);
    this.automator = new GoogleMessagesAutomator({ smsService: this.service });
  }

  createServer() {
    return http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;
      const method = (req.method || 'GET').toUpperCase();

      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
      }

      // GET /health
      if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'UP',
          service: 'sms-observer',
          isRunning: this.service.isRunning,
          lastPollAt: this.service.lastPollAt,
          observedCount: this.service.observedCount
        }));
        return;
      }

      // GET /api/browser/status
      if (pathname === '/api/browser/status') {
        // Only trigger a background connection attempt when an authenticated observer/admin asks
        if (hasBearer(req, getObserverToken(), getAdminToken()) && this.automator.mode === 'STANDBY' && !this.automator.isEnsuring) {
          this.automator.autoEnsureConnection().catch(() => {});
        }
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(this.automator.getStatus()));
        return;
      }

      // POST /api/browser/auto-ensure
      if (pathname === '/api/browser/auto-ensure' && method === 'POST') {
        if (!hasBearer(req, getObserverToken(), getAdminToken())) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }));
          return;
        }
        try {
          const result = await this.automator.autoEnsureConnection();
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // POST /api/browser/launch-pairing
      if (pathname === '/api/browser/launch-pairing' && req.method === 'POST') {
        if (!hasBearer(req, getObserverToken(), getAdminToken())) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }));
          return;
        }
        try {
          const result = this.automator.launchPairingWindow();
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // POST /api/sweep (Active sweep trigger during 30-second verification window)
      if (pathname === '/api/sweep' && method === 'POST') {
        if (!hasBearer(req, getObserverToken(), getAdminToken())) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }));
          return;
        }
        try {
          await this.automator.pollRecentMessages();
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ swept: true, source: 'GOOGLE_MESSAGES', count: this.automator.messagesObserved }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // POST /process-sms (Direct SMS intake / Google Messages Web bridge)
      if (pathname === '/process-sms' && req.method === 'POST') {
        // Direct ingestion feeds the payment pipeline: only the local operator/test tooling may call it.
        if (!hasBearer(req, getObserverToken(), getAdminToken())) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const smsData = JSON.parse(body);
            const result = await this.service.processSms(smsData);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, result }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // GET /pair - Interactive Web-Based Device Pairing Interface
      if (pathname === '/pair' || pathname === '/pair/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(this.renderPairingHtml());
        return;
      }

      // GET /api/browser/qr - Real-Time Pairing QR Payload
      if (pathname === '/api/browser/qr') {
        try {
          const qrData = await this.automator.getPairingQrCode();
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(qrData));
        } catch (err) {
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // GET /api/browser/qr.png - Raw PNG Image Stream
      if (pathname === '/api/browser/qr.png') {
        try {
          const qrData = await this.automator.getPairingQrCode();
          if (qrData?.qrDataUrl && qrData.qrDataUrl.startsWith('data:image/png;base64,')) {
            const base64Data = qrData.qrDataUrl.replace(/^data:image\/png;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            res.writeHead(200, {
              'Content-Type': 'image/png',
              'Content-Length': imgBuffer.length,
              'Cache-Control': 'no-store, no-cache, must-revalidate'
            });
            res.end(imgBuffer);
            return;
          }
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'QR image not ready yet or already paired' }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('SMS Observer Route Not Found');
    });
  }

  renderPairingHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Messages Server Gateway — Device Pairing</title>
  <style>
    :root {
      --bg: #0f1117;
      --card-bg: #1a1d26;
      --border: #2a2f3d;
      --text: #f0f2f5;
      --text-muted: #8b949e;
      --accent: #3b82f6;
      --success: #10b981;
      --amber: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .container {
      max-width: 520px;
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge.connected {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.3);
    }
    .badge.amber {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border-color: rgba(245, 158, 11, 0.3);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.35rem;
    }
    .subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .qr-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 1.25rem 0;
      min-height: 280px;
      position: relative;
    }
    .qr-img {
      max-width: 250px;
      max-height: 250px;
      width: 100%;
      height: auto;
      border-radius: 6px;
      display: block;
    }
    .loading-spinner {
      border: 3px solid #e2e8f0;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      animation: spin 1s linear infinite;
      margin-bottom: 0.75rem;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .instructions {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1.25rem;
    }
    .instructions ol {
      padding-left: 1.2rem;
      font-size: 0.85rem;
      color: #d1d5db;
      line-height: 1.6;
    }
    .instructions li {
      margin-bottom: 0.35rem;
    }
    .instructions strong {
      color: #ffffff;
    }
    .connected-card {
      display: none;
      text-align: center;
      padding: 2rem 1rem;
    }
    .connected-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    .connected-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #34d399;
      margin-bottom: 0.5rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    .stat-item {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      padding: 0.75rem;
      border-radius: 8px;
      text-align: center;
    }
    .stat-label { font-size: 0.75rem; color: var(--text-muted); }
    .stat-value { font-size: 1.1rem; font-weight: 700; color: #fff; margin-top: 0.2rem; }
    .footer-note {
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div id="statusBadge" class="badge amber">
        <span class="pulse-dot"></span>
        <span id="statusText">Awaiting QR Scan</span>
      </div>
      <h1>Google Messages Server Gateway</h1>
      <p class="subtitle">Cloud SMS Payment Observer for UPI auto-reconciliation</p>
    </div>

    <!-- Active Pairing View -->
    <div id="pairingView">
      <div class="instructions">
        <ol>
          <li>Open <strong>Google Messages</strong> on your phone</li>
          <li>Tap your profile icon / 3 dots &rarr; <strong>Device Pairing</strong></li>
          <li>Tap <strong>QR code scanner</strong> & point at this screen</li>
        </ol>
      </div>

      <div class="qr-card">
        <div id="loadingBox">
          <div class="loading-spinner"></div>
          <div style="font-size:0.85rem; color:#64748b; font-weight:500;">Connecting to headless server...</div>
        </div>
        <img id="qrImage" class="qr-img" style="display:none;" alt="Google Messages Pairing QR Code" />
      </div>
      <div class="footer-note">
        🔒 <em>"Remember this computer"</em> is automatically enabled. You only need to pair once.
      </div>
    </div>

    <!-- Connected View -->
    <div id="connectedView" class="connected-card">
      <div class="connected-icon">✅</div>
      <div class="connected-title">Device Paired & Connected!</div>
      <p class="subtitle" style="margin-bottom:1rem;">Headless Chromium is actively monitoring incoming bank SMS in the background.</p>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Messages Observed</div>
          <div id="statMessages" class="stat-value">0</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Observer Mode</div>
          <div class="stat-value" style="color:#60a5fa;">24/7 Server</div>
        </div>
      </div>
      <div class="footer-note" style="margin-top:1.5rem;">
        You can close this tab now. The server will keep running autonomously.
      </div>
    </div>
  </div>

  <script>
    let pollInterval = null;

    async function checkStatus() {
      try {
        const res = await fetch('/api/browser/qr');
        if (!res.ok) return;
        const data = await res.json();

        if (data.isPaired) {
          document.getElementById('pairingView').style.display = 'none';
          document.getElementById('connectedView').style.display = 'block';
          const badge = document.getElementById('statusBadge');
          badge.className = 'badge connected';
          document.getElementById('statusText').innerText = 'Connected & Listening';
          if (data.messagesObserved !== undefined) {
            document.getElementById('statMessages').innerText = data.messagesObserved;
          }
          return;
        }

        if (data.qrDataUrl) {
          const qrImg = document.getElementById('qrImage');
          qrImg.src = data.qrDataUrl;
          qrImg.style.display = 'block';
          document.getElementById('loadingBox').style.display = 'none';
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }

    checkStatus();
    pollInterval = setInterval(checkStatus, 2500);
  </script>
</body>
</html>`;
  }
}
