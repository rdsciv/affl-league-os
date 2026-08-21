import { test } from "@playwright/test";

/** Throwaway diagnostic probe. Not part of the gate. */
test("probe skill bars", async ({ page }) => {
  await page.goto("/");
  const info = await page.evaluate(() => {
    const mod = document.querySelector('[data-module="roto"]');
    if (!mod) return { error: "no roto module" };
    const all = [...mod.querySelectorAll<HTMLElement>("*")].filter((e) => e.style.width);
    return {
      count: all.length,
      samples: all.slice(0, 6).map((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const parent = el.parentElement!;
        return {
          cls: el.className,
          inlineWidth: el.style.width,
          bg: cs.backgroundColor,
          w: Math.round(r.width),
          h: Math.round(r.height),
          parentW: Math.round(parent.getBoundingClientRect().width),
          parentBg: getComputedStyle(parent).backgroundColor,
          parentDisplay: getComputedStyle(parent).display,
          display: cs.display,
        };
      }),
    };
  });
  console.log(JSON.stringify(info, null, 2));
});
