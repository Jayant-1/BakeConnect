import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BrowserLauncher } from '@youpi/observer-sdk';
import { getObserverToken } from '@youpi/common';
import { BankSmsParser } from './sms-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

function isGoogleMessagesUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString);
    return parsed.hostname === 'messages.google.com';
  } catch {
    return false;
  }
}

function isPairedMessagesUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString);
    if (parsed.hostname !== 'messages.google.com') return false;
    const path = parsed.pathname;
    if (path.includes('/conversations')) return true;
    return path.includes('/web')
      && !path.includes('/authentication')
      && !path.includes('/welcome')
      && !path.includes('/pair')
      && !path.includes('/messagesSetup')
      && !path.includes('/postSignIn')
      && !path.includes('/unableToConnect');
  } catch {
    return false;
  }
}

export class GoogleMessagesAutomator {
  /**
   * @param {{
   *   smsService: import('./sms-service.js').SmsObserverService,
   *   debuggingPort?: number
   * }} options
   */
  constructor(options) {
    this.smsService = options.smsService;
    this.apiBaseUrl = options.apiBaseUrl || process.env.PAYMENT_API_URL || process.env.BASE_PAYMENT_API_URL || 'http://localhost:6100';
    this.debuggingPort = options.debuggingPort || Number(process.env.GOOGLE_MESSAGES_DEBUGGING_PORT || 9225);
    const defaultProfileDir = process.env.GOOGLE_MESSAGES_PROFILE_DIR
      || (fs.existsSync('/data') ? '/data/browser-sessions/google-messages' : path.join(rootDir, 'data/browser-sessions/google-messages'));
    this.profileDir = options.profileDir || defaultProfileDir;
    this.stateFilePath = path.join(this.profileDir, 'pairing-state.json');
    this.targetUrl = 'https://messages.google.com/web/authentication';

    this.visibleProcess = null;
    this.backgroundProcess = null;
    this.browserProcess = null;
    this.isPaired = this.loadStoredPairedState();
    this.mode = 'STANDBY'; // 'BACKGROUND' | 'VISIBLE' | 'HEADLESS_PAIRING' | 'STANDBY'
    this.checkTimer = null;
    this.extractionTimer = null;
    this.keepAliveTimer = null;
    this.lastSeenAt = null;
    this.lastMessageAt = null;
    this.messagesObserved = 0;
    this.processedHashes = new Set();
    this.isEnsuring = false;
  }

  isObserverEnabled() {
    return process.env.ENABLE_GOOGLE_MESSAGES_SERVER === 'true'
      || process.env.ENABLE_LEGACY_CHROME_OBSERVERS === 'true';
  }

