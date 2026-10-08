// Regenerates the README images. Needs the dev server on :5191 (npx vite --port 5191) and Playwright
// (npm i -D playwright && npx playwright install chromium). Optional: CHROME=/path/to/chrome-headless-shell.
import { chromium } from "playwright";
const exe = process.env.CHROME || undefined;
const profile = { air: 5000, courseType: "clinical", mbbsState: "Karnataka", mbbsInstitution: null, domicileState: "Karnataka", schoolState: "Karnataka", tenYearStudyState: "Karnataka", birthState: "Karnataka", nriLink: "none", parentRouteState: "none", category: "UR", pwd: false, inServiceState: "none", inServiceListed: null, priorAdmissionState: "none", internshipCompletion: "2026-03-31", currentlyInPG: false, nationality: "indian", specialities: [] };
const b = await chromium.launch({ executablePath: exe });
for (const [name, url, w, h, scheme] of [
  ["home", "/", 1280, 900, "light"],
  ["state", "/state/karnataka-2026", 1280, 900, "light"],
  ["mcc", "/mcc/mcc-pg-2026", 1280, 900, "light"],
  ["review", "/review/karnataka-2026", 1440, 900, "light"],
  ["state-phone", "/state/karnataka-2026", 390, 844, "light"],
  ["state-dark", "/state/karnataka-2026", 1280, 900, "dark"],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: scheme });
  await ctx.addInitScript((p) => localStorage.setItem("neetpg-guide:profile:v1", JSON.stringify(p)), profile);
  const pg = await ctx.newPage();
  await pg.goto("http://localhost:5191" + url, { waitUntil: "networkidle" });
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: `${name}.png` });
  await ctx.close();
}
await b.close();
