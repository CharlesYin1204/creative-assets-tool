import { parseAssetIds } from "../../../lib/ai-search.mjs";
import {
  modules,
  writableTask,
  writableProject,
  anchorValue,
  formats,
  validDate,
} from "../../../lib/modules.mjs";
import { NextResponse } from "next/server";
import { q, tx } from "../../../lib/db.mjs";
import {
  user,
  roles,
  fail,
  text,
  num,
  sha,
  taskAccess,
  projectAccess,
  audit,
  notify,
  rate,
} from "../../../lib/auth.mjs";
import { runAI, encrypt, safeBase } from "../../../lib/ai.mjs";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (d) =>
  NextResponse.json(d, { headers: { "Cache-Control": "no-store" } });
const elevated = (u) => roles(u, "admin", "lead");
const fields = "id,name,email,role,active,bio,created_at";
async function taskList(u, library = false) {
  const base =
    "SELECT t.*,COALESCE((SELECT CONCAT('/api/files/',f.id,'?inline=1') FROM files f WHERE f.deleted_at IS NULL AND f.task_id=t.id AND f.kind='preview' AND f.version_id=t.approved_version_id ORDER BY f.id DESC LIMIT 1),t.preview) preview,p.archived project_archived,p.name project_name,u.name assignee_name,v.number version_number,(SELECT COUNT(*) FROM versions WHERE task_id=t.id) version_count FROM tasks t JOIN projects p ON p.id=t.project_id JOIN users u ON u.id=t.assignee_id LEFT JOIN versions v ON v.id=t.approved_version_id";
  if (library) {
    roles(u, "admin", "lead", "artist");
    return q(
      base +
        " WHERE t.approved_version_id IS NOT NULL AND t.library_visible=1 ORDER BY t.updated_at DESC",
    );
  }
  if (u.role === "vendor")
    return q(base + " WHERE t.assignee_id=? ORDER BY t.updated_at DESC", [
      u.id,
    ]);
  if (u.role === "admin") return q(base + " ORDER BY t.updated_at DESC");
  return q(
    base +
      " WHERE EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=t.project_id AND pm.user_id=?) ORDER BY t.updated_at DESC",
    [u.id],
  );
}
async function handle(req, ctx) {
  const a = (await ctx.params).path,
    route = a.join("/"),
    method = req.method;
  let body;
  if (method !== "GET") {
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== req.headers.get("host"))
          fail("请求来源无效", 403);
      } catch {
        fail("请求来源无效", 403);
      }
    }
    if (Number(req.headers.get("content-length") || 0) > 27 * 1024 * 1024)
      fail("文件不能超过 25MB", 413);
    if (!req.headers.get("content-type")?.includes("multipart")) {
      if (Number(req.headers.get("content-length") || 0) > 64000)
        fail("请求过大", 413);
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }
  }
  if (route === "health") return response({ ok: !!(await q("SELECT 1 n"))[0] });
  if (route === "auth/login" && method === "POST") {
    const email = text(body.email, "邮箱", 190).toLowerCase();
    await rate("login:" + sha(email).slice(0, 32), 15, 600);
    const found = (
      await q("SELECT * FROM users WHERE email=? AND active=1", [email])
    )[0];
    if (
      !found ||
      !(await bcrypt.compare(String(body.password || ""), found.password_hash))
    )
      fail("邮箱或密码错误", 401);
    const token = crypto.randomBytes(32).toString("hex");
    await q(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))",
      [sha(token), found.id],
    );
    const r = response({ ok: true });
    r.cookies.set("sc_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(req.url).protocol === "https:",
      path: "/",
      maxAge: 604800,
    });
    await audit(found, "登录", "session");
    return r;
  }
  if (route === "auth/logout" && method === "POST") {
    const t = req.cookies.get("sc_session")?.value;
    if (t) await q("DELETE FROM sessions WHERE token_hash=?", [sha(t)]);
    const r = response({ ok: true });
    r.cookies.delete("sc_session");
    return r;
  }
  const u = await user(req);
  const extra = await modules({
    u,
    a,
    route,
    method,
    body,
    req,
    reply: response,
    taskList,
  });
  if (extra) return extra;
  if (route === "me" && method === "GET") return response(u);
  if (route === "me" && method === "PATCH") {
    const name = text(body.name, "姓名", 80),
      bio = String(body.bio || "").slice(0, 500);
    if (body.password) {
      if (String(body.password).length < 10) fail("新密码至少 10 位");
      const old = (
        await q("SELECT password_hash FROM users WHERE id=?", [u.id])
      )[0];
      if (
        !(await bcrypt.compare(
          String(body.oldPassword || ""),
          old.password_hash,
        ))
      )
        fail("当前密码错误");
      await q("UPDATE users SET password_hash=? WHERE id=?", [
        await bcrypt.hash(body.password, 12),
        u.id,
      ]);
      await q("DELETE FROM sessions WHERE user_id=? AND token_hash<>?", [
        u.id,
        sha(req.cookies.get("sc_session").value),
      ]);
    }
    await q("UPDATE users SET name=?,bio=? WHERE id=?", [name, bio, u.id]);
    await audit(u, "更新个人资料", u.id);
    return response({ ok: true });
  }
  if (route === "bootstrap" && method === "GET") {
    const tasks = await taskList(u);
    let projects = await q(
      u.role === "admin"
        ? "SELECT * FROM projects ORDER BY id"
        : "SELECT DISTINCT p.* FROM projects p LEFT JOIN project_members m ON m.project_id=p.id WHERE m.user_id=? OR EXISTS(SELECT 1 FROM tasks t WHERE t.project_id=p.id AND t.assignee_id=?) ORDER BY p.id",
      u.role === "admin" ? [] : [u.id, u.id],
    );
    const people = ["admin", "lead"].includes(u.role)
      ? await q("SELECT id,name,role FROM users WHERE active=1")
      : [];
    return response({
      user: u,
      unreadCount: (
        await q(
          "SELECT COUNT(*) n FROM notifications WHERE user_id=? AND is_read=0",
          [u.id],
        )
      )[0].n,
      tasks,
      projects,
      people,
      notifications: await q(
        "SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 80",
        [u.id],
      ),
      favorites: (
        await q("SELECT task_id FROM favorites WHERE user_id=?", [u.id])
      ).map((x) => x.task_id),
      reuses: await q(
        "SELECT r.*,t.title,p.archived project_archived,p.name project_name,v.number version_number,av.number latest_number,t.approved_version_id FROM reuses r JOIN tasks t ON t.id=r.task_id JOIN projects p ON p.id=r.project_id JOIN versions v ON v.id=r.version_id JOIN versions av ON av.id=t.approved_version_id WHERE r.user_id=? ORDER BY r.id DESC",
        [u.id],
      ),
    });
  }
  if (route === "projects" && method === "POST") {
    elevated(u);
    const name = text(body.name, "项目名称", 150),
      description = text(body.description, "项目描述", 2000);
    const id = await tx(async (c) => {
      const r = await q(
        "INSERT INTO projects(name,description,owner_id) VALUES(?,?,?)",
        [name, description, u.id],
        c,
      );
      await q(
        "INSERT INTO project_members(project_id,user_id) VALUES(?,?)",
        [r.insertId, u.id],
        c,
      );
      return r.insertId;
    });
    await audit(u, "创建项目", id);
    return response({ id });
  }
  if (a[0] === "projects" && a[2] === "members") {
    const id = num(a[1]);
    await projectAccess(u, id);
    elevated(u);
    if (method === "GET")
      return response(
        await q(
          "SELECT u.id,u.name,u.role FROM project_members m JOIN users u ON u.id=m.user_id WHERE m.project_id=?",
          [id],
        ),
      );
    if (method === "POST") {
      await writableProject(id);
      const uid = num(body.userId);
      const member = (
        await q("SELECT role FROM users WHERE id=? AND active=1", [uid])
      )[0];
      if (!member || member.role === "vendor")
        fail("外包通过任务授权，请选择内部成员");
      await q(
        "INSERT IGNORE INTO project_members(project_id,user_id) VALUES(?,?)",
        [id, uid],
      );
      await audit(u, "添加项目成员", id, String(uid));
      return response({ ok: true });
    }
  }
  if (route === "tasks" && method === "POST") {
    elevated(u);
    const pid = num(body.projectId);
    await projectAccess(u, pid);
    await writableProject(pid);
    const assignee = num(body.assigneeId);
    if (
      !(await q("SELECT id FROM users WHERE id=? AND active=1", [assignee]))
        .length
    )
      fail("负责人不存在");
    const due = validDate(body.dueDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !Number.isFinite(Date.parse(due)))
      fail("截止日期无效");
    const title = text(body.title, "任务名称", 150),
      requirements = text(body.requirements, "制作要求", 6000);
    const r = await q(
      "INSERT INTO tasks(project_id,title,requirements,category,formats,require_texture,assignee_id,creator_id,due_date,priority,license,license_note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        pid,
        title,
        requirements,
        ["场景", "角色", "道具", "材质", "特效"].includes(body.category)
          ? body.category
          : "场景",
        formats(body.formats || "OBJ,FBX,GLB"),
        body.requireTexture !== false,
        assignee,
        u.id,
        due,
        body.priority === "high" ? "high" : "normal",
        body.license === "source_only" ? "source_only" : "all_projects",
        String(
          body.licenseNote || "仅限公司内部项目，不得对外分发或转售",
        ).slice(0, 500),
      ],
    );
    const person = (
      await q("SELECT role FROM users WHERE id=?", [assignee])
    )[0];
    if (person.role !== "vendor")
      await q(
        "INSERT IGNORE INTO project_members(project_id,user_id) VALUES(?,?)",
        [pid, assignee],
      );
    await notify(assignee, "新交付任务：" + title, "/tasks/" + r.insertId);
    await audit(u, "创建任务", r.insertId, title);
    return response({ id: r.insertId });
  }
  if (a[0] === "tasks" && a.length === 2 && method === "GET") {
    const t = await taskAccess(u, num(a[1]));
    return response({
      ...t,
      versions: await q(
        "SELECT v.*,u.name author_name FROM versions v JOIN users u ON u.id=v.author_id WHERE v.task_id=? ORDER BY v.number DESC",
        [t.id],
      ),
      files: await q(
        "SELECT id,version_id,uploader_id,name,mime,size,kind FROM files WHERE task_id=? AND deleted_at IS NULL AND (version_id IS NOT NULL OR kind='reference' OR uploader_id=?)",
        [t.id, u.id],
      ),
      comments: await q(
        "SELECT c.*,u.name author_name FROM comments c JOIN users u ON u.id=c.author_id JOIN versions v ON v.id=c.version_id WHERE v.task_id=? ORDER BY c.id",
        [t.id],
      ),
    });
  }
  if (a[0] === "tasks" && a[2] === "files" && method === "POST") {
    const t = await taskAccess(u, num(a[1]));
    await writableTask(t);
    const form = await req.formData(),
      file = form.get("file"),
      kind = form.get("kind");
    if (!["model", "texture", "preview", "reference"].includes(kind))
      fail("文件类型无效");
    if (kind === "reference") elevated(u);
    else if (t.assignee_id !== u.id && u.role !== "admin")
      fail("只有被分配的美术可以提交文件", 403);
    if (
      !file ||
      typeof file === "string" ||
      !file.size ||
      file.size > 25 * 1024 * 1024
    )
      fail("请选择不超过 25MB 的文件");
    const ext = path.extname(file.name).toLowerCase();
    const allowed = {
      model: [".obj", ".fbx", ".glb", ".gltf", ".blend", ".zip"],
      texture: [
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".tga",
        ".exr",
        ".zip",
        ".bin",
        ".mtl",
        ".ktx2",
      ],
      preview: [".png", ".jpg", ".jpeg", ".webp"],
      reference: [".png", ".jpg", ".jpeg", ".webp", ".pdf"],
    };
    if (!allowed[kind].includes(ext)) fail("此文件类型不支持");
    if (
      kind === "model" &&
      !t.formats
        .toLowerCase()
        .split(/[,，\s/]+/)
        .some((f) => f.replace(".", "") === ext.slice(1))
    )
      fail("模型格式不符合任务要求：" + t.formats);
    const buf = Buffer.from(await file.arrayBuffer());
    let mime = "application/octet-stream";
    if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      const png = buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a",
        jpg = buf[0] === 255 && buf[1] === 216 && buf[2] === 255,
        webp =
          buf.subarray(0, 4).toString() === "RIFF" &&
          buf.subarray(8, 12).toString() === "WEBP";
      if (!png && !jpg && !webp) fail("图片内容无效");
      mime = png ? "image/png" : jpg ? "image/jpeg" : "image/webp";
    }
    const filename = crypto.randomUUID() + ext;
    await fs.mkdir("storage", { recursive: true });
    await fs.writeFile(path.join("storage", filename), buf, { mode: 0o640 });
    const r = await q(
      "INSERT INTO files(task_id,uploader_id,name,path,mime,size,kind) VALUES(?,?,?,?,?,?,?)",
      [t.id, u.id, file.name.slice(0, 255), filename, mime, file.size, kind],
    );
    await audit(u, "上传文件", t.id, file.name);
    return response({ id: r.insertId, name: file.name, size: file.size, kind });
  }
  if (a[0] === "tasks" && a[2] === "submit" && method === "POST") {
    const t = await taskAccess(u, num(a[1]));
    if (t.assignee_id !== u.id && u.role !== "admin")
      fail("只有被分配的美术可以提交版本", 403);
    await writableTask(t);
    const notes = text(body.notes, "版本说明", 4000);
    if (
      !Array.isArray(body.fileIds) ||
      !body.fileIds.length ||
      body.fileIds.length > 30
    )
      fail("请先上传模型及所需贴图");
    const ids = [...new Set(body.fileIds.map(num))];
    const vid = await tx(async (c) => {
      const [locked] = await q(
        "SELECT * FROM tasks WHERE id=? FOR UPDATE",
        [t.id],
        c,
      );
      if (locked.status === "in_review")
        fail("当前版本正在审阅，请等待审阅结果");
      const files = await q(
        `SELECT * FROM files WHERE id IN (${ids.map(() => "?").join(",")}) AND task_id=? AND version_id IS NULL AND deleted_at IS NULL AND uploader_id=?`,
        [...ids, t.id, u.id],
        c,
      );
      if (files.length !== ids.length) fail("文件无效、已提交或不属于当前用户");
      if (!files.some((f) => f.kind === "model")) fail("缺少模型文件");
      if (
        locked.require_texture &&
        !files.some(
          (f) =>
            f.kind === "texture" &&
            /\.(png|jpe?g|webp|tga|exr|zip)$/i.test(f.name),
        )
      )
        fail("缺少贴图，请补充后提交");
      const [{ n }] = await q(
        "SELECT COALESCE(MAX(number),0)+1 n FROM versions WHERE task_id=?",
        [t.id],
        c,
      );
      const v = await q(
        "INSERT INTO versions(task_id,number,notes,author_id) VALUES(?,?,?,?)",
        [t.id, n, notes, u.id],
        c,
      );
      await q(
        `UPDATE files SET version_id=? WHERE id IN (${ids.map(() => "?").join(",")})`,
        [v.insertId, ...ids],
        c,
      );
      await q("UPDATE tasks SET status='in_review' WHERE id=?", [t.id], c);
      return v.insertId;
    });
    await q("DELETE FROM task_drafts WHERE task_id=? AND user_id=?", [
      t.id,
      u.id,
    ]);
    await notify(t.creator_id, "等待审阅：" + t.title, "/review/" + t.id);
    await audit(u, "提交版本", vid, t.title);
    return response({ id: vid });
  }
  if (a[0] === "tasks" && a[2] === "review" && method === "POST") {
    elevated(u);
    const t = await taskAccess(u, num(a[1])),
      vid = num(body.versionId);
    await writableTask(t);
    if (!["approved", "changes_requested"].includes(body.decision))
      fail("审阅操作无效");
    const result = await tx(async (c) => {
      const [locked] = await q(
        "SELECT * FROM tasks WHERE id=? FOR UPDATE",
        [t.id],
        c,
      );
      const latest = (
        await q(
          "SELECT * FROM versions WHERE task_id=? ORDER BY number DESC LIMIT 1",
          [t.id],
          c,
        )
      )[0];
      if (
        !latest ||
        latest.id !== vid ||
        latest.status !== "in_review" ||
        locked.status !== "in_review"
      )
        fail("只能审阅当前待审阅版本", 409);
      if (body.decision === "approved") {
        const [{ n }] = await q(
          "SELECT COUNT(*) n FROM comments WHERE version_id=? AND parent_id IS NULL AND resolved=0",
          [vid],
          c,
        );
        if (n) fail("请先解决当前版本的所有审阅意见");
        await q(
          "UPDATE tasks SET status=?,approved_version_id=? WHERE id=?",
          ["approved", vid, t.id],
          c,
        );
        const reuses = await q(
          "SELECT DISTINCT user_id FROM reuses WHERE task_id=? AND version_id<>?",
          [t.id, vid],
          c,
        );
        for (const r of reuses)
          await notify(
            r.user_id,
            "复用资产有新版本：" + t.title,
            "/account/reuses",
            c,
          );
      } else {
        if (!String(body.reason || "").trim()) fail("请填写修改要求");
        await q(
          "INSERT INTO comments(version_id,author_id,body) VALUES(?,?,?)",
          [vid, u.id, text(body.reason, "修改要求", 3000)],
          c,
        );
        await q(
          "UPDATE tasks SET status=? WHERE id=?",
          ["changes_requested", t.id],
          c,
        );
      }
      await q(
        "UPDATE versions SET status=? WHERE id=?",
        [body.decision, vid],
        c,
      );
      return { ok: true };
    });
    await notify(
      t.assignee_id,
      (body.decision === "approved" ? "验收通过：" : "需要修改：") + t.title,
      "/tasks/" + t.id,
    );
    await audit(u, "审阅" + body.decision, t.id, "version:" + vid);
    return response(result);
  }
  if (route === "comments" && method === "POST") {
    const vid = num(body.versionId),
      v = (await q("SELECT task_id FROM versions WHERE id=?", [vid]))[0];
    if (!v) fail("版本不存在", 404);
    const t = await taskAccess(u, v.task_id);
    await writableTask(t);
    if (body.parentId) {
      const p = (
        await q("SELECT version_id FROM comments WHERE id=?", [
          num(body.parentId),
        ])
      )[0];
      if (!p || p.version_id !== vid) fail("回复必须属于相同版本");
    }
    if (body.anchor) {
      const [af] = await q(
        "SELECT id FROM files WHERE id=? AND version_id=? AND kind='model' AND deleted_at IS NULL",
        [num(body.anchor.modelId), vid],
      );
      if (!af) fail("三维标注必须绑定当前版本模型");
    }
    let x = null,
      y = null;
    if (body.x != null) {
      x = Number(body.x);
      y = Number(body.y);
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 ||
        x > 1 ||
        y < 0 ||
        y > 1
      )
        fail("标注位置无效");
    }
    const r = await q(
      "INSERT INTO comments(version_id,author_id,body,x,y,view_angle,zoom,parent_id,anchor) VALUES(?,?,?,?,?,?,?,?,?)",
      [
        vid,
        u.id,
        text(body.body, "评论", 3000),
        x,
        y,
        Math.min(360, Math.max(-360, Number(body.angle) || 0)),
        Math.min(3, Math.max(0.5, Number(body.zoom) || 1)),
        body.parentId ? num(body.parentId) : null,
        anchorValue(body.anchor),
      ],
    );
    await notify(
      t.assignee_id === u.id ? t.creator_id : t.assignee_id,
      "新审阅意见：" + t.title,
      "/review/" + t.id,
    );
    return response({ id: r.insertId });
  }
  if (a[0] === "comments" && method === "PATCH") {
    elevated(u);
    const c = (
      await q(
        "SELECT c.*,v.task_id FROM comments c JOIN versions v ON v.id=c.version_id WHERE c.id=?",
        [num(a[1])],
      )
    )[0];
    if (!c) fail("评论不存在", 404);
    await writableTask(await taskAccess(u, c.task_id));
    const [cv] = await q("SELECT status FROM versions WHERE id=?", [
      c.version_id,
    ]);
    if (cv.status === "approved")
      fail("已验收意见不可改写，请在新版本反馈", 409);
    await q("UPDATE comments SET resolved=? WHERE id=?", [
      !!body.resolved,
      c.id,
    ]);
    await audit(u, "处理审阅意见", c.id);
    return response({ ok: true });
  }
  if (route === "assets" && method === "GET") {
    const list = await taskList(u, true);
    const query = new URL(req.url).searchParams.get("q")?.toLowerCase() || "";
    return response(
      list.filter((t) =>
        (t.title + " " + t.tags + " " + t.category + " " + t.project_name)
          .toLowerCase()
          .includes(query),
      ),
    );
  }
  if (a[0] === "assets" && a.length === 2 && method === "GET") {
    roles(u, "admin", "lead", "artist");
    const t = await taskAccess(u, num(a[1]), { library: true });
    if (!t.approved_version_id || !t.library_visible)
      fail("资产尚未入库或已下架", 404);
    const version = (
      await q("SELECT * FROM versions WHERE id=?", [t.approved_version_id])
    )[0];
    return response({
      ...t,
      version,
      files: await q(
        "SELECT id,name,mime,size,kind FROM files WHERE version_id=?",
        [version.id],
      ),
      usage: await q(
        "SELECT r.id,p.archived project_archived,p.name project_name,v.number version_number FROM reuses r JOIN projects p ON p.id=r.project_id JOIN versions v ON v.id=r.version_id WHERE r.task_id=? AND (r.user_id=? OR EXISTS(SELECT 1 FROM project_members WHERE project_id=r.project_id AND user_id=?))",
        [t.id, u.id, u.id],
      ),
    });
  }
  if (a[0] === "assets" && a[2] === "tags" && method === "PATCH") {
    elevated(u);
    const t = await taskAccess(u, num(a[1]));
    await q("UPDATE tasks SET tags=? WHERE id=?", [
      text(body.tags, "标签", 500),
      t.id,
    ]);
    await audit(u, "确认资产标签", t.id);
    return response({ ok: true });
  }
  if (a[0] === "assets" && a[2] === "favorite" && method === "POST") {
    roles(u, "admin", "lead", "artist");
    const t = await taskAccess(u, num(a[1]), { library: true });
    if (!t.approved_version_id || !t.library_visible) fail("尚未入库或已下架");
    if (body.saved)
      await q("INSERT IGNORE INTO favorites(user_id,task_id) VALUES(?,?)", [
        u.id,
        t.id,
      ]);
    else
      await q("DELETE FROM favorites WHERE user_id=? AND task_id=?", [
        u.id,
        t.id,
      ]);
    return response({ ok: true });
  }
  if (a[0] === "assets" && a[2] === "reuse" && method === "POST") {
    roles(u, "admin", "lead", "artist");
    const t = await taskAccess(u, num(a[1]), { library: true });
    if (!t.approved_version_id || !t.library_visible) fail("尚未入库或已下架");
    const pid = num(body.projectId);
    await projectAccess(u, pid);
    await writableProject(pid);
    if (t.license === "source_only" && pid !== t.project_id)
      fail("此资产仅授权来源项目，不能跨项目复用", 403);
    if (body.accepted !== true) fail("请先阅读并确认授权范围");
    try {
      const r = await q(
        "INSERT INTO reuses(task_id,project_id,version_id,user_id) VALUES(?,?,?,?)",
        [t.id, pid, t.approved_version_id, u.id],
      );
      await audit(u, "复用资产", t.id, "project:" + pid);
      return response({ id: r.insertId });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY")
        fail("该项目已引用此资产，请在复用记录查看版本", 409);
      throw e;
    }
  }
  if (a[0] === "reuses" && method === "PATCH") {
    const r = (
      await q("SELECT * FROM reuses WHERE id=? AND user_id=?", [
        num(a[1]),
        u.id,
      ])
    )[0];
    if (!r) fail("复用记录不存在", 404);
    await projectAccess(u, r.project_id);
    await writableProject(r.project_id);
    const t = await taskAccess(u, r.task_id, { library: true });
    if (t.license === "source_only" && t.project_id !== r.project_id)
      fail("授权已限制，不能升级", 403);
    await q("UPDATE reuses SET version_id=? WHERE id=?", [
      t.approved_version_id,
      r.id,
    ]);
    await audit(u, "确认升级复用版本", r.id);
    return response({ ok: true });
  }
  if (a[0] === "files" && method === "GET") {
    const f = (
      await q("SELECT * FROM files WHERE id=? AND deleted_at IS NULL", [
        num(a[1]),
      ])
    )[0];
    if (!f) fail("文件不存在", 404);
    if (
      !f.version_id &&
      f.kind !== "reference" &&
      f.uploader_id !== u.id &&
      u.role !== "admin"
    )
      fail("不能读取他人的上传草稿", 403);
    let allowed = false;
    try {
      await taskAccess(u, f.task_id);
      allowed = true;
    } catch (e) {
      if (e.status !== 403) throw e;
    }
    if (!allowed) {
      roles(u, "admin", "lead", "artist");
      const t = await taskAccess(u, f.task_id, { library: true });
      if (f.version_id !== t.approved_version_id || !f.version_id) {
        const reused = await q(
          "SELECT r.id FROM reuses r WHERE r.task_id=? AND r.version_id=? AND (r.user_id=? OR EXISTS(SELECT 1 FROM project_members m WHERE m.project_id=r.project_id AND m.user_id=?))",
          [t.id, f.version_id, u.id, u.id],
        );
        if (!reused.length) fail("不能访问未验收或未引用的历史文件", 403);
      }
      if (t.license === "source_only") await projectAccess(u, t.project_id);
    }
    const bytes = await fs.readFile(
      path.join(process.cwd(), "storage", path.basename(f.path)),
    );
    const inline =
      new URL(req.url).searchParams.get("inline") === "1" &&
      f.mime?.startsWith("image/");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": inline ? f.mime : "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (route === "notifications/read" && method === "POST") {
    await q("UPDATE notifications SET is_read=1 WHERE user_id=?", [u.id]);
    return response({ ok: true });
  }
  if (route === "ai/history" && method === "GET")
    return response(
      await q(
        "SELECT id,model,feature,input_text,output_text,status,created_at FROM ai_runs WHERE user_id=? ORDER BY id DESC LIMIT 30",
        [u.id],
      ),
    );
  if (route === "ai" && method === "POST") {
    await rate("ai:" + u.id, 30, 3600);
    const feature = body.feature || "assistant";
    let context = "",
      prompt = text(body.prompt || "请提供建议", "问题", 4000);
    if (["tags", "summary"].includes(feature)) {
      const t = await taskAccess(u, num(body.taskId));
      if (feature === "tags") elevated(u);
      context = JSON.stringify({
        title: t.title,
        requirements: t.requirements,
        category: t.category,
        comments:
          feature === "summary"
            ? await q(
                "SELECT c.body,c.resolved,v.number FROM comments c JOIN versions v ON v.id=c.version_id WHERE v.task_id=?",
                [t.id],
              )
            : [],
      });
      prompt =
        feature === "tags"
          ? "根据文字信息给出 5 到 8 个中文资产检索标签，用中文逗号分隔，不要其他内容。"
          : "按版本总结审阅问题、已解决项、待修改项，给出交付检查清单。";
    } else if (feature === "search") {
      roles(u, "admin", "lead", "artist");
      const list = await taskList(u, true);
      context = JSON.stringify(
        list.map((t) => ({
          id: t.id,
          title: t.title,
          tags: t.tags,
          category: t.category,
        })),
      );
      prompt =
        "从上下文资产中选择匹配下述需求的资产编号，只返回 JSON 数组，例如 [1,2]，不得编造。需求：" +
        prompt;
      const result = await runAI(u, feature, prompt, context);
      const ids = parseAssetIds(result.text);
      return response({
        ...result,
        assets: list.filter((t) => ids.includes(t.id)),
      });
    } else if (feature === "requirements") {
      elevated(u);
      prompt =
        "请为下面的游戏美术外包任务生成可执行制作要求，包含视觉风格、模型格式、贴图、面数建议、交付文件和验收清单；未提供的规格标为建议待确认：" +
        prompt;
    } else if (feature === "assistant") {
      context = JSON.stringify(
        (await taskList(u)).map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          due_date: t.due_date,
          requirements: t.requirements,
        })),
      );
    } else fail("未知 AI 功能");
    return response(await runAI(u, feature, prompt, context));
  }
  if (a[0] === "admin") {
    roles(u, "admin");
    if (route === "admin/overview" && method === "GET")
      return response({
        users: await q("SELECT " + fields + " FROM users ORDER BY id"),
        models: await q(
          "SELECT id,name,model,base_url,enabled,is_default,max_tokens,timeout_seconds,IF(key_encrypted IS NULL,0,1) has_custom_key FROM ai_models ORDER BY id",
        ),
        audit: await q(
          "SELECT a.*,u.name user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 100",
        ),
        usage: await q(
          "SELECT a.id,a.feature,a.model,a.status,a.tokens,a.duration_ms,a.created_at,u.name user_name FROM ai_runs a JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 100",
        ),
        stats: (
          await q(
            "SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM projects) projects,(SELECT COUNT(*) FROM tasks) tasks,(SELECT COUNT(*) FROM tasks WHERE approved_version_id IS NOT NULL) assets,(SELECT COALESCE(SUM(size),0) FROM files WHERE deleted_at IS NULL) storage_bytes,(SELECT COALESCE(SUM(tokens),0) FROM ai_runs) tokens",
          )
        )[0],
      });
    if (route === "admin/users" && method === "POST") {
      const email = text(body.email, "邮箱", 190).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("邮箱格式错误");
      if (!["admin", "lead", "artist", "vendor"].includes(body.role))
        fail("角色无效");
      if (String(body.password || "").length < 10) fail("密码至少 10 位");
      try {
        const r = await q(
          "INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)",
          [
            text(body.name, "姓名", 80),
            email,
            await bcrypt.hash(body.password, 12),
            body.role,
          ],
        );
        await audit(u, "创建用户", r.insertId);
        return response({ id: r.insertId });
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") fail("邮箱已存在", 409);
        throw e;
      }
    }
    if (a[1] === "users" && a[2] && method === "PATCH") {
      const id = num(a[2]);
      if (id === u.id) fail("不能修改自己的管理员状态");
      if (!["admin", "lead", "artist", "vendor"].includes(body.role))
        fail("角色无效");
      await q("UPDATE users SET role=?,active=? WHERE id=?", [
        body.role,
        !!body.active,
        id,
      ]);
      await q("DELETE FROM sessions WHERE user_id=?", [id]);
      await audit(u, "调整用户权限", id, body.role);
      return response({ ok: true });
    }
    if (a[1] === "models" && a[3] === "test" && method === "POST") {
      await rate("ai-test:" + u.id, 30, 3600);
      return response(
        await runAI(u, "connectivity", "仅回复：连接成功", "", num(a[2])),
      );
    }
    if (a[1] === "models" && (method === "POST" || method === "PATCH")) {
      const base = await safeBase(text(body.baseUrl, "API 地址", 255));
      const key = body.apiKey
        ? encrypt(text(body.apiKey, "API Key", 1000))
        : null;
      const values = [
        text(body.name, "显示名称", 100),
        text(body.model, "模型名称", 150),
        base,
        body.enabled !== false,
        !!body.isDefault,
      ];
      const id = await tx(async (c) => {
        if (body.isDefault) {
          if (body.enabled === false) fail("默认模型不能停用");
          await q("UPDATE ai_models SET is_default=0", [], c);
        }
        if (method === "PATCH") {
          const mid = num(a[2]);
          await q(
            "UPDATE ai_models SET name=?,model=?,base_url=?,enabled=?,is_default=?,key_encrypted=COALESCE(?,key_encrypted) WHERE id=?",
            [...values, key, mid],
            c,
          );
          return mid;
        }
        const r = await q(
          "INSERT INTO ai_models(name,model,base_url,enabled,is_default,key_encrypted) VALUES(?,?,?,?,?,?)",
          [...values, key],
          c,
        );
        return r.insertId;
      });
      await audit(u, "配置 AI 模型", id);
      return response({ id });
    }
  }
  fail("接口不存在", 404);
}
async function dispatch(req, ctx) {
  try {
    return await handle(req, ctx);
  } catch (e) {
    if (!e.status)
      console.error("API error", e.code || e.name, e.message?.slice(0, 200));
    return NextResponse.json(
      { error: e.status ? e.message : "服务暂不可用，请稍后重试" },
      { status: e.status || 500 },
    );
  }
}
export {
  dispatch as GET,
  dispatch as POST,
  dispatch as PATCH,
  dispatch as DELETE,
};
