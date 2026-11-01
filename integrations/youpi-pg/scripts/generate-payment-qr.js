import fs from 'node:fs';
import path from 'node:child_process';
import { generateQrSvg } from '@youpi/core';
import cp from 'node:child_process';

const uri = 'upi://pay?pa=9699197282@ibl&pn=MRUNAL%20KAILASH%20JADHAV&am=1.15&cu=INR&tn=TEST-LIVE-115';
const svg = generateQrSvg(uri, 360);
const outDir = '/home/jayant/.gemini/antigravity/brain/47e45267-1aa4-46fc-a18e-a481cc4cf807';
const svgPath = `${outDir}/live_test_payment_qr.svg`;
const htmlPath = `${outDir}/live_test_payment_qr.html`;
const pngPath = `${outDir}/live_test_payment_qr.png`;

fs.writeFileSync(svgPath, svg);

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    margin: 0;
    padding: 30px;
    background: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #ffffff;
  }
  .card {
    background: #ffffff;
    padding: 28px;
    border-radius: 20px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #1e293b;
    max-width: 400px;
    width: 100%;
    box-sizing: border-box;
  }
  .header {
    text-align: center;
    margin-bottom: 16px;
  }
  .title {
    font-size: 19px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .sub {
    font-size: 13px;
    color: #64748b;
  }
  .badge {
    margin-top: 10px;
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
    padding: 6px 20px;
    border-radius: 9999px;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    display: inline-block;
  }
  .qr-box {
    background: #ffffff;
    padding: 12px;
    border-radius: 12px;
    border: 2px solid #e2e8f0;
    margin: 16px 0;
  }
  .qr-box svg {
    display: block;
    width: 280px;
    height: 280px;
  }
  .footer {
    font-size: 13px;
    color: #64748b;
    text-align: center;
    line-height: 1.5;
  }
  .vpa {
    font-weight: 700;
    color: #2563eb;
    background: #eff6ff;
    padding: 2px 8px;
    border-radius: 6px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">BakeConnect / YOUPI Gateway</div>
      <div class="sub">Scan with PhonePe, GPay, Paytm, BHIM, or CRED</div>
      <div class="badge">₹ 1.15</div>
    </div>
    <div class="qr-box">
      ${svg}
    </div>
    <div class="footer">
      Payee: <strong style="color:#0f172a">MRUNAL KAILASH JADHAV</strong><br>
      UPI ID: <span class="vpa">9699197282@ibl</span><br>
      <span style="font-size:11px; color:#94a3b8; margin-top:4px; display:inline-block;">Ref Order: TEST-LIVE-115 • Auto-Reconciles via SMS</span>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(htmlPath, html);

try {
  cp.execSync(`/opt/google/chrome/chrome --headless=new --screenshot="${pngPath}" --window-size=480,680 --default-background-color=0f172a "file://${htmlPath}"`);
  console.log('PNG generated at:', pngPath);
} catch (err) {
  console.error('Error generating screenshot:', err);
}
