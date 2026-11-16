import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaymentObserverClient } from '@youpi/observer-sdk';
import { getAdminToken, getObserverToken } from '@youpi/common';
import { BankSmsParser } from './sms-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

export class SmsObserverService {
  /**
   * @param {{
   *   apiBaseUrl?: string,
   *   receivingAccountId?: string,
   *   pollIntervalMs?: number
   * }} options
   */
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || process.env.PAYMENT_API_URL || process.env.BASE_PAYMENT_API_URL || 'http://localhost:6100';
    this.receivingAccountId = options.receivingAccountId || process.env.RECEIVING_ACCOUNT_ID || null;
    this.pollIntervalMs = options.pollIntervalMs || Number(process.env.SMS_OBSERVER_POLL_INTERVAL_MS || 3000);
    this.observerClient = new PaymentObserverClient({
      apiBaseUrl: this.apiBaseUrl,
      sourceName: 'GOOGLE_MESSAGES'
    });

    this.isRunning = false;
    this.timer = null;
    this.lastPollAt = null;
    this.observedCount = 0;
  }

  async resolveActiveReceivingAccount() {
    if (this.receivingAccountId) return this.receivingAccountId;
    if (process.env.RECEIVING_ACCOUNT_ID) {
      this.receivingAccountId = process.env.RECEIVING_ACCOUNT_ID;
      return this.receivingAccountId;
    }

    const adminToken = getAdminToken();
    const observerToken = getObserverToken();

    // 1. Fetch from /api/v1/admin/upi-accounts using admin or observer credentials
    try {
      const token = adminToken || observerToken;
      const res = await fetch(`${this.apiBaseUrl}/api/v1/admin/upi-accounts`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        const activeAcct = (data.accounts || []).find(a => a.isActive && a.isMerchantEnabled) ||
                           (data.accounts || []).find(a => a.isActive) ||
                           (data.accounts || [])[0];
        if (activeAcct?.id) {
          this.receivingAccountId = activeAcct.id;
          console.log(`[SMS Observer] Resolved active receiving account from UPI accounts: ${activeAcct.id}`);
          return activeAcct.id;
        }
      }
    } catch {}

    // 2. Fetch from /api/v1/pollers/active-window with observer credentials
    try {
      const token = observerToken || adminToken;
      const res = await fetch(`${this.apiBaseUrl}/api/v1/pollers/active-window`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.receivingAccountId) {
          this.receivingAccountId = data.receivingAccountId;
          return data.receivingAccountId;
        }
        if (data.sessions && data.sessions.length > 0 && data.sessions[0].receivingAccountId) {
          this.receivingAccountId = data.sessions[0].receivingAccountId;
          return data.sessions[0].receivingAccountId;
        }
      }
    } catch {}

    // 3. Fallback to local SQLite database if available
    try {
      const candidates = [
        path.join(rootDir, 'data/youpi_pg.sqlite'),
        path.resolve(process.cwd(), 'data/youpi_pg.sqlite'),
        path.join(process.cwd(), 'integrations/youpi-pg/data/youpi_pg.sqlite'),
        '/data/youpi_pg.sqlite'
      ];
      const dbFile = candidates.find(p => fs.existsSync(p));
      if (dbFile) {
        const { DatabaseSync } = await import('node:sqlite');
        const syncDb = new DatabaseSync(dbFile);
        const row = syncDb.prepare('SELECT id FROM payment_receiving_accounts WHERE is_active = 1 LIMIT 1').get();
        if (row?.id) {
          this.receivingAccountId = row.id;
          console.log(`[SMS Observer] Resolved active receiving account from SQLite database: ${row.id}`);
          return row.id;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Processes and ingests an incoming SMS notification.
   * @param {{ text: string, sender?: string, timestamp?: Date | number | string }} sms
   */
  async processSms(sms) {
    const parsed = BankSmsParser.parse(sms);
    if (!parsed) return null;

    let targetAccountId = this.receivingAccountId;
    if (!targetAccountId) {
      try {
        const activeAcct = await this.resolveActiveReceivingAccount();
        if (activeAcct) targetAccountId = activeAcct;
      } catch {}
    }
    if (!targetAccountId) {
      console.warn('[SMS Observer] No target receiving account configured or active.');
      return null;
    }

    const sender = sms.sender || 'BANK-ALERT';

    try {
      const result = await this.observerClient.submitObservation({
        receivingAccountId: targetAccountId,
        amountPaise: parsed.amountPaise,
        amount: parsed.amount,
        observedAt: parsed.observedAt,
        bankReferenceNumber: parsed.bankReferenceNumber,
        senderVpa: parsed.senderVpa,
        sender,
        rawText: parsed.rawText,
        rawPayload: {
          text: parsed.rawText,
          sender
        }
      });

      this.observedCount++;
      return result;
    } catch (err) {
      console.error('[SMS Observer] Submission failed:', err.message);
      throw err;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[SMS Observer] Service started (poll interval: ${this.pollIntervalMs}ms)`);
    this.timer = setInterval(() => {
      this.pollCycle();
    }, this.pollIntervalMs);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[SMS Observer] Service stopped.');
  }

  async pollCycle() {
    this.lastPollAt = new Date();
    // In production, interfaces with Google Messages Web automation session via browser trace / WebSocket
  }
}
