// Candidate shots use the built preview. The review shot uses a separate local dev server.
// Optional: PREVIEW_URL, REVIEW_URL, CHROME, or PLAYWRIGHT_MODULE (an installed module's file URL).
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseUrl = process.env.PREVIEW_URL || "http://localhost:5191";
const reviewUrl = process.env.REVIEW_URL || "http://localhost:5192";
// Synthetic demo profile only. Never capture a candidate's real browser storage.
const profile = { air: 5000, courseType: "clinical", mbbsState: "Karnataka", mbbsInstitution: null, domicileState: "Karnataka", schoolState: "Karnataka", tenYearStudyState: "Karnataka", birthState: "Karnataka", nriLink: "none", parentRouteState: "none", category: "UR", pwd: false, inServiceState: "none", inServiceListed: null, priorAdmissionState: "none", internshipCompletion: "2026-03-31", currentlyInPG: false, nationality: "indian", specialities: [] };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
try {
  for (const [name, url, width, height, colorScheme, demoProfile] of [
    ["home", "/", 1440, 1200, "light", false],
    ["state", "/state/karnataka-2026", 1440, 1100, "light", true],
    ["mcc", "/mcc/mcc-pg-2026", 1440, 1100, "light", true],
    ["profile", "/profile", 1440, 1100, "light", true],
    ["review", "/review/karnataka-2026", 1440, 900, "light", false],
    ["state-phone", "/state/karnataka-2026", 390, 1000, "light", true],
    ["state-dark", "/state/karnataka-2026", 1440, 1100, "dark", true],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme });
    if (demoProfile) await context.addInitScript((p) => localStorage.setItem("neetpg-guide:profile:v1", JSON.stringify(p)), profile);
    const page = await context.newPage();
    await page.goto(new URL(url, name === "review" ? reviewUrl : baseUrl).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, import.meta.url)) });
    await context.close();
    console.log(`Captured ${name}.png`);
  }
} finally {
  await browser.close();
}
