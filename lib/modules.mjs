import { q, tx } from "./db.mjs";
import {
  roles,
  fail,
  text,
  num,
  taskAccess,
  projectAccess,
  audit,
  notify,
  rate,
} from "./auth.mjs";
import { runAI, encrypt, safeBase } from "./ai.mjs";
import bcrypt from "bcryptjs";
export async function writableTask(t) {
  if (t.archived) fail("任务已归档，请先恢复后操作", 409);
  const [p] = await q("SELECT archived FROM projects WHERE id=?", [
    t.project_id,
  ]);
  if (p?.archived) fail("项目已归档，当前内容只读", 409);
}
export async function writableProject(id) {
  const [p] = await q("SELECT * FROM projects WHERE id=?", [id]);
  if (!p) fail("项目不存在", 404);
  if (p.archived) fail("项目已归档，请先恢复", 409);
  return p;
}
const manage = (u) => roles(u, "admin", "lead");
const range = (v, min, max, label) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) fail(label + "不在允许范围");
  return n;
};
export function formats(v) {
  const f = text(v, "格式", 100)
    .toUpperCase()
    .split(/[,，\s/]+/)
    .map((x) => x.replace(/^\./, ""));
  if (f.some((x) => !["OBJ", "FBX", "GLB", "GLTF", "BLEND", "ZIP"].includes(x)))
    fail("允许格式：OBJ, FBX, GLB, GLTF, BLEND, ZIP");
  return [...new Set(f)].join(",");
}
export function validDate(v) {
  const s = text(v, "截止日期", 10);
  const parsed = new Date(s + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== s
  )
    fail("截止日期无效");
  return s;
}
export function anchorValue(v) {
  if (v == null) return null;
  if (v.type !== "3d") fail("位置标注格式无效");
  for (const k of ["point", "camera", "target"])
    if (
      !Array.isArray(v[k]) ||
      v[k].length !== 3 ||
      v[k].some(
        (x) =>
          typeof x !== "number" || !Number.isFinite(x) || Math.abs(x) > 1e8,
      )
    )
      fail("三维位置参数无效");
  return JSON.stringify({
    type: "3d",
    point: v.point,
    camera: v.camera,
    target: v.target,
    modelId: num(v.modelId),
  });
}
export async function modules({
  u,
  a,
  route,
  method,
  body,
  req,
  reply,
  taskList,
}) {
  const query = new URL(req.url).searchParams;
  if (a[0] === "projects" && a.length === 2 && method === "PATCH") {
    manage(u);
    const id = num(a[1]);
    await projectAccess(u, id);
    const [p] = await q("SELECT * FROM projects WHERE id=?", [id]);
    if (!p) fail("项目不存在", 404);
    const name =
        body.name === undefined ? p.name : text(body.name, "项目名称", 150),
      description =
        body.description === undefined
          ? p.description
          : text(body.description, "项目描述", 2000);
    const r = await q(
      "UPDATE projects SET name=?,description=?,archived=?,revision=revision+1 WHERE id=? AND revision=?",
      [
        name,
        description,
        body.archived === undefined ? p.archived : !!body.archived,
        id,
        num(body.revision),
      ],
    );
    if (!r.affectedRows) fail("项目已被其他人修改，请刷新后重试", 409);
    await audit(
      u,
      "更新项目",
      id,
      body.archived === undefined ? "资料" : body.archived ? "归档" : "恢复",
    );
    return reply({ ok: true });
  }
  if (a[0] === "projects" && a[2] === "members" && method === "DELETE") {
    manage(u);
    const id = num(a[1]),
      uid = num(a[3]);
    await projectAccess(u, id);
    const p = await writableProject(id);
    if (uid === p.owner_id) fail("不能移除项目创建人");
    if (
      (
        await q(
          "SELECT id FROM tasks WHERE project_id=? AND assignee_id=? AND archived=0",
          [id, uid],
        )
      ).length
    )
      fail("该成员仍有负责的任务，请先重新分配或归档任务", 409);
    await q("DELETE FROM project_members WHERE project_id=? AND user_id=?", [
      id,
      uid,
    ]);
    await audit(u, "移除项目成员", id, String(uid));
    return reply({ ok: true });
  }
  if (a[0] === "tasks" && a.length === 2 && method === "PATCH") {
    manage(u);
    const id = num(a[1]),
      old = await taskAccess(u, id);
    await writableProject(old.project_id);
    if (body.archived === undefined) await writableTask(old);
    const value = (k) => (body[k] === undefined ? old[k] : body[k]);
    const title = text(value("title"), "任务名称", 150),
      requirements = text(value("requirements"), "制作要求", 6000),
      fmt = formats(value("formats")),
      due = validDate(body.dueDate || old.due_date),
      uid = num(body.assigneeId || old.assignee_id);
    const [person] = await q("SELECT role FROM users WHERE id=? AND active=1", [
      uid,
    ]);
    if (!person) fail("请选择启用的负责人");
    const category = value("category");
    if (!["场景", "角色", "道具", "材质", "特效"].includes(category))
      fail("分类无效");
    const priority = value("priority");
    if (!["normal", "high"].includes(priority)) fail("优先级无效");
    const license = value("license");
    if (!["all_projects", "source_only"].includes(license))
      fail("授权范围无效");
    await tx(async (c) => {
      const [locked] = await q(
        "SELECT * FROM tasks WHERE id=? FOR UPDATE",
        [id],
        c,
      );
      if (locked.revision !== num(body.revision))
        fail("任务已被其他人修改，请刷新后重试", 409);
      if (uid !== old.assignee_id && locked.status === "in_review")
        fail("待审阅期间不能重新分配负责人", 409);
      if (
        license === "source_only" &&
        old.license !== license &&
        (
          await q(
            "SELECT id FROM reuses WHERE task_id=? AND project_id<>?",
            [id, old.project_id],
            c,
          )
        ).length
      )
        fail("已有跨项目引用，不能直接收紧授权，请先处理引用", 409);
      await q(
        "UPDATE tasks SET title=?,requirements=?,formats=?,require_texture=?,assignee_id=?,due_date=?,category=?,priority=?,license=?,license_note=?,archived=?,revision=revision+1 WHERE id=?",
        [
          title,
          requirements,
          fmt,
          body.requireTexture === undefined
            ? old.require_texture
            : !!body.requireTexture,
          uid,
          due,
          category,
          priority,
          license,
          String(
            body.licenseNote === undefined
              ? old.license_note
              : body.licenseNote,
          ).slice(0, 500),
          body.archived === undefined ? old.archived : !!body.archived,
          id,
        ],
        c,
      );
      if (person.role !== "vendor")
        await q(
          "INSERT IGNORE INTO project_members(project_id,user_id) VALUES(?,?)",
          [old.project_id, uid],
          c,
        );
    });
    if (uid !== old.assignee_id) {
      await notify(uid, "任务已分配给你：" + title, "/tasks/" + id);
      await notify(old.assignee_id, "任务已重新分配：" + title, "/account");
    }
    await audit(
      u,
      "更新任务",
      id,
      body.archived === undefined
        ? "要求/负责人/授权"
        : body.archived
          ? "归档"
          : "恢复",
    );
    return reply({ ok: true });
  }
  if (a[0] === "tasks" && a[2] === "draft") {
    const t = await taskAccess(u, num(a[1]));
    if (t.assignee_id !== u.id && u.role !== "admin")
      fail("只能管理自己的交付草稿", 403);
    if (method === "GET") {
      const [draft] = await q(
        "SELECT notes,updated_at FROM task_drafts WHERE task_id=? AND user_id=?",
        [t.id, u.id],
      );
      return reply({
        notes: draft?.notes || "",
        updated_at: draft?.updated_at,
        files: await q(
          "SELECT id,name,mime,size,kind FROM files WHERE task_id=? AND uploader_id=? AND version_id IS NULL AND deleted_at IS NULL AND kind<>'reference' ORDER BY id",
          [t.id, u.id],
        ),
      });
    }
    if (method === "PATCH") {
      await writableTask(t);
      const notes = typeof body.notes === "string" ? body.notes : "";
      if (notes.length > 4000) fail("版本说明最多 4000 字");
      await q(
        "INSERT INTO task_drafts(task_id,user_id,notes) VALUES(?,?,?) ON DUPLICATE KEY UPDATE notes=VALUES(notes)",
        [t.id, u.id, notes],
      );
      return reply({ ok: true });
    }
  }
  if (a[0] === "files" && method === "DELETE") {
    const [f] = await q(
      "SELECT * FROM files WHERE id=? AND deleted_at IS NULL",
      [num(a[1])],
    );
    if (!f) fail("文件不存在", 404);
    const t = await taskAccess(u, f.task_id);
    await writableTask(t);
    if (f.version_id) fail("已提交历史文件不可删除", 409);
    if (f.kind === "reference") manage(u);
    else if (f.uploader_id !== u.id) fail("只能移除自己的上传草稿", 403);
    const removed = await q(
      "UPDATE files SET deleted_at=NOW() WHERE id=? AND version_id IS NULL AND deleted_at IS NULL",
      [f.id],
    );
    if (!removed.affectedRows) fail("文件已提交或已移除，请刷新", 409);
    await audit(u, "移除未提交文件", f.id, f.name);
    return reply({ ok: true });
  }
  if (a[0] === "comments" && a[2] === "edit" && method === "PATCH") {
    const [comment] = await q(
      "SELECT c.*,v.task_id,v.status version_status FROM comments c JOIN versions v ON v.id=c.version_id WHERE c.id=?",
      [num(a[1])],
    );
    if (!comment) fail("评论不存在", 404);
    const t = await taskAccess(u, comment.task_id);
    await writableTask(t);
    if (comment.author_id !== u.id) fail("只能编辑自己的评论", 403);
    if (comment.version_status === "approved")
      fail("已验收版本的意见保留原记录，不可改写", 409);
    await q("UPDATE comments SET body=?,edited_at=NOW() WHERE id=?", [
      text(body.body, "评论", 3000),
      comment.id,
    ]);
    await audit(u, "编辑审阅意见", comment.id);
    return reply({ ok: true });
  }
  if (a[0] === "assets" && a[2] === "visibility" && method === "PATCH") {
    manage(u);
    const t = await taskAccess(u, num(a[1]));
    if (!t.approved_version_id) fail("资产尚未验收");
    await q(
      "UPDATE tasks SET library_visible=?,revision=revision+1 WHERE id=?",
      [!!body.visible, t.id],
    );
    await audit(u, body.visible ? "恢复资产上架" : "下架资产", t.id);
    return reply({ ok: true });
  }
  if (a[0] === "reuses" && method === "DELETE") {
    const [r] = await q("SELECT * FROM reuses WHERE id=?", [num(a[1])]);
    if (!r) fail("引用不存在", 404);
    if (r.user_id !== u.id && u.role !== "admin")
      fail("只能移除自己的引用", 403);
    await q("DELETE FROM reuses WHERE id=?", [r.id]);
    await audit(u, "移除资产引用", r.id);
    return reply({ ok: true });
  }
  if (route === "notifications" && method === "GET") {
    const page = range(query.get("page") || 1, 1, 100000, "页码"),
      size = 20,
      unread = query.get("unread") === "1";
    const where = "user_id=?" + (unread ? " AND is_read=0" : "");
    const [{ n }] = await q(
      "SELECT COUNT(*) n FROM notifications WHERE " + where,
      [u.id],
    );
    const [{ n: unreadCount }] = await q(
      "SELECT COUNT(*) n FROM notifications WHERE user_id=? AND is_read=0",
      [u.id],
    );
    return reply({
      items: await q(
        `SELECT * FROM notifications WHERE ${where} ORDER BY id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`,
        [u.id],
      ),
      total: n,
      page,
      pages: Math.max(1, Math.ceil(n / size)),
      unreadCount,
    });
  }
  if (
    a[0] === "notifications" &&
    a[1] &&
    a[1] !== "read" &&
    method === "PATCH"
  ) {
    const r = await q(
      "UPDATE notifications SET is_read=? WHERE id=? AND user_id=?",
      [body.read !== false, num(a[1]), u.id],
    );
    if (!r.affectedRows) fail("通知不存在", 404);
    return reply({ ok: true });
  }
  if (route === "ai/records" && method === "GET") {
    const page = range(query.get("page") || 1, 1, 100000, "页码"),
      size = 20;
    const [{ n }] = await q("SELECT COUNT(*) n FROM ai_runs WHERE user_id=?", [
      u.id,
    ]);
    const items = await q(
      `SELECT id,model,feature,input_text,output_text,status,tokens,created_at FROM ai_runs WHERE user_id=? ORDER BY id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      [u.id],
    );
    return reply({
      items,
      total: n,
      page,
      pages: Math.max(1, Math.ceil(n / size)),
    });
  }
  if (route === "ai/conversations" && method === "GET")
    return reply(
      await q(
        "SELECT id,title,created_at,updated_at,archived FROM ai_conversations WHERE user_id=? AND archived=? ORDER BY updated_at DESC,id DESC",
        [u.id, query.get("archived") === "1"],
      ),
    );
  if (route === "ai/conversations" && method === "POST") {
    const r = await q(
      "INSERT INTO ai_conversations(user_id,title) VALUES(?,?)",
      [
        u.id,
        typeof body.title === "string" && body.title.trim()
          ? text(body.title, "对话标题", 100)
          : "新对话",
      ],
    );
    return reply({ id: r.insertId });
  }
  if (a[0] === "ai" && a[1] === "conversations" && a[2]) {
    const id = num(a[2]),
      [conv] = await q(
        "SELECT * FROM ai_conversations WHERE id=? AND user_id=?",
        [id, u.id],
      );
    if (!conv) fail("对话不存在", 404);
    if (a.length === 3 && method === "GET")
      return reply({
        ...conv,
        messages: await q(
          "SELECT id,role,content,status,model,tokens,created_at FROM ai_messages WHERE conversation_id=? ORDER BY id",
          [id],
        ),
      });
    if (a.length === 3 && method === "PATCH") {
      await q("UPDATE ai_conversations SET title=?,archived=? WHERE id=?", [
        body.title === undefined
          ? conv.title
          : text(body.title, "对话标题", 100),
        body.archived === undefined ? conv.archived : !!body.archived,
        id,
      ]);
      return reply({ ok: true });
    }
    if (a[3] === "messages" && method === "POST") {
      if (conv.archived) fail("对话已归档，请先恢复", 409);
      const prompt = text(body.prompt, "问题", 4000);
      await rate("ai:" + u.id, 30, 3600);
      const lock = await q(
        "UPDATE ai_conversations SET busy_until=DATE_ADD(NOW(),INTERVAL 190 SECOND) WHERE id=? AND (busy_until IS NULL OR busy_until<NOW())",
        [id],
      );
      if (!lock.affectedRows) fail("上一条回复仍在生成，请稍后再发", 409);
      try {
        const previous = await q(
          "SELECT role,content FROM ai_messages WHERE conversation_id=? AND status='success' ORDER BY id DESC LIMIT 12",
          [id],
        );
        const visible = await taskList(u);
        const context = JSON.stringify(
          visible
            .filter((t) => !t.archived)
            .map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              requirements: t.requirements,
              due_date: t.due_date,
            })),
        );
        await q(
          "INSERT INTO ai_messages(conversation_id,role,content) VALUES(?,?,?)",
          [id, "user", prompt],
        );
        try {
          const result = await runAI(
            u,
            "assistant",
            prompt,
            context,
            body.modelId ? num(body.modelId) : undefined,
            previous.reverse(),
          );
          await q(
            "INSERT INTO ai_messages(conversation_id,role,content,model,tokens) VALUES(?,?,?,?,?)",
            [id, "assistant", result.text, result.model, result.tokens],
          );
          if (conv.title === "新对话")
            await q("UPDATE ai_conversations SET title=? WHERE id=?", [
              prompt.slice(0, 60),
              id,
            ]);
          return reply(result);
        } catch (e) {
          await q(
            "INSERT INTO ai_messages(conversation_id,role,content,status) VALUES(?,'assistant',?,'error')",
            [id, e.message],
          );
          throw e;
        }
      } finally {
        await q(
          "UPDATE ai_conversations SET busy_until=NULL,updated_at=NOW() WHERE id=?",
          [id],
        );
      }
    }
  }
  if (route === "ai/models" && method === "GET")
    return reply(
      await q(
        "SELECT id,name,model,is_default FROM ai_models WHERE enabled=1 ORDER BY is_default DESC,id",
      ),
    );
  if (a[0] === "admin") {
    roles(u, "admin");
    if (a[1] === "users" && a[3] === "profile" && method === "PATCH") {
      const id = num(a[2]),
        name = text(body.name, "姓名", 80),
        email = text(body.email, "邮箱", 190).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("邮箱格式错误");
      try {
        const r = await q("UPDATE users SET name=?,email=? WHERE id=?", [
          name,
          email,
          id,
        ]);
        if (!r.affectedRows) fail("用户不存在", 404);
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") fail("邮箱已存在", 409);
        throw e;
      }
      await audit(u, "编辑用户资料", id);
      return reply({ ok: true });
    }
    if (a[1] === "users" && a[3] === "password" && method === "POST") {
      const id = num(a[2]);
      if (id === u.id) fail("请在用户中心使用当前密码修改");
      const password = text(body.password, "新密码", 72);
      if (password.length < 10) fail("新密码至少 10 位");
      if (!(await q("SELECT id FROM users WHERE id=?", [id])).length)
        fail("用户不存在", 404);
      await tx(async (c) => {
        await q(
          "UPDATE users SET password_hash=? WHERE id=?",
          [await bcrypt.hash(password, 12), id],
          c,
        );
        await q("DELETE FROM sessions WHERE user_id=?", [id], c);
      });
      await audit(u, "重置用户密码", id);
      return reply({ ok: true });
    }
    if (route === "admin/records" && method === "GET") {
      const type = query.get("type") === "usage" ? "usage" : "audit",
        page = range(query.get("page") || 1, 1, 100000, "页码"),
        size = 25,
        search = (query.get("q") || "").slice(0, 100),
        status = query.get("status") || "";
      const table = type === "usage" ? "ai_runs" : "audit_logs",
        columns =
          type === "usage"
            ? "a.id,a.user_id,a.feature,a.model,a.status,a.tokens,a.duration_ms,a.created_at,u.name user_name"
            : "a.*,u.name user_name";
      let where = "1=1",
        args = [];
      if (search) {
        where +=
          type === "usage"
            ? " AND (u.name LIKE ? OR a.model LIKE ? OR a.feature LIKE ?)"
            : " AND (u.name LIKE ? OR a.action LIKE ? OR a.target LIKE ?)";
        args.push(...Array(3).fill("%" + search + "%"));
      }
      if (type === "usage" && ["success", "error"].includes(status)) {
        where += " AND a.status=?";
        args.push(status);
      }
      const from = ` FROM ${table} a LEFT JOIN users u ON u.id=a.user_id WHERE ${where}`;
      const [{ n }] = await q("SELECT COUNT(*) n" + from, args);
      const exportMode = query.get("export") === "1";
      if (exportMode && n > 10000) fail("导出最多 10000 条，请先缩小筛选范围");
      const items = await q(
        `SELECT ${columns}${from} ORDER BY a.id DESC LIMIT ${exportMode ? 10000 : size} OFFSET ${exportMode ? 0 : (page - 1) * size}`,
        args,
      );
      if (exportMode) {
        const headers =
          type === "usage"
            ? [
                "id",
                "user_name",
                "feature",
                "model",
                "status",
                "tokens",
                "duration_ms",
                "created_at",
              ]
            : ["id", "user_name", "action", "target", "detail", "created_at"];
        const cell = (v) =>
          '"' +
          String(v ?? "")
            .replace(/^[=+@-]/, "'$&")
            .replaceAll('"', '""') +
          '"';
        return new Response(
          "\uFEFF" +
            [headers, ...items.map((r) => headers.map((h) => r[h]))]
              .map((row) => row.map(cell).join(","))
              .join("\r\n"),
          {
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="${type}.csv"`,
              "Cache-Control": "no-store",
            },
          },
        );
      }
      return reply({
        items,
        total: n,
        page,
        pages: Math.max(1, Math.ceil(n / size)),
      });
    }
    if (
      a[1] === "models" &&
      a.length <= 3 &&
      (method === "POST" || method === "PATCH")
    ) {
      const base = await safeBase(text(body.baseUrl, "API 地址", 255));
      const maxTokens = range(body.maxTokens || 4096, 256, 16384, "回复上限"),
        timeout = range(body.timeoutSeconds || 60, 10, 180, "超时秒数");
      const key = body.apiKey
        ? encrypt(text(body.apiKey, "API Key", 1000))
        : null;
      const defaulted = !!body.isDefault,
        enabled = body.enabled !== false;
      if (defaulted && !enabled) fail("默认模型不能停用");
      const id = await tx(async (c) => {
        const models = await q(
          "SELECT * FROM ai_models ORDER BY id FOR UPDATE",
          [],
          c,
        );
        const mid = method === "PATCH" ? num(a[2]) : null,
          old = models.find((m) => m.id === mid);
        if (mid && !old) fail("模型不存在", 404);
        if (!key && base !== (old?.base_url || process.env.AI_BASE_URL))
          fail("更换服务地址时请填写该服务的新 API Key");
        if (
          old?.is_default &&
          !defaulted &&
          enabled &&
          models.filter((m) => m.enabled && m.id !== mid).length === 0
        )
          fail("唯一可用模型应保持默认");
        if (defaulted) await q("UPDATE ai_models SET is_default=0", [], c);
        const values = [
          text(body.name, "显示名", 100),
          text(body.model, "模型标识", 150),
          base,
          enabled,
          defaulted,
          maxTokens,
          timeout,
        ];
        let resultId = mid;
        if (mid)
          await q(
            "UPDATE ai_models SET name=?,model=?,base_url=?,enabled=?,is_default=?,max_tokens=?,timeout_seconds=?,key_encrypted=? WHERE id=?",
            [
              ...values,
              body.useEnvironmentKey ? null : key || old.key_encrypted,
              mid,
            ],
            c,
          );
        else {
          const r = await q(
            "INSERT INTO ai_models(name,model,base_url,enabled,is_default,max_tokens,timeout_seconds,key_encrypted) VALUES(?,?,?,?,?,?,?,?)",
            [...values, key],
            c,
          );
          resultId = r.insertId;
        }
        const available = await q(
          "SELECT id,is_default FROM ai_models WHERE enabled=1 ORDER BY id",
          [],
          c,
        );
        if (available.length && !available.some((m) => m.is_default))
          await q(
            "UPDATE ai_models SET is_default=1 WHERE id=?",
            [available[0].id],
            c,
          );
        return resultId;
      });
      await audit(u, "配置 AI 模型", id);
      return reply({ id });
    }
  }
  return null;
}
