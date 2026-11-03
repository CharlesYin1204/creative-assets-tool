import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { q, db, tx } from "../lib/db.mjs";
const origin = process.env.TEST_URL || "http://127.0.0.1:3041";
const password = (await fs.readFile("docs/access.txt", "utf8")).match(
  /以上初始密码：(.+)/,
)[1];
const cookies = {},
  projects = [],
  tasks = [],
  users = [],
  conversations = [],
  results = [];
const stamp = "补全验收" + Date.now();
async function call(who, route, data, method, expected = 200) {
  const headers = {};
  if (cookies[who]) headers.Cookie = cookies[who];
  if (data && !(data instanceof FormData))
    headers["Content-Type"] = "application/json";
  const r = await fetch(origin + "/api/" + route, {
    method: method || (data ? "POST" : "GET"),
    headers,
    body: data
      ? data instanceof FormData
        ? data
        : JSON.stringify(data)
      : undefined,
  });
  const json = await r.json();
  assert.equal(r.status, expected, `${who} ${route}: ${JSON.stringify(json)}`);
  if (route === "auth/login" && r.ok)
    cookies[who] = r.headers.get("set-cookie").split(";")[0];
  return json;
}
function pass(name) {
  results.push({ name, passed: true });
  console.log("PASS", name);
}
async function upload(tid, name, content, kind = "model") {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", new Blob([content]), name);
  return call("vendor", `tasks/${tid}/files`, form);
}
async function updateTask(id, values, expected = 200) {
  const t = await call("admin", `tasks/${id}`);
  return call(
    "admin",
    `tasks/${id}`,
    { revision: t.revision, ...values },
    "PATCH",
    expected,
  );
}
async function updateProject(id, values, expected = 200) {
  const [p] = await q("SELECT revision FROM projects WHERE id=?", [id]);
  return call(
    "admin",
    `projects/${id}`,
    { revision: p.revision, ...values },
    "PATCH",
    expected,
  );
}
const obj = "v -1 0 0\nv 1 0 0\nv 0 2 0\nf 1 2 3\n";
try {
  for (const who of ["admin", "lead", "artist", "vendor", "other"])
    await call(who, "auth/login", {
      email: who + "@sharecreators.local",
      password,
    });
  const p = await call("admin", "projects", {
    name: stamp,
    description: "项目闭环验证",
  });
  projects.push(p.id);
  const p2 = await call("admin", "projects", {
    name: stamp + "引用",
    description: "引用项目",
  });
  projects.push(p2.id);
  await call("admin", `projects/${p.id}/members`, { userId: 2 });
  await call("admin", `projects/${p2.id}/members`, { userId: 3 });
  await call(
    "lead",
    `projects/${p.id}`,
    { revision: 1, name: stamp + "更新" },
    "PATCH",
  );
  await call(
    "admin",
    `projects/${p.id}`,
    { revision: 1, name: "过期覆盖" },
    "PATCH",
    409,
  );
  await call(
    "artist",
    `projects/${p.id}`,
    { revision: 2, name: "越权" },
    "PATCH",
    403,
  );
  pass("项目编辑、乐观锁与角色权限");
  await call("admin", `projects/${p.id}/members`, { userId: 3 });
  await call("admin", `projects/${p.id}/members/3`, null, "DELETE");
  await call("artist", `projects/${p.id}/members`, null, "GET", 403);
  await call("admin", `projects/${p.id}/members/1`, null, "DELETE", 400);
  pass("成员移除立即撤销访问且创建人受保护");
  const t = await call("lead", "tasks", {
    projectId: p.id,
    title: stamp,
    requirements: "检查历史与草稿",
    assigneeId: 4,
    dueDate: "2026-12-31",
    formats: "OBJ",
    category: "场景",
    requireTexture: false,
    license: "all_projects",
  });
  tasks.push(t.id);
  const before = await call("lead", `tasks/${t.id}`);
  await updateTask(t.id, { title: stamp + "修改", priority: "high" });
  await call(
    "lead",
    `tasks/${t.id}`,
    { revision: before.revision, title: "旧窗口" },
    "PATCH",
    409,
  );
  await updateTask(t.id, { dueDate: "2026-02-30" }, 400);
  await updateTask(t.id, { formats: "EXE" }, 400);
  pass("任务编辑冲突、日期及格式校验");
  await updateTask(t.id, { assigneeId: 3 });
  await call("vendor", `tasks/${t.id}`, null, "GET", 403);
  await call("admin", `projects/${p.id}/members/3`, null, "DELETE", 409);
  await updateTask(t.id, { assigneeId: 4 });
  await call("admin", `projects/${p.id}/members/3`, null, "DELETE");
  pass("任务重新分配与负责人访问即时更新");
  await call(
    "vendor",
    `tasks/${t.id}/draft`,
    { notes: "刷新后仍在的版本说明" },
    "PATCH",
  );
  const discarded = await upload(t.id, "discard.obj", obj),
    model = await upload(t.id, "keep.obj", obj);
  const draft = await call("vendor", `tasks/${t.id}/draft`);
  assert.equal(draft.notes, "刷新后仍在的版本说明");
  assert.equal(draft.files.length, 2);
  await call("lead", `tasks/${t.id}/draft`, null, "GET", 403);
  await call("vendor", `files/${discarded.id}`, null, "DELETE");
  assert.equal((await call("vendor", `tasks/${t.id}/draft`)).files.length, 1);
  assert.equal(
    (
      await fetch(origin + "/api/files/" + discarded.id, {
        headers: { Cookie: cookies.vendor },
      })
    ).status,
    404,
  );
  pass("上传与说明草稿持久化、隔离和移除");
  await updateTask(t.id, { archived: true });
  await call(
    "vendor",
    `tasks/${t.id}/draft`,
    { notes: "禁止归档写入" },
    "PATCH",
    409,
  );
  await call(
    "vendor",
    `tasks/${t.id}/submit`,
    { notes: "禁止归档提交", fileIds: [model.id] },
    "POST",
    409,
  );
  await updateTask(t.id, { archived: false });
  pass("任务归档只读与恢复");
  await updateProject(p.id, { archived: true });
  await call(
    "vendor",
    `tasks/${t.id}/draft`,
    { notes: "禁止项目归档写入" },
    "PATCH",
    409,
  );
  await updateTask(t.id, { archived: true }, 409);
  await updateProject(p.id, { archived: false });
  pass("项目归档阻止任务和交付写入");
  const v = await call("vendor", `tasks/${t.id}/submit`, {
    notes: draft.notes,
    fileIds: [model.id],
  });
  assert.equal((await call("vendor", `tasks/${t.id}/draft`)).notes, "");
  await call("vendor", `files/${model.id}`, null, "DELETE", 409);
  await updateTask(t.id, { assigneeId: 3 }, 409);
  pass("提交清除草稿，历史文件不可删除，审阅中不可换负责人");
  const anchor = {
    type: "3d",
    point: [0, 1, 0],
    camera: [2, 2, 4],
    target: [0, 0, 0],
    modelId: model.id,
  };
  await call(
    "lead",
    "comments",
    {
      versionId: v.id,
      body: "非法定位",
      anchor: { ...anchor, modelId: discarded.id },
    },
    "POST",
    400,
  );
  await call(
    "lead",
    "comments",
    { versionId: v.id, body: "非法坐标", anchor: { ...anchor, point: [0, 1] } },
    "POST",
    400,
  );
  const comment = await call("lead", "comments", {
    versionId: v.id,
    body: "三维位置检查",
    anchor,
  });
  let detail = await call("lead", `tasks/${t.id}`);
  let saved = detail.comments.find((c) => c.id === comment.id).anchor;
  if (typeof saved === "string") saved = JSON.parse(saved);
  assert.deepEqual(saved, anchor);
  await call(
    "vendor",
    `comments/${comment.id}/edit`,
    { body: "越权" },
    "PATCH",
    403,
  );
  await call(
    "lead",
    `comments/${comment.id}/edit`,
    { body: "调整顶部轮廓" },
    "PATCH",
  );
  pass("三维评论绑定正确版本，坐标保存及作者编辑权限");
  await call("lead", `comments/${comment.id}`, { resolved: true }, "PATCH");
  await call("lead", `tasks/${t.id}/review`, {
    versionId: v.id,
    decision: "approved",
  });
  await call(
    "lead",
    `comments/${comment.id}/edit`,
    { body: "改历史" },
    "PATCH",
    409,
  );
  pass("验收后评论不可改写");
  const reuse = await call("artist", `assets/${t.id}/reuse`, {
    projectId: p2.id,
    accepted: true,
  });
  await updateTask(t.id, { license: "source_only" }, 409);
  await call("lead", `assets/${t.id}/visibility`, { visible: false }, "PATCH");
  await call("artist", `assets/${t.id}`, null, "GET", 404);
  assert.equal(
    (
      await fetch(origin + "/api/files/" + model.id, {
        headers: { Cookie: cookies.artist },
      })
    ).status,
    200,
  );
  await call("lead", `assets/${t.id}/visibility`, { visible: true }, "PATCH");
  pass("下架阻止新访问，已有引用保留；已有跨项目引用禁止收紧授权");
  const second = await upload(t.id, "next.obj", obj),
    v2 = await call("vendor", `tasks/${t.id}/submit`, {
      notes: "更新版",
      fileIds: [second.id],
    });
  await call("lead", `tasks/${t.id}/review`, {
    versionId: v2.id,
    decision: "approved",
  });
  assert.equal(
    (
      await fetch(origin + "/api/files/" + model.id, {
        headers: { Cookie: cookies.artist },
      })
    ).status,
    200,
  );
  await call("other", `reuses/${reuse.id}`, null, "DELETE", 403);
  await call("artist", `reuses/${reuse.id}`, null, "DELETE");
  assert.equal(
    (
      await fetch(origin + "/api/files/" + model.id, {
        headers: { Cookie: cookies.artist },
      })
    ).status,
    403,
  );
  pass("引用固定历史版本可下载，移除引用后撤销历史文件访问");
  const person = await call("admin", "admin/users", {
    name: stamp,
    email: stamp + "@example.test",
    role: "artist",
    password: "VerifyOnly!2026",
  });
  users.push(person.id);
  await call("temp", "auth/login", {
    email: stamp + "@example.test",
    password: "VerifyOnly!2026",
  });
  await call(
    "admin",
    `admin/users/${person.id}/profile`,
    { name: stamp + "资料", email: stamp + "@example.test" },
    "PATCH",
  );
  await call(
    "admin",
    `admin/users/${person.id}/password`,
    { password: "NewVerifyOnly!2026" },
    "POST",
  );
  await call("temp", "me", null, "GET", 401);
  await call("temp", "auth/login", {
    email: stamp + "@example.test",
    password: "NewVerifyOnly!2026",
  });
  pass("管理员资料编辑及密码重置撤销全部会话");
  for (let i = 0; i < 23; i++)
    await q("INSERT INTO notifications(user_id,title,link) VALUES(?,?,?)", [
      person.id,
      stamp + i,
      "/account",
    ]);
  let n = await call("temp", "notifications");
  assert.equal(n.total, 23);
  assert.equal(n.items.length, 20);
  assert.equal(n.unreadCount, 23);
  await call("temp", `notifications/${n.items[0].id}`, { read: true }, "PATCH");
  await call(
    "artist",
    `notifications/${n.items[1].id}`,
    { read: true },
    "PATCH",
    404,
  );
  n = await call("temp", "notifications?page=2");
  assert.equal(n.items.length, 3);
  assert.equal(n.unreadCount, 22);
  pass("通知分页、未读数和归属权限");
  const audit = await call("admin", "admin/records?type=audit");
  assert(audit.total > 25);
  assert.equal(audit.items.length, 25);
  const page2 = await call("admin", "admin/records?type=audit&page=2");
  assert(page2.items.every((r) => !audit.items.some((a) => a.id === r.id)));
  const csv = await fetch(origin + "/api/admin/records?type=audit&export=1", {
    headers: { Cookie: cookies.admin },
  });
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get("content-type"), /text\/csv/);
  assert((await csv.text()).includes("更新项目"));
  await call("artist", "admin/records?type=audit", null, "GET", 403);
  pass("管理员日志完整分页、CSV 导出与访问控制");
  const overview = await call("admin", "admin/overview");
  assert(overview.models.every((m) => !m.key_encrypted && !m.apiKey));
  const m = overview.models[0],
    config = {
      name: m.name,
      model: m.model,
      baseUrl: m.base_url,
      enabled: !!m.enabled,
      isDefault: !!m.is_default,
      maxTokens: m.max_tokens,
      timeoutSeconds: m.timeout_seconds,
    };
  await call(
    "admin",
    `admin/models/${m.id}`,
    { ...config, maxTokens: 1 },
    "PATCH",
    400,
  );
  await call(
    "admin",
    `admin/models/${m.id}`,
    { ...config, isDefault: true, enabled: false },
    "PATCH",
    400,
  );
  await call(
    "admin",
    `admin/models/${m.id}`,
    { ...config, maxTokens: 2048, timeoutSeconds: 90 },
    "PATCH",
  );
  const changed = (await call("admin", "admin/overview")).models.find(
    (x) => x.id === m.id,
  );
  assert.equal(changed.max_tokens, 2048);
  assert.equal(changed.timeout_seconds, 90);
  await call("admin", `admin/models/${m.id}`, config, "PATCH");
  pass("模型参数持久化、无效配置拒绝且密钥不回传");
  const conv = await call("admin", "ai/conversations", { title: "新对话" });
  conversations.push(conv.id);
  await call("artist", `ai/conversations/${conv.id}`, null, "GET", 404);
  if (process.env.TEST_AI === "1") {
    const r1 = await call("admin", `ai/conversations/${conv.id}/messages`, {
      prompt: "请记住本次验收代号：SC-4729。只回复已记住。",
    });
    assert(r1.text);
    const r2 = await call("admin", `ai/conversations/${conv.id}/messages`, {
      prompt: "上一条消息里的验收代号是什么？只输出代号。",
    });
    assert.match(r2.text, /SC-4729/i);
    assert.equal(
      (await call("admin", `ai/conversations/${conv.id}`)).messages.length,
      4,
    );
    pass("真实 AI 多轮上下文与消息持久化");
  }
  await call(
    "admin",
    `ai/conversations/${conv.id}`,
    { title: stamp, archived: true },
    "PATCH",
  );
  assert(
    (await call("admin", "ai/conversations?archived=1")).some(
      (c) => c.id === conv.id,
    ),
  );
  await call(
    "admin",
    `ai/conversations/${conv.id}/messages`,
    { prompt: "归档不可发送" },
    "POST",
    409,
  );
  await call(
    "admin",
    `ai/conversations/${conv.id}`,
    { archived: false },
    "PATCH",
  );
  assert(
    (await call("admin", "ai/conversations")).some((c) => c.id === conv.id),
  );
  pass("AI 会话隔离、重命名、归档与恢复");
} catch (e) {
  results.push({ passed: false, error: e.message });
  console.error(e);
  process.exitCode = 1;
} finally {
  for (const id of conversations) {
    await q("DELETE FROM ai_messages WHERE conversation_id=?", [id]);
    await q("DELETE FROM ai_conversations WHERE id=?", [id]);
  }
  for (const id of tasks) {
    const stored = await q("SELECT path FROM files WHERE task_id=?", [id]);
    await tx(async (c) => {
      await q("DELETE FROM favorites WHERE task_id=?", [id], c);
      await q("DELETE FROM reuses WHERE task_id=?", [id], c);
      const vs = await q("SELECT id FROM versions WHERE task_id=?", [id], c);
      for (const v of vs) {
        await q(
          "DELETE FROM comments WHERE version_id=? AND parent_id IS NOT NULL",
          [v.id],
          c,
        );
        await q("DELETE FROM comments WHERE version_id=?", [v.id], c);
      }
      await q("DELETE FROM task_drafts WHERE task_id=?", [id], c);
      await q("DELETE FROM files WHERE task_id=?", [id], c);
      await q("DELETE FROM versions WHERE task_id=?", [id], c);
      await q(
        "DELETE FROM notifications WHERE link IN (?,?)",
        ["/tasks/" + id, "/review/" + id],
        c,
      );
      await q("DELETE FROM tasks WHERE id=?", [id], c);
    });
    for (const f of stored)
      await fs.unlink("storage/" + f.path).catch(() => {});
  }
  for (const id of projects) {
    await q("DELETE FROM project_members WHERE project_id=?", [id]);
    await q("DELETE FROM projects WHERE id=?", [id]);
  }
  for (const id of users) {
    await q("DELETE FROM notifications WHERE user_id=?", [id]);
    await q("DELETE FROM sessions WHERE user_id=?", [id]);
    await q("DELETE FROM users WHERE id=?", [id]);
  }
  await fs.writeFile(
    "docs/completion/api-results.json",
    JSON.stringify(
      { timestamp: new Date().toISOString(), origin, results },
      null,
      2,
    ),
  );
  await db.end();
  console.log(
    `${results.filter((r) => r.passed).length}/${results.length} passed; own test records cleaned.`,
  );
}