  async fetchActivePaymentAmounts() {
    try {
      let targetAccountId = this.smsService?.receivingAccountId;
      if (!targetAccountId && typeof this.smsService?.resolveActiveReceivingAccount === 'function') {
        targetAccountId = await this.smsService.resolveActiveReceivingAccount();
      }
      const url = targetAccountId
        ? `${this.apiBaseUrl}/api/v1/pollers/active-window?receivingAccountId=${encodeURIComponent(targetAccountId)}`
        : `${this.apiBaseUrl}/api/v1/pollers/active-window`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${getObserverToken()}` },
        signal: AbortSignal.timeout(1500)
      });
      if (res.ok) {
        const data = await res.json();
        return data.sessions || [];
      }
    } catch {}
    return [];
  }

  loadStoredPairedState() {
    try {
      const candidates = [
        path.join(path.dirname(this.profileDir), 'google-messages-paired-backup.tar.gz'),
        path.join(__dirname, '../assets/google-messages-paired-backup.tar.gz'),
        path.join(rootDir, 'apps/sms-observer/assets/google-messages-paired-backup.tar.gz'),
        path.join(rootDir, 'data/browser-sessions/google-messages-paired-backup.tar.gz'),
        path.join(process.cwd(), 'data/browser-sessions/google-messages-paired-backup.tar.gz'),
        '/app/data/browser-sessions/google-messages-paired-backup.tar.gz',
        '/data/browser-sessions/google-messages-paired-backup.tar.gz'
      ];
      const backupTar = candidates.find(p => fs.existsSync(p));
      if (!fs.existsSync(path.join(this.profileDir, 'Default')) && backupTar) {
        try {
          fs.mkdirSync(path.dirname(this.profileDir), { recursive: true });
          cp.execSync(`tar -xzf "${backupTar}" -C "${path.dirname(this.profileDir)}"`);
        } catch {}
      }

      if (fs.existsSync(this.stateFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf8'));
        if (data.paired) return true;
      }

      if (backupTar) {
        this.saveStoredPairedState(true);
        return true;
      }
    } catch {}
    return false;
  }

  saveStoredPairedState(paired) {
    try {
      if (!fs.existsSync(this.profileDir)) {
        fs.mkdirSync(this.profileDir, { recursive: true });
      }
      fs.writeFileSync(this.stateFilePath, JSON.stringify({ paired, updatedAt: new Date().toISOString() }));
    } catch {}
    this.isPaired = paired;
  }

  /**
   * Automatically ensures connection:
   * - If already paired: launches invisible background browser and starts polling.
   * - If disconnected/unpaired: launches pairing instance (headless or visible).
   */
  async autoEnsureConnection() {
    if (this.isEnsuring) return this.getStatus();
    if (!this.isObserverEnabled()) return this.getStatus();
    this.isEnsuring = true;

    try {
      const targets = await BrowserLauncher.getTargets(this.debuggingPort);
      const active = targets.find(t => isGoogleMessagesUrl(t.url));

      if (active) {
        this.lastSeenAt = new Date();
        const isPairedUrl = isPairedMessagesUrl(active.url);
        if (isPairedUrl) {
          this.isPaired = true;
          this.saveStoredPairedState(true);
          this.mode = 'BACKGROUND';
          this.startExtractionLoop();
          this.startKeepAlive();
          return this.getStatus();
        } else if (this.isPaired) {
          // Profile is paired; page might have momentarily landed on /welcome.
          // Command CDP to navigate to /web/conversations
          try {
            if (active.webSocketDebuggerUrl) {
              await BrowserLauncher.sendCommand(active.webSocketDebuggerUrl, 'Page.navigate', {
                url: 'https://messages.google.com/web/conversations'
              });
            }
          } catch {}
          this.mode = 'BACKGROUND';
          this.startExtractionLoop();
          this.startKeepAlive();
          this.startStateMonitor();
          return this.getStatus();
        } else {
          this.isPaired = false;
          this.mode = 'AWAITING_PAIRING';
          this.startStateMonitor();
          return this.getStatus();
        }
      }

      // No browser running currently: check stored pairing state
      if (this.isPaired) {
        console.log('[Google Messages Automator] Existing pairing detected. Launching invisible background browser...');
        this.launchBackgroundObserver();
        this.mode = 'BACKGROUND';
      } else {
        console.log('[Google Messages Automator] No pairing detected. Initializing pairing instance...');
        this.launchPairingWindow();
      }
    } catch (err) {
      console.error('[Google Messages Automator] autoEnsureConnection error:', err);
    } finally {
      this.isEnsuring = false;
    }

    return this.getStatus();
  }

  /**
   * Automatically ensures "Remember this computer" is toggled ON before scanning QR.
   * @param {string} wsUrl
   */
  async ensureRememberMe(wsUrl) {
    if (!wsUrl) return;
    const script = `
      (() => {
        try {
          const toggle = document.querySelector('mws-remember-computer-checkbox input, [role="switch"], [role="checkbox"], mat-slide-toggle button, input[type="checkbox"]');
          if (toggle) {
            const isChecked = toggle.checked || toggle.getAttribute('aria-checked') === 'true' || toggle.classList.contains('mat-checked');
            if (!isChecked) {
              toggle.click();
              return true;
            }
          }
        } catch {}
        return false;
      })()
    `;
    try {
      await BrowserLauncher.evaluate(wsUrl, script);
    } catch {}
  }

  /**
   * Opens the Google Messages Web pairing browser instance.
   * On headless servers without a GUI display, runs headless so the user can scan via /pair.
   * @param {{ headless?: boolean }} [options]
   */
  launchPairingWindow(options = {}) {
    if (!this.isObserverEnabled()) {
      return {
        success: false,
        launched: false,
        reason: 'Legacy Chrome observer is disabled in production profile. Use Android APK or set ENABLE_GOOGLE_MESSAGES_SERVER=true.'
      };
    }

    const isHeadless = options.headless !== undefined
      ? Boolean(options.headless)
      : (process.env.HEADLESS === 'true' || (!process.env.DISPLAY && process.platform === 'linux'));

    this.mode = isHeadless ? 'HEADLESS_PAIRING' : 'VISIBLE';
    this.browserProcess = BrowserLauncher.launch({
      url: this.targetUrl,
      profileDir: this.profileDir,
      debuggingPort: this.debuggingPort,
      headless: isHeadless,
      minimized: !isHeadless
    });

    this.startStateMonitor();

    return {
      success: true,
      status: 'AWAITING_PAIRING',
      mode: this.mode,
      debuggingPort: this.debuggingPort,
      profileDir: this.profileDir,
      instructions: isHeadless
        ? 'A headless Google Messages pairing session has launched. Open /pair to view and scan the QR code.'
        : 'A Google Messages browser window has opened. On your Android phone, open Google Messages > Device Pairing > Scan QR code.'
    };
  }

  /**
   * Extracts the live QR code data URL from the pairing page for web streaming.
   * @returns {Promise<{
   *   success: boolean,
   *   isPaired: boolean,
   *   status: string,
   *   qrDataUrl?: string | null,
   *   mode?: string,
   *   error?: string
   * }>}
   */
  async getPairingQrCode() {
    if (!this.isObserverEnabled()) {
      return {
        success: false,
        isPaired: false,
        status: 'DISABLED',
        error: 'Google Messages observer is disabled. Set ENABLE_GOOGLE_MESSAGES_SERVER=true.'
      };
    }

    // Query active CDP targets
    const targets = await BrowserLauncher.getTargets(this.debuggingPort);
    let msgTarget = targets.find(t => isGoogleMessagesUrl(t.url) && t.webSocketDebuggerUrl);

    if (!msgTarget) {
      this.launchPairingWindow();
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 400));
        const updated = await BrowserLauncher.getTargets(this.debuggingPort);
        msgTarget = updated.find(t => isGoogleMessagesUrl(t.url) && t.webSocketDebuggerUrl);
        if (msgTarget) break;
      }
    }

    if (!msgTarget) {
      return {
        success: false,
        isPaired: false,
        status: 'INITIALIZING',
        error: 'Starting headless Chrome on server...'
      };
    }

    // If already paired
    if (isPairedMessagesUrl(msgTarget.url)) {
      this.isPaired = true;
      this.saveStoredPairedState(true);
      return {
        success: true,
        isPaired: true,
        status: 'CONNECTED',
        mode: this.mode
      };
    }

    // Ensure Remember Me is checked
    await this.ensureRememberMe(msgTarget.webSocketDebuggerUrl);

    // Extract QR code element from DOM
    const extractScript = `
      (() => {
        try {
          const canvas = document.querySelector('mw-qr-code canvas, .qr-code canvas, canvas');
          if (canvas && canvas.width > 30) {
            return { found: true, dataUrl: canvas.toDataURL('image/png') };
          }
          const img = document.querySelector('mw-qr-code img, img[alt*="QR"], img[src^="data:image"]');
          if (img && img.src) {
            return { found: true, dataUrl: img.src };
          }
          const svg = document.querySelector('mw-qr-code svg, svg.qr-code');
          if (svg) {
            const xml = new XMLSerializer().serializeToString(svg);
            const svg64 = btoa(unescape(encodeURIComponent(xml)));
            return { found: true, dataUrl: 'data:image/svg+xml;base64,' + svg64 };
          }
          return { found: false };
        } catch (e) {
          return { found: false, error: e.message };
        }
      })()
    `;

    const extracted = await BrowserLauncher.evaluate(msgTarget.webSocketDebuggerUrl, extractScript);
    if (extracted?.found && extracted.dataUrl) {
      return {
        success: true,
        isPaired: false,
        status: 'AWAITING_PAIRING',
        qrDataUrl: extracted.dataUrl,
        mode: this.mode
      };
    }

    // Viewport screenshot fallback
    try {
      const screenshot = await BrowserLauncher.sendCommand(msgTarget.webSocketDebuggerUrl, 'Page.captureScreenshot', { format: 'png' });
      if (screenshot?.data) {
        return {
          success: true,
          isPaired: false,
          status: 'AWAITING_PAIRING',
          qrDataUrl: `data:image/png;base64,${screenshot.data}`,
          mode: this.mode
        };
      }
    } catch {}

    return {
      success: true,
      isPaired: false,
      status: 'AWAITING_PAIRING',
      qrDataUrl: null,
      message: 'Loading QR code from Google Messages...'
    };
  }

  launchBackgroundObserver() {
    this.mode = 'BACKGROUND';
    this.unpairedCounter = 0;
    this.browserProcess = BrowserLauncher.launch({
      url: 'https://messages.google.com/web/conversations',
      profileDir: this.profileDir,
      debuggingPort: this.debuggingPort,
      headless: true
    });

    this.startStateMonitor();
    this.startExtractionLoop();
    this.startKeepAlive();
  }

  /**
   * Monitors the browser CDP target to detect when pairing completes.
   * If pairing completes: saves state and ensures background observer continues.
   * If background process gets unlinked: automatically triggers pairing mode.
   */
  startStateMonitor() {
    if (this.checkTimer) clearInterval(this.checkTimer);
    this.unpairedCounter = 0;

    this.checkTimer = setInterval(async () => {
      try {
        const targets = await BrowserLauncher.getTargets(this.debuggingPort);
        const msgTarget = targets.find(t => isGoogleMessagesUrl(t.url));

        if (msgTarget) {
          this.lastSeenAt = new Date();

          const isPairedUrl = isPairedMessagesUrl(msgTarget.url);

          if (isPairedUrl) {
            this.unpairedCounter = 0;
            if (!this.isPaired) {
              // Pairing confirmed!
              this.saveStoredPairedState(true);
              this.mode = 'BACKGROUND';
              console.log('[Google Messages Automator] Pairing confirmed! Running in autonomous background mode...');
              this.startExtractionLoop();
              this.startKeepAlive();
            }
          } else if (this.isPaired) {
            if (msgTarget.url.includes('/unableToConnect') && msgTarget.webSocketDebuggerUrl) {
              this.unableToConnectTicks = (this.unableToConnectTicks || 0) + 1;
              if (this.unableToConnectTicks % 3 === 0) {
                try {
                  await BrowserLauncher.evaluate(msgTarget.webSocketDebuggerUrl, `
                    (() => {
                      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText && b.innerText.includes("Refresh"));
                      if (btn) btn.click();
                    })()
                  `);
                } catch {}
              }
            } else {
              this.unableToConnectTicks = 0;
            }

            const isExplicitAuthPage = msgTarget.url.includes('/welcome') || msgTarget.url.includes('/authentication');
            if (isExplicitAuthPage) {
              this.unpairedCounter = (this.unpairedCounter || 0) + 1;
              // Attempt to recover by navigating directly to /conversations every 5 ticks
              if (this.unpairedCounter % 5 === 0 && msgTarget.webSocketDebuggerUrl) {
                try {
                  await BrowserLauncher.sendCommand(msgTarget.webSocketDebuggerUrl, 'Page.navigate', {
                    url: 'https://messages.google.com/web/conversations'
                  });
                } catch {}
              }
              if (this.unpairedCounter >= 30) {
                // Confirmed unlinked after 30 consecutive polls (60 seconds)
                this.saveStoredPairedState(false);
                this.mode = 'AWAITING_PAIRING';
                console.log('[Google Messages Automator] Session unlinked after extended timeout. Ready for re-pairing via /pair...');
              }
            } else {
              this.unpairedCounter = 0;
            }
          }
        }
      } catch {
        // Target busy or initializing
      }
    }, 2000);
    if (this.checkTimer.unref) this.checkTimer.unref();
  }

  /**
   * Periodic keep-alive ping to ensure Google Messages WebSocket does not time out.
   */
  startKeepAlive() {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
    this.keepAliveTimer = setInterval(async () => {
      try {
        const targets = await BrowserLauncher.getTargets(this.debuggingPort);
        const target = targets.find(t => isGoogleMessagesUrl(t.url) && t.webSocketDebuggerUrl);
        if (target) {
          await BrowserLauncher.evaluate(target.webSocketDebuggerUrl, '(() => document.title)()');
          this.lastSeenAt = new Date();
        }
      } catch {}
    }, 300000); // Every 5 minutes
    if (this.keepAliveTimer.unref) this.keepAliveTimer.unref();
  }

  /**
   * Continuous background extraction loop for Google Messages SMS conversations.
   */
  startExtractionLoop() {
    if (this.extractionTimer) clearInterval(this.extractionTimer);

    this.extractionTimer = setInterval(async () => {
      try {
        await this.pollRecentMessages();
      } catch (err) {
        // Target busy or updating
      }
    }, 3000);
    if (this.extractionTimer.unref) this.extractionTimer.unref();
  }

  async pollRecentMessages() {
    if (this._isPollingMessages) return;
    this._isPollingMessages = true;

    try {
      const targets = await BrowserLauncher.getTargets(this.debuggingPort);
      const target = targets.find(t => (t.type === 'page' || !t.type) && isGoogleMessagesUrl(t.url) && t.webSocketDebuggerUrl)
        || targets.find(t => isGoogleMessagesUrl(t.url) && t.webSocketDebuggerUrl);
      if (!target) return;

    this.lastSeenAt = new Date();

    // Fetch active payment sessions currently in progress
    const activeSessions = await this.fetchActivePaymentAmounts();
    const targetAmounts = activeSessions.map(s => s.amount);

    // Universal DOM evaluation: deeply inspects conversation previews, chat bubbles, and full text
    const script = `
      (() => {
        const results = [];
        const amounts = ${JSON.stringify(targetAmounts)};

        // 1. Scan conversation snippets and message wrappers
        const items = document.querySelectorAll('[role="option"], mws-conversation-list-item, mws-message-wrapper, .snippet-text, .text-content, .message-content, [data-e2e-conversation-list-item]');
        for (const item of items) {
          const text = (item.innerText || item.textContent || '').trim();
          if (!text) continue;

          let hasTargetAmount = false;
          for (const amt of amounts) {
            const intVal = String(Math.floor(Number(amt)));
            if (text.includes(amt) || text.includes(intVal)) {
              hasTargetAmount = true;
              break;
            }
          }

          if (hasTargetAmount || /(credited|received|deposit|upi|utr|rs\\.?|inr|₹)/i.test(text)) {
            results.push(text);
          }
        }

        // 2. Scan full document body text lines
        const bodyText = (document.body.innerText || '');
        const lines = bodyText.split('\\n');
        for (const line of lines) {
          const text = line.trim();
          if (!text) continue;

          let hasTargetAmount = false;
          for (const amt of amounts) {
            const intVal = String(Math.floor(Number(amt)));
            if (text.includes(amt) || text.includes(intVal)) {
              hasTargetAmount = true;
              break;
            }
          }

          if (hasTargetAmount || (text.length > 5 && /(credited|received|deposit|upi|utr|rs\\.?|inr|₹)/i.test(text))) {
            results.push(text);
          }
        }

        return results.slice(0, 20);
      })()
    `;

    const extracted = await BrowserLauncher.evaluate(target.webSocketDebuggerUrl, script);
    if (Array.isArray(extracted) && extracted.length > 0) {
      for (const rawText of extracted) {
        const hash = rawText.substring(0, 80);
        if (!this.processedHashes.has(hash)) {
          this.processedHashes.add(hash);
          if (this.processedHashes.size > 200) {
            const first = this.processedHashes.values().next().value;
            this.processedHashes.delete(first);
          }

          // 1. Try standard bank SMS parser
          let parsed = BankSmsParser.parse({ text: rawText });

          // 2. Intelligent Active Window Fallback:
          // If message contains the active session's exact amount, match it directly!
          if (!parsed && activeSessions.length > 0) {
            for (const s of activeSessions) {
              const intVal = String(Math.floor(Number(s.amount)));
              if (rawText.includes(s.amount) || rawText.includes(intVal)) {
                parsed = {
                  amountPaise: BigInt(s.amountPaise),
                  amount: s.amount,
                  observedAt: new Date(),
                  rawText
                };
                break;
              }
            }
          }

          if (parsed) {
            console.log(`[Google Messages Automator] Extracted incoming payment SMS: ₹${parsed.amount} (Ref: ${parsed.bankReferenceNumber || 'NONE'})`);
            await this.smsService.processSms({
              text: rawText,
              sender: 'Google-Messages-Web',
              timestamp: new Date()
            });
            this.messagesObserved++;
            this.lastMessageAt = new Date();
          }
        }
      }
    }
  } finally {
    this._isPollingMessages = false;
  }
  }

  getStatus() {
    let statusText = 'STANDBY';
    const isLive = Boolean(this.lastSeenAt && (Date.now() - new Date(this.lastSeenAt).getTime() < 300000));
    if (this.isPaired && this.mode === 'BACKGROUND') {
      statusText = 'CONNECTED';
    } else if (this.mode === 'VISIBLE' || (this.lastSeenAt && (Date.now() - new Date(this.lastSeenAt).getTime() < 10000))) {
      statusText = 'AWAITING_PAIRING';
    } else {
      statusText = 'STANDBY';
    }

    return {
      service: 'google-messages-web',
      isPaired: Boolean(this.isPaired),
      status: statusText,
      mode: this.mode,
      isPolling: Boolean(this.extractionTimer),
      messagesObserved: this.messagesObserved,
      lastSeenAt: this.lastSeenAt,
      lastMessageAt: this.lastMessageAt,
      profileDir: this.profileDir,
      debuggingPort: this.debuggingPort
    };
  }

  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    if (this.extractionTimer) {
      clearInterval(this.extractionTimer);
      this.extractionTimer = null;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}
