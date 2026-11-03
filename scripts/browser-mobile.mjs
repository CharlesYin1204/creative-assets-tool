import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const origin = process.env.TEST_BASE_URL || "http://127.0.0.1:3041";
const password = (await fs.readFile("docs/access.txt", "utf8")).match(
  /以上初始密码：(.+)/,
)[1];
const browser = await chromium.launch({
  executablePath:
    "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const results = [],
  errors = [];
try {
  for (const role of ["admin", "vendor", "artist", "lead"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/login");
    await page.locator("[name=email]").fill(role + "@sharecreators.local");
    await page.locator("[name=password]").fill(password);
    await page.getByRole("button", { name: "登录工作空间" }).click();
    await page.waitForURL("**/workspace");
    await page.locator(".mobile-bottom-nav").waitFor();
    const nav = page.getByRole("navigation", { name: "移动端核心导航" });
    for (const label of [
      "任务",
      role === "vendor" ? "审阅" : "资产",
      "AI 助手",
      "我的",
      "工作台",
    ]) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await page.locator(".page-heading").first().waitFor();
      await page.waitForLoadState("networkidle");
      assert.equal(
        await nav
          .getByRole("link", { name: label, exact: true })
          .getAttribute("aria-current"),
        "page",
      );
    }
    await page.goto(origin + "/account");
    await page.locator(".account-directory").waitFor();
    assert.equal(
      await page.locator(".function-entry").count(),
      role === "admin" ? 19 : role === "vendor" ? 9 : 13,
    );
    const entries = await page
      .locator(".function-entry")
      .evaluateAll((links) =>
        links.map((a) => ({
          href: a.getAttribute("href"),
          label: a.querySelector("b").textContent,
        })),
      );
    for (const entry of entries) {
      await page.goto(origin + "/account");
      await page.locator(`.function-entry[href="${entry.href}"]`).click();
      await page.waitForURL(origin + entry.href);
      await page.locator(".page-heading").first().waitFor();
      await page.waitForLoadState("networkidle");
      if (entry.href.startsWith("/admin/"))
        assert.equal(
          await page.locator(".admin-tabs .selected").innerText(),
          entry.label === "后台项目管理" ? "项目管理" : entry.label,
        );
      if (entry.href === "/account/security")
        await page
          .getByRole("button", { name: "更新密码", exact: true })
          .waitFor();
    }
    results.push(
      role + "：底部五入口、全部功能 " + entries.length + " 个直达链接通过",
    );
    if (role === "admin") {
      for (const width of [320, 360, 390, 430, 680, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        for (const route of [
          "/workspace",
          "/tasks",
          "/assets",
          "/assistant",
          "/account",
          "/account/security",
          "/account/notifications",
          "/admin/models",
        ]) {
          await page.goto(origin + route);
          await page.locator(".page-heading").first().waitFor();
          await page.waitForLoadState("networkidle");
          const dimensions = await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          assert.ok(
            dimensions.scroll <= dimensions.width + 2,
            `${width} ${route} overflow ${JSON.stringify(dimensions)}`,
          );
          assert.equal(await nav.isVisible(), width <= 680);
          if (width <= 680)
            for (const box of await nav
              .locator("a")
              .evaluateAll((as) =>
                as.map((a) => ({ w: a.offsetWidth, h: a.offsetHeight })),
              ))
              assert.ok(box.w >= 44 && box.h >= 44);
        }
        if ([390, 1440].includes(width)) {
          await page.goto(origin + "/account");
          await page.locator(".account-directory").waitFor();
          await page.screenshot({
            path: `docs/mobile/account-${width}.png`,
            fullPage: true,
          });
        }
        results.push(width + "px：8 个页面无横向溢出，导航显示与触控尺寸正常");
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(origin + "/account");
      await page.getByRole("button", { name: "展开导航" }).click();
      await page.locator(".sidebar.open").waitFor();
      await page.getByRole("button", { name: "关闭导航", exact: true }).click();
      assert.equal(await page.locator(".sidebar.open").count(), 0);
      await page.getByRole("link", { name: "查看通知" }).click();
      await page.waitForURL("**/account/notifications");
      assert.match(
        await page.locator(".tabs .selected").innerText(),
        /消息通知/,
      );
      await page.goBack();
      await page.locator(".account-directory").waitFor();
      results.push("手机抽屉开关、通知直达和浏览器返回正常");
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "docs/mobile/results.json",
    JSON.stringify({ ok: true, results, errors }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} catch (e) {
  console.error(e);
  await fs.writeFile(
    "docs/mobile/results.json",
    JSON.stringify({ ok: false, error: e.message, results, errors }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
