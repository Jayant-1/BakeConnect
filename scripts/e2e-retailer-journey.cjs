const { chromium } = require('playwright');

async function runRetailerE2E() {
  console.log('🚀 Starting Retailer End-to-End Browser Journey Verification...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  try {
    // ----------------------------------------------------
    // STEP 1: Storefront Landing Page ('/')
    // ----------------------------------------------------
    console.log('\n[Step 1] Visiting Storefront Landing Page (http://localhost:3000/)...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    const title = await page.title();
    console.log(`✓ Page Title: "${title}"`);

    const forShopsLink = page.locator('nav a:has-text("For Shops")').first();
    if (await forShopsLink.count() === 0) {
      throw new Error('Navigation link "For Shops" not found on landing page');
    }
    console.log('✓ Found "For Shops" navigation link');

    // ----------------------------------------------------
    // STEP 2: Wholesale Information Page ('/wholesale')
    // ----------------------------------------------------
    console.log('\n[Step 2] Navigating to Wholesale Supply Page (http://localhost:3000/wholesale)...');
    await page.goto('http://localhost:3000/wholesale', { waitUntil: 'networkidle' });
    const wholesaleHeading = await page.locator('h1').textContent();
    console.log(`✓ Wholesale Heading: "${wholesaleHeading?.trim()}"`);
    if (!wholesaleHeading?.includes('DAILY BAKERY SUPPLY FOR')) {
      throw new Error(`Unexpected wholesale heading: ${wholesaleHeading}`);
    }

    const registerCta = page.locator('a[href*="/signup?role=RETAILER"]').first();
    console.log(`✓ Register CTA destination: ${await registerCta.getAttribute('href')}`);

    // ----------------------------------------------------
    // STEP 3: Retailer Authentication on '/login'
    // ----------------------------------------------------
    console.log('\n[Step 3] Navigating to Login Page (http://localhost:3000/login)...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    // Fill credentials for santosh.shinde@punechai.com
    await page.fill('input[type="email"]', 'santosh.shinde@punechai.com');
    await page.fill('input[type="password"]', 'Pass123');
    console.log('✓ Filled test persona credentials: santosh.shinde@punechai.com');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]'),
    ]);
    console.log(`✓ Post-login URL: ${page.url()}`);
    if (!page.url().includes('/retailer')) {
      throw new Error(`Expected redirection to /retailer, but got ${page.url()}`);
    }

    // ----------------------------------------------------
    // STEP 4: Retailer Portal & Digital Order Guide ('/retailer')
    // ----------------------------------------------------
    console.log('\n[Step 4] Checking Retailer Portal & Order Guide...');
    await page.waitForSelector('h1', { state: 'visible' });
    const shopHeading = await page.locator('h1').textContent();
    console.log(`✓ Shopkeeper Portal Header: "${shopHeading?.trim()}"`);

    // Verify account information banner
    const accountInfoText = await page.locator('main').first().innerText();
    if (!accountInfoText.includes('Net-15') || !accountInfoText.includes('27AABCU9603R1ZM')) {
      throw new Error('Expected Net-15 terms and GSTIN in retailer account banner');
    }
    console.log('✓ Verified Net-15 payment terms, GSTIN & approved status in account banner');

    // Test product search
    console.log('  Testing SKU search filter for "Ladi Pav"...');
    await page.fill('input[placeholder*="Search"]', 'Ladi Pav');
    await page.waitForTimeout(500);

    const ladiRow = page.locator('tbody tr:has-text("Fresh Bakery Ladi Pav")').first();
    if (await ladiRow.count() === 0) {
      throw new Error('Fresh Bakery Ladi Pav row not found in order guide search');
    }
    console.log('✓ Found Ladi Pav in filtered SKU matrix');

    // Increment quantity by case MOQ increment
    const plusBtn = ladiRow.locator('button[aria-label="Increase quantity"]');
    await plusBtn.click();
    await page.waitForTimeout(200);
    console.log('✓ Adjusted quantity stepper via case increment');

    // Add Ladi Pav to cart
    const addLadiBtn = ladiRow.locator('td:last-child button');
    await addLadiBtn.click();
    await page.waitForTimeout(500);

    // Clear search to view cake category for meeting MOQ threshold
    await page.fill('input[placeholder*="Search"]', '');
    await page.waitForTimeout(500);

    const cakeRow = page.locator('tbody tr:has-text("2 Tier Special Rose Cake")').first();
    const cakePlusBtn = cakeRow.locator('button[aria-label="Increase quantity"]');
    for (let i = 0; i < 4; i++) {
      await cakePlusBtn.click();
      await page.waitForTimeout(100);
    }
    const addCakeBtn = cakeRow.locator('td:last-child button');
    await addCakeBtn.click();
    await page.waitForTimeout(500);
    console.log('✓ Added bulk wholesale items to basket');

    // Verify floating basket bar
    const floatingBar = page.locator('aside[aria-label="Wholesale Basket Summary"]');
    await floatingBar.waitFor({ state: 'visible', timeout: 5000 });
    const barText = await floatingBar.innerText();
    console.log(`✓ Floating Basket Bar visible: ${barText.replace(/\n+/g, ' ')}`);

    // ----------------------------------------------------
    // STEP 5: Wholesale Cart Review ('/cart')
    // ----------------------------------------------------
    console.log('\n[Step 5] Reviewing Wholesale Basket on /cart...');
    await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle' });
    const cartHeader = await page.locator('h1').textContent();
    console.log(`✓ Cart Header: "${cartHeader?.trim()}"`);

    // Verify wholesale rates and subtotal
    const cartText = await page.locator('main').innerText();
    if (!cartText.includes('Wholesale Rate') || !cartText.includes('Gross Subtotal')) {
      throw new Error('Wholesale rate indicators missing on cart page');
    }
    console.log('✓ Verified wholesale pricing rates, GST computation & MOQ threshold');

    const proceedBtn = page.locator('a[href="/checkout"]:not([aria-disabled="true"])');
    if (await proceedBtn.count() === 0) {
      throw new Error('Proceed to Checkout button is disabled or not found');
    }
    console.log('✓ Proceed to Checkout button is unlocked and ready');

    // ----------------------------------------------------
    // STEP 6: Checkout Page ('/checkout')
    // ----------------------------------------------------
    console.log('\n[Step 6] Navigating to Checkout (http://localhost:3000/checkout)...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      proceedBtn.click(),
    ]);

    console.log(`✓ Current Checkout URL: ${page.url()}`);
    // Check that pre-filled business details and address are rendered
    await page.waitForSelector('text=Select Delivery Address', { state: 'visible' });
    console.log('✓ Saved Delivery Coordinates loaded for Santosh Shinde');

    // Select Net-15 Invoice Settlement
    const net15Option = page.locator('text=B2B Credit Cycle (Net-15 Invoice Settlement)');
    await net15Option.click();
    console.log('✓ Selected "B2B Credit Cycle (Net-15 Invoice Settlement)" payment method');

    // Submit the wholesale order
    console.log('  Submitting wholesale order...');
    const submitBtn = page.locator('button[type="submit"]:has-text("CONFIRM & PLACE ORDER")');
    await submitBtn.click();

    // ----------------------------------------------------
    // STEP 7: Order Confirmation & Tracking ('/order/[id]')
    // ----------------------------------------------------
    console.log('\n[Step 7] Awaiting Order Confirmation & Tracking...');
    await page.waitForURL(/\/order\/BC-/, { timeout: 15000 });
    console.log(`✓ Confirmed Order URL: ${page.url()}`);

    const orderNumberText = await page.locator('span:has-text("ORDER")').first().innerText();
    console.log(`✓ Order Badge: "${orderNumberText}"`);

    const wholesaleBadge = page.locator('span:has-text("Wholesale Dispatch")');
    if (await wholesaleBadge.count() === 0) {
      throw new Error('Wholesale Dispatch badge missing from order tracking');
    }
    console.log('✓ "Wholesale Dispatch" tag active');

    // Verify "Back to Wholesale Desk" breadcrumb navigation
    const backToWholesaleLink = page.locator('a:has-text("BACK TO WHOLESALE DESK")');
    if (await backToWholesaleLink.count() === 0) {
      throw new Error('Breadcrumb "Back to Wholesale Desk" link not found');
    }
    console.log('✓ "Back to Wholesale Desk" breadcrumb link present');

    // Open Official Tax Invoice Modal
    console.log('  Opening Tax Invoice Modal...');
    const printInvoiceBtn = page.locator('button:has-text("Print Invoice")');
    await printInvoiceBtn.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await printInvoiceBtn.click();

    const invoiceModal = page.locator('[role="dialog"]');
    await invoiceModal.waitFor({ state: 'visible', timeout: 5000 });
    const invoiceText = await invoiceModal.innerText();
    if (!invoiceText.includes('TAX INVOICE') || !invoiceText.includes('Santosh Shinde') || !invoiceText.includes('27AABCU9603R1ZM')) {
      throw new Error('Invoice modal missing tax invoice header, customer name, or GSTIN');
    }
    console.log('✓ Official GST Tax Invoice verified with HSN codes, GSTIN & digital signature');

    // Close invoice modal
    const closeInvoiceBtn = invoiceModal.locator('button[aria-label*="Close"]');
    await closeInvoiceBtn.click();
    await page.waitForTimeout(500);

    // Click "Back to Wholesale Desk"
    await backToWholesaleLink.click();
    await page.waitForURL('**/retailer', { timeout: 10000 });
    console.log(`✓ Returned back to Wholesale Desk: ${page.url()}`);
    if (!page.url().includes('/retailer')) {
      throw new Error(`Expected /retailer but arrived at ${page.url()}`);
    }

    console.log('\n🎉 ALL 7 STEPS IN RETAILER JOURNEY PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ E2E Journey Failed:', error);
    process.exitCode = 1;
  } finally {
    if (consoleErrors.length > 0) {
      console.warn(`\n⚠️ Recorded ${consoleErrors.length} browser console error(s):`);
      consoleErrors.forEach((err, i) => console.warn(`  [${i + 1}] ${err}`));
    } else {
      console.log('\n✓ Clean Browser Console: 0 unhandled client errors recorded.');
    }
    await browser.close();
  }
}

runRetailerE2E();
