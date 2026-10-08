// Regenerates the README images. Needs the dev server on :5191 (npx vite --port 5191) and Playwright
// (npm i -D playwright && npx playwright install chromium). Optional: CHROME=/path/to/chrome-headless-shell.
import { chromium } from "playwright";
const exe = process.env.CHROME || undefined;
const b=await chromium.launch({executablePath:exe});
const pg=await b.newPage({viewport:{width:1280,height:640},deviceScaleFactor:2});
await pg.goto(new URL("banner.html", import.meta.url).href,{waitUntil:"networkidle"});
await pg.waitForTimeout(500);
await pg.screenshot({path:"banner.png"});
const p1=await b.newPage({viewport:{width:1280,height:640},deviceScaleFactor:1});
await p1.goto(new URL("banner.html", import.meta.url).href,{waitUntil:"networkidle"});await p1.waitForTimeout(500);
await p1.screenshot({path:"social-preview.png"});
await b.close();
