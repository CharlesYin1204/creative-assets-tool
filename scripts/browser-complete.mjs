import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 15000 });
import fs from "node:fs/promises";
import {modelFixtures} from "./model-fixtures.mjs";
import { q, db, tx } from "../lib/db.mjs";
const origin = process.env.TEST_URL || "http://127.0.0.1:3041";
const password = (await fs.readFile("docs/access.txt", "utf8")).match(
  /以上初始密码：(.+)/,
)[1];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--enable-unsafe-swiftshader",
  ],
});
const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await ctx.newPage();
const results = [],
  errors = [],
  tasks = [],
  projects = [],
  conversations = [];
page.on("pageerror", (e) => errors.push(e.message));
const pass = (name) => {
  results.push({ name, passed: true });
  console.log("PASS", name);
};
async function api(route, data, method) {
  const r = await ctx.request.fetch(origin + "/api/" + route, {
    method: method || (data ? "POST" : "GET"),
    data,
  });
  if (!r.ok()) throw Error(route + ": " + (await r.text()));
  return r.json();
}
await fs.mkdir("docs/completion/screenshots", { recursive: true });
let project, task;
try {
  await page.goto(origin + "/login");
  await page.locator("[name=email]").fill("admin@sharecreators.local");
  await page.locator("[name=password]").fill(password);
  await page.getByRole("button", { name: "登录工作空间" }).click();
  await page.waitForURL("**/workspace");
  project = await api("projects", {
    name: "浏览器补全验收 " + Date.now(),
    description: "自动清理的浏览器测试项目",
  });
  projects.push(project.id);
  task = await api("tasks", {
    projectId: project.id,
    title: "浏览器三维交付测试",
    requirements: "上传真实模型、记录三维定位意见",
    assigneeId: 1,
    dueDate: "2026-12-31",
    formats: "OBJ,GLB,GLTF,FBX",
    category: "道具",
    requireTexture: false,
    license: "all_projects",
  });
  tasks.push(task.id);
  await page.goto(origin + "/projects");
  const card = page
    .locator(".project-management section")
    .filter({ hasText: "浏览器补全验收" });
  await card.getByRole("button", { name: "编辑资料" }).click();
  await page
    .getByLabel("项目名称", { exact: true })
    .fill("浏览器补全验收 已编辑");
  await page.getByRole("button", { name: "保存项目" }).click();
  await expect(card.getByRole("heading")).toHaveText("浏览器补全验收 已编辑");
  await card.getByRole("button", { name: "成员", exact: true }).click();
  await page.getByText("项目创建人", { exact: true }).waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  pass("项目编辑及成员窗口可操作");
  await page.goto(origin + "/tasks/" + task.id);
  await page.getByRole("button", { name: "编辑任务", exact: true }).click();
  await page
    .getByLabel("任务名称", { exact: true })
    .fill("浏览器三维交付 已编辑");
  await page.getByRole("button", { name: "保存任务" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("已编辑");
  pass("任务编辑实际保存并刷新详情");
  let failed = false;
  await page.route("**/api/tasks/" + task.id + "/files", async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "模拟网络失败，重试验证" }),
      });
    } else await route.continue();
  });
  const obj =
    "v -1 -1 1\nv 1 -1 1\nv 1 1 1\nv -1 1 1\nv -1 -1 -1\nv 1 -1 -1\nv 1 1 -1\nv -1 1 -1\nf 1 2 3 4\nf 6 5 8 7\nf 2 6 7 3\nf 5 1 4 8\nf 4 3 7 8\nf 5 6 2 1\n";
  await page
    .getByLabel("交付文件")
    .setInputFiles({
      name: "browser-cube.obj",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(obj),
    });
  await page.getByRole("button", { name: "重试失败文件" }).click();
  await page
    .locator(".uploaded-row")
    .getByText("browser-cube.obj", { exact: true })
    .waitFor();
  await page.locator("textarea[name=notes]").fill("刷新恢复的交付草稿");
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await page.getByText("草稿已保存", { exact: true }).waitFor();
  await expect
    .poll(async () => (await api("tasks/" + task.id + "/draft")).notes)
    .toBe("刷新恢复的交付草稿");
  await page.reload();
  await expect(page.locator("textarea[name=notes]")).toHaveValue(
    "刷新恢复的交付草稿",
  );
  await page
    .locator(".uploaded-row")
    .getByText("browser-cube.obj", { exact: true })
    .waitFor();
  pass("上传失败可原文件重试，刷新恢复模型和说明");
  for(const f of modelFixtures()) {
    const r=await ctx.request.post(origin+"/api/tasks/"+task.id+"/files",{multipart:{kind:f.kind,file:{name:f.name,mimeType:"application/octet-stream",buffer:f.buffer}}});
    if(!r.ok())throw Error(await r.text());
  }
  await page.reload();
  await page.getByRole("link",{name:"triangle.glb",exact:true}).waitFor();
  await page.getByRole("button", { name: "提交审阅", exact: true }).click();
  await page
    .getByText("当前版本正在审阅，收到结果后可继续提交。", { exact: true })
    .waitFor();
  await page.goto(origin + "/review/" + task.id);
  await page.getByLabel("预览模式").selectOption("3d");
  await page.locator(".model-info").waitFor({ timeout: 30000 });
  await expect(page.locator(".model-info")).toContainText("12 三角面");
  await page.getByRole("button", { name: "位置标注", exact: true }).click();
  const canvas = page.locator(".model-canvas canvas");
  await canvas.click({
    position: {
      x: (await canvas.boundingBox()).width / 2,
      y: (await canvas.boundingBox()).height / 2,
    },
  });
  await page.getByText("已选择三维模型位置", { exact: false }).waitFor();
  await page.locator(".comment-compose textarea").fill("检查立方体正面边缘");
  await page.locator(".comment-compose button[type=submit]").click();
  await page.getByText("检查立方体正面边缘", { exact: true }).waitFor();
  await page.getByLabel("预览模式").selectOption("image");
  await page.getByText("检查立方体正面边缘", { exact: true }).click();
  await expect(page.getByLabel("预览模式")).toHaveValue("3d");
  await page.locator(".model-info").waitFor();
  await page.screenshot({
    path: "docs/completion/screenshots/3d-review.png",
    fullPage: true,
  });
  pass("真实 OBJ 渲染、三维表面标注、评论点击恢复相机");
  const detail = await api("tasks/" + task.id),
    comment = detail.comments.find((c) => c.body === "检查立方体正面边缘");
  assertAnchor(comment.anchor);
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("dialog").locator("textarea").fill("更新后的审阅意见");
  await page.getByRole("button", { name: "保存意见" }).click();
  await page.getByText("更新后的审阅意见", { exact: true }).waitFor();
  pass("评论作者编辑并持久化");
  for(const name of ["triangle.glb","triangle.gltf","triangle.fbx"]) {
    await page.getByLabel("预览模型").selectOption({label:name});
    await expect(page.locator(".model-info")).toContainText("1 三角面",{timeout:30000});
    await expect(page.locator(".model-failure")).toHaveCount(0);
    pass(name+" 真实浏览器解析成功");
  }
  await api("tasks/"+task.id+"/review",{versionId:detail.versions[0].id,decision:"changes_requested",reason:"第二版对比验收"});
  const up=await ctx.request.post(origin+"/api/tasks/"+task.id+"/files",{multipart:{kind:"model",file:{name:"cube-v2.obj",mimeType:"application/octet-stream",buffer:Buffer.from(obj)}}});
  if(!up.ok())throw Error(await up.text());
  const v2=await api("tasks/"+task.id+"/submit",{notes:"第二版真实对比",fileIds:[(await up.json()).id]});
  await page.reload();await page.getByLabel("预览模式").selectOption("3d");await page.getByRole("button",{name:"版本对比",exact:true}).click();
  await expect(page.locator(".model-info")).toHaveCount(2);await expect(page.locator(".model-info").first()).toContainText("三角面");await expect(page.locator(".model-info").last()).toContainText("三角面");
  await page.screenshot({path:"docs/completion/screenshots/3d-compare.png",fullPage:true});pass("双版本三维模型并排渲染");
  await api("tasks/"+task.id+"/review",{versionId:v2.id,decision:"approved"});

  for (const route of [
    "/projects",
    "/assistant",
    "/assistant/history",
    "/account",
    "/admin",
  ]) {
    await page.goto(origin + route);
    await page.locator(".page-heading").waitFor();
    await page.waitForLoadState("networkidle");
    pass(route + "浏览器页面可用");
  }
  await page.goto(origin + "/admin");
  await page.getByRole("button", { name: "操作日志", exact: true }).click();
  await page.getByLabel("搜索日志").waitFor();
  await page.getByRole("button", { name: "下一页" }).click();
  await expect(page.locator(".pager")).toContainText("2 /");
  pass("管理员审计翻页可操作");
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/projects",
      "/assistant",
      "/tasks/" + task.id,
      "/review/" + task.id,
      "/admin",
      "/account",
    ]) {
      await page.goto(origin + route);
      await page.locator(".page-heading").waitFor();
      await page.waitForLoadState("networkidle");
      if (route.startsWith("/review/")) {
        await page.getByLabel("预览模式").selectOption("3d");
        await page.locator(".model-info").waitFor();
      }
      const overflowing = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      if (overflowing.scroll > width + 2)
        throw Error(route + " overflow " + JSON.stringify(overflowing));
      if (width === 360)
        await page.screenshot({
          path:
            "docs/completion/screenshots/mobile-" +
            route.replaceAll("/", "-") +
            ".png",
          fullPage: true,
        });
    }
    pass(width + "px 新增模块与三维画布无页面横向溢出");
  }
  if (errors.length) throw Error(JSON.stringify(errors));
} catch (e) {
  console.error(e);
  results.push({ passed: false, error: e.message });
  await page.screenshot({
    path: "docs/completion/screenshots/failure.png",
    fullPage: true,
  });
  process.exitCode = 1;
} finally {
  await browser.close();
  for (const id of tasks) {
    const files = await q("SELECT path FROM files WHERE task_id=?", [id]);
    await tx(async (c) => {
      await q("DELETE FROM reuses WHERE task_id=?", [id], c);
      await q("DELETE FROM favorites WHERE task_id=?", [id], c);
      for (const v of await q(
        "SELECT id FROM versions WHERE task_id=?",
        [id],
        c,
      )) {
        await q(
          "DELETE FROM comments WHERE version_id=? AND parent_id IS NOT NULL",
          [v.id],
          c,
        );
        await q("DELETE FROM comments WHERE version_id=?", [v.id], c);
      }
      for (const table of ["task_drafts", "files", "versions"])
        await q(`DELETE FROM ${table} WHERE task_id=?`, [id], c);
      await q("DELETE FROM tasks WHERE id=?", [id], c);
    });
    for (const f of files) await fs.unlink("storage/" + f.path).catch(() => {});
    await q("DELETE FROM notifications WHERE link IN (?,?)", [
      "/tasks/" + id,
      "/review/" + id,
    ]);
  }
  for (const id of projects) {
    await q("DELETE FROM project_members WHERE project_id=?", [id]);
    await q("DELETE FROM projects WHERE id=?", [id]);
  }
  await fs.writeFile(
    "docs/completion/browser-results.json",
    JSON.stringify(
      { timestamp: new Date().toISOString(), origin, results, errors },
      null,
      2,
    ),
  );
  await db.end();
}
function assertAnchor(anchor) {
  if (typeof anchor === "string") anchor = JSON.parse(anchor);
  if (anchor?.type !== "3d" || anchor.point.length !== 3)
    throw Error("3D anchor did not persist");
}
