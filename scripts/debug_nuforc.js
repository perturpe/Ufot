const { chromium } = require("playwright");
const fs = require("fs");

async function main() {
  const executablePath = "/Users/omar/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage();

  // Try the main sightings page
  await page.goto("https://nuforc.org/webreports/ndxe202401.html", {
    waitUntil: "networkidle", timeout: 30000
  });

  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log("Title:", title);
  console.log("URL:", page.url());

  // Get all text content to understand structure
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
  console.log("\nBody text preview:\n", bodyText);

  // Check for table elements
  const tables = await page.evaluate(() => {
    const t = document.querySelectorAll("table");
    return Array.from(t).map(table => ({
      rows: table.rows.length,
      firstRow: table.rows[0]?.innerText?.slice(0, 100),
    }));
  });
  console.log("\nTables found:", JSON.stringify(tables, null, 2));

  // Save full HTML for inspection
  const html = await page.content();
  fs.writeFileSync("/tmp/nuforc_debug.html", html);
  console.log("\nFull HTML saved to /tmp/nuforc_debug.html");

  await browser.close();
}

main().catch(console.error);
