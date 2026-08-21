import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Screenshot crawl for design review. Not part of the verification gate —
 * run explicitly with `npx playwright test tests/e2e/shots.spec.ts`.
 */
const ROUTES: [string, string][] = [
  ["/", "control-room"],
  ["/season", "season"],
  ["/front-office", "front-office"],
  ["/players", "players"],
  ["/players/3139477", "player-os"],
  ["/franchises/m02", "franchise"],
  ["/archive", "archive"],
  ["/exports/2025-champion", "export"],
];

const OUT = "screens";

test.describe.configure({ mode: "parallel" });

for (const [route, name] of ROUTES) {
  test(`shot ${name}`, async ({ page }, testInfo) => {
    mkdirSync(OUT, { recursive: true });
    const response = await page.goto(route, { waitUntil: "networkidle" });
    if (!response || response.status() >= 400) {
      test.skip(true, `${route} not built yet`);
      return;
    }
    await page.waitForTimeout(350);
    await page.screenshot({
      path: `${OUT}/${name}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
}
