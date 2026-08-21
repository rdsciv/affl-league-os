import { test, expect } from "@playwright/test";

test("off-season home is compact and data-backed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /AFFL/i })).toBeVisible();
  await expect(page.getByText(/2025/).first()).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(5);
  await expect(page.locator("table")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(2);
});

test("home states the off-season phase and refuses to invent a 2026 season", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText(/off-season/i);
  await expect(page.getByRole("status")).toContainText(/no statistical season until the draft/i);
  await expect(page.getByText("AFFL 2026", { exact: false }).first()).toBeVisible();
});

test("every module declares its evidence state", async ({ page }) => {
  await page.goto("/");
  const badges = page.locator("[data-evidence]");
  expect(await badges.count()).toBeGreaterThan(4);
  for (const status of await badges.evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-evidence")),
  )) {
    expect(["verified", "reconstructed", "unavailable"]).toContain(status);
  }
});

test("no preview module renders more than five rows", async ({ page }) => {
  await page.goto("/");
  const lists = page.locator("[data-module] ul");
  const counts = await lists.evaluateAll((els) => els.map((e) => e.children.length));
  for (const count of counts) {
    expect(count).toBeLessThanOrEqual(5);
  }
});

test("modules are not a uniform grid of equal cards", async ({ page }, testInfo) => {
  await page.goto("/");
  const modules = page.locator("[data-module]");
  expect(await modules.count()).toBeGreaterThan(3);

  // Visual weight must vary at every width.
  const tones = await modules.evaluateAll((els) => els.map((e) => e.getAttribute("data-tone")));
  expect(new Set(tones).size).toBeGreaterThan(1);

  // Column spans only vary where there are columns; a phone correctly stacks
  // to a single column, which is not an equal-card grid.
  if (testInfo.project.name === "desktop") {
    const widths = await modules.evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().width)),
    );
    expect(new Set(widths).size).toBeGreaterThan(1);
  }
});

test("gated modules are explained rather than zero-filled", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Not shown, and why/i)).toBeVisible();
  await expect(page.getByText(/never collected before 2018/i)).toBeVisible();
  await expect(page.getByText(/No winner grade is published/i)).toBeVisible();
});

test("the command bar opens, interprets, and closes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /search the league/i }).click();
  const dialog = page.getByRole("dialog", { name: /search the league/i });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("textbox").fill("Squaw");
  await expect(dialog.getByText(/Squaw Valley Skinners/).first()).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("home has no console errors or broken assets", async ({ page }) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });

  await page.goto("/", { waitUntil: "networkidle" });
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
