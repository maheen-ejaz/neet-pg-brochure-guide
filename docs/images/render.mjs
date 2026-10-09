// Render the shared HTML source for README, GitHub repository shares and website shares.
// Optional: CHROME or PLAYWRIGHT_MODULE (an installed module's file URL).
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
try {
  for (const [relativePath, width, height, scale] of [
    ["banner.png", 1280, 640, 2],
    ["social-preview.png", 1280, 640, 1],
    ["../../public/og-image.png", 1200, 630, 1],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await page.goto(new URL("banner.html", import.meta.url).href, { waitUntil: "networkidle" });
    await page.evaluate(({ width, height }) => {
      document.documentElement.style.setProperty("--cover-width", `${width}px`);
      document.documentElement.style.setProperty("--cover-height", `${height}px`);
    }, { width, height });
    await page.evaluate(() => document.fonts.ready);
    const brokenImages = await page.locator("img").evaluateAll((images) => images.some((image) => !image.complete || image.naturalWidth === 0));
    if (brokenImages) throw new Error("The dashboard screenshot is missing. Run shots.mjs first.");
    await page.screenshot({ path: fileURLToPath(new URL(relativePath, import.meta.url)) });
    await page.close();
    console.log(`Rendered ${relativePath} (${width} × ${height}, ${scale}x)`);
  }
} finally {
  await browser.close();
}
