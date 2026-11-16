import { spawn, exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { fileURLToPath } from 'node:url';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const urlFile = path.join(rootDir, 'scripts/tunnel-url.txt');
const logFile = path.join(rootDir, 'scripts/tunnel.log');

let child = null;
let currentUrl = null;
let isSyncing = false;

async function syncWithVercel(newUrl) {
  if (isSyncing) return;
  isSyncing = true;
  console.log(`[Tunnel Manager] Syncing new URL (${newUrl}) with Vercel...`);
  try {
    const cmd = `printf '%s' "${newUrl}" | vercel env add BACKEND_INTERNAL_URL production --force && ` +
      `printf '%s' "${newUrl}" | vercel env add NEXT_PUBLIC_API_URL production --force && ` +
      `printf '%s' "${newUrl}" | vercel env add BACKEND_INTERNAL_URL preview --force && ` +
      `printf '%s' "${newUrl}" | vercel env add NEXT_PUBLIC_API_URL preview --force && ` +
      `vercel deploy --prod --yes`;
    const { stdout } = await execAsync(cmd, { cwd: frontendDir, shell: '/bin/bash' });
    console.log(`[Tunnel Manager] Vercel redeployment complete:\n${stdout}`);
  } catch (err) {
    console.error(`[Tunnel Manager] Error syncing with Vercel:`, err.message || err);
  } finally {
    isSyncing = false;
  }
}

function startCloudflared() {
  console.log('[Tunnel Manager] Starting cloudflared tunnel pointing to http://127.0.0.1:8000 ...');
  
  child = spawn('/home/jayant/.local/bin/cloudflared', [
    'tunnel',
    '--protocol', 'http2',
    '--url', 'http://127.0.0.1:8000'
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  function handleData(data) {
    const text = data.toString();
    logStream.write(text);
    const match = text.match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/i);
    if (match) {
      const detectedUrl = match[0].trim();
      if (detectedUrl !== currentUrl) {
        currentUrl = detectedUrl;
        fs.writeFileSync(urlFile, currentUrl + '\n');
        console.log(`\n======================================================`);
        console.log(`[Tunnel Manager] CLOUDFLARE TUNNEL LIVE: ${currentUrl}`);
        console.log(`======================================================\n`);
        syncWithVercel(currentUrl);
      }
    }
  }

  child.stdout.on('data', handleData);
  child.stderr.on('data', handleData);

  child.on('exit', (code, signal) => {
    console.log(`[Tunnel Manager] cloudflared exited with code ${code} (${signal}). Auto-restarting in 3s...`);
    setTimeout(startCloudflared, 3000);
  });
}

startCloudflared();

process.on('SIGINT', () => { if (child) child.kill(); process.exit(); });
process.on('SIGTERM', () => { if (child) child.kill(); process.exit(); });

