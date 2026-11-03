import { q } from "./db.mjs";
import crypto from "node:crypto";
export const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
export function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
export function text(v, name = "内容", max = 2000) {
  if (typeof v !== "string" || !v.trim() || v.trim().length > max)
    fail(`${name}必填且最多 ${max} 字`);
  return v.trim();
}
export function num(v) {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1) fail("无效编号");
  return n;
}
export async function user(req) {
  const raw = req.cookies.get("sc_session")?.value;
  if (!raw) fail("请先登录", 401);
  const a = await q(
    "SELECT u.id,u.name,u.email,u.role,u.bio FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>NOW() AND u.active=1",
    [sha(raw)],
  );
  if (!a[0]) fail("登录已过期，请重新登录", 401);
  return a[0];
}
export function roles(u, ...r) {
  if (!r.includes(u.role)) fail("没有执行此操作的权限", 403);
}
export async function projectAccess(u, id) {
  if (u.role === "admin") return;
  const a = await q(
    "SELECT project_id FROM project_members WHERE project_id=? AND user_id=?",
    [id, u.id],
  );
  if (!a.length) fail("无权访问此项目", 403);
}
export async function taskAccess(u, id, { library = false, conn } = {}) {
  const t = (
    await q(
      "SELECT t.*,p.archived project_archived,p.name project_name,u.name assignee_name FROM tasks t JOIN projects p ON p.id=t.project_id JOIN users u ON u.id=t.assignee_id WHERE t.id=?",
      [id],
      conn,
    )
  )[0];
  if (!t) fail("任务不存在", 404);
  if (u.role === "vendor") {
    if (t.assignee_id !== u.id) fail("无权访问此任务", 403);
  } else if (u.role !== "admin" && !(library && t.approved_version_id)) {
    await projectAccess(u, t.project_id);
  }
  return t;
}
export async function audit(u, action, target, detail = "") {
  await q(
    "INSERT INTO audit_logs(user_id,action,target,detail) VALUES(?,?,?,?)",
    [u.id, action, String(target), detail.slice(0, 500)],
  );
}
export async function notify(id, title, link, conn) {
  await q(
    "INSERT INTO notifications(user_id,title,link) VALUES(?,?,?)",
    [id, title, link],
    conn,
  );
}
export async function rate(bucket, max, seconds) {
  await q(
    "INSERT INTO rate_limits(bucket,hits,reset_at) VALUES(?,1,DATE_ADD(NOW(),INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE hits=IF(reset_at<NOW(),1,hits+1),reset_at=IF(reset_at<NOW(),DATE_ADD(NOW(),INTERVAL ? SECOND),reset_at)",
    [bucket, seconds, seconds],
  );
  const [r] = await q("SELECT hits FROM rate_limits WHERE bucket=?", [bucket]);
  if (r.hits > max) fail("操作过于频繁，请稍后重试", 429);
}
