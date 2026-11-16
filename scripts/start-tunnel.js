import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const urlFile = path.join(rootDir, 'scripts/tunnel-url.txt');
const logFile = path.join(rootDir, 'scripts/tunnel.log');

let child = null;
let currentUrl = null;

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
    if (match && match[0] !== currentUrl) {
      currentUrl = match[0];
      fs.writeFileSync(urlFile, currentUrl.trim() + '\n');
      console.log(`\n======================================================`);
      console.log(`[Tunnel Manager] CLOUDFLARE TUNNEL LIVE: ${currentUrl}`);
      console.log(`======================================================\n`);
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
