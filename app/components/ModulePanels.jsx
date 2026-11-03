"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  X,
  Save,
  Archive,
  RotateCcw,
  Upload,
  Trash2,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  Check,
  Edit3,
  Users,
  Bell,
  Sparkles,
  Send,
  Box,
} from "lucide-react";
import { request as api } from "./client";
function ErrorLine({ value }) {
  return value ? (
    <div className="error" role="alert">
      {value}
    </div>
  ) : null;
}
function Dialog({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    ref.current?.focus();
    const f = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header>
          <h2>{title}</h2>
          <button className="iconbtn" aria-label="关闭" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Field({
  name,
  label,
  value,
  onChange,
  type = "text",
  required = true,
  ...rest
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        {...rest}
      />
    </label>
  );
}
function Confirm({ title, detail, onClose, onAccept }) {
  const [busy, B] = useState(false),
    [err, E] = useState("");
  return (
    <Dialog title={title} onClose={onClose}>
      <p>{detail}</p>
      <ErrorLine value={err} />
      <div className="form-actions">
        <button className="btn" onClick={onClose}>
          取消
        </button>
        <button
          className="btn primary"
          disabled={busy}
          onClick={async () => {
            B(true);
            try {
              await onAccept();
              onClose();
            } catch (e) {
              E(e.message);
            } finally {
              B(false);
            }
          }}
        >
          {busy ? "处理中…" : "确认"}
        </button>
      </div>
    </Dialog>
  );
}
export function TaskActions({ task, people, onDone }) {
  const [edit, S] = useState(false),
    [confirm, C] = useState(false);
  return (
    <>
      <button
        className="btn"
        onClick={() => S(true)}
        disabled={!!task.archived || !!task.project_archived}
      >
        <Edit3 size={15} />
        编辑任务
      </button>
      <button className="btn" onClick={() => C(true)}>
        <Archive size={15} />
        {task.archived ? "恢复任务" : "归档任务"}
      </button>
      {edit && (
        <TaskEdit
          task={task}
          people={people}
          onClose={() => S(false)}
          onDone={onDone}
        />
      )}{" "}
      {confirm && (
        <Confirm
          title={task.archived ? "恢复任务" : "归档任务"}
          detail={
            task.archived
              ? "恢复后可以继续提交和审阅。"
              : "归档后任务只读，文件、版本与已验收资产会保留。"
          }
          onClose={() => C(false)}
          onAccept={async () => {
            await api(
              "tasks/" + task.id,
              { archived: !task.archived, revision: task.revision },
              "PATCH",
            );
            await onDone();
          }}
        />
      )}
    </>
  );
}
function TaskEdit({ task: t, people, onClose, onDone }) {
  const [d, D] = useState({
      title: t.title,
      requirements: t.requirements,
      formats: t.formats,
      assigneeId: t.assignee_id,
      dueDate: t.due_date,
      category: t.category,
      priority: t.priority,
      license: t.license,
      licenseNote: t.license_note,
      requireTexture: !!t.require_texture,
      revision: t.revision,
    }),
    [err, E] = useState(""),
    [busy, B] = useState(false);
  const set = (k, v) => D((x) => ({ ...x, [k]: v }));
  return (
    <Dialog title="编辑交付任务" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          B(true);
          try {
            await api("tasks/" + t.id, d, "PATCH");
            await onDone();
            onClose();
          } catch (e) {
            E(e.message);
          } finally {
            B(false);
          }
        }}
      >
        <Field
          label="任务名称"
          value={d.title}
          onChange={(v) => set("title", v)}
        />
        <label className="field">
          <span>制作要求</span>
          <textarea
            required
            rows={5}
            value={d.requirements}
            onChange={(e) => set("requirements", e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>负责人</span>
            <select
              value={d.assigneeId}
              disabled={t.status === "in_review"}
              onChange={(e) => set("assigneeId", +e.target.value)}
            >
              {people.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="截止日期"
            type="date"
            value={d.dueDate}
            onChange={(v) => set("dueDate", v)}
          />
          <Field
            label="允许模型格式"
            value={d.formats}
            onChange={(v) => set("formats", v)}
          />
          <label className="field">
            <span>分类</span>
            <select
              value={d.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {["场景", "角色", "道具", "材质", "特效"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>优先级</span>
            <select
              value={d.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              <option value="normal">普通</option>
              <option value="high">高优先级</option>
            </select>
          </label>
          <label className="field">
            <span>授权范围</span>
            <select
              value={d.license}
              onChange={(e) => set("license", e.target.value)}
            >
              <option value="all_projects">公司内部所有项目</option>
              <option value="source_only">仅来源项目</option>
            </select>
          </label>
        </div>
        <Field
          label="授权限制"
          value={d.licenseNote}
          required={false}
          onChange={(v) => set("licenseNote", v)}
        />
        <label className="check-label">
          <input
            type="checkbox"
            checked={d.requireTexture}
            onChange={(e) => set("requireTexture", e.target.checked)}
          />
          必须上传贴图
        </label>
        <ErrorLine value={err} />
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>
            <Save size={15} />
            {busy ? "保存中…" : "保存任务"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function ProjectsPanel({ base, refresh, toast }) {
  const [edit, S] = useState(null),
    [members, M] = useState(null),
    [err, E] = useState(""),
    [confirm, C] = useState(null);
  const managed = ["admin", "lead"].includes(base.user.role);
  const loadMembers = async (p) => {
    try {
      M({ project: p, users: await api("projects/" + p.id + "/members") });
    } catch (e) {
      E(e.message);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>项目管理</h1>
          <p>维护项目资料、协作成员与交付状态。</p>
        </div>
        {managed && (
          <Link className="btn primary" href="/tasks">
            <Plus size={15} />
            创建项目与任务
          </Link>
        )}
      </div>
      <ErrorLine value={err} />
      <div className="project-management">
        {base.projects.map((p) => (
          <section className="panel padded" key={p.id}>
            <div className="section-heading">
              <h2>{p.name}</h2>
              <span
                className={"badge " + (p.archived ? "assigned" : "approved")}
              >
                {p.archived ? "已归档" : "进行中"}
              </span>
            </div>
            <p className="muted">{p.description}</p>
            <div className="module-actions">
              <Link className="btn" href={"/tasks?project=" + p.id}>
                查看交付任务
              </Link>
              {managed && (
                <>
                  <button className="btn" onClick={() => S(p)}>
                    编辑资料
                  </button>
                  <button className="btn" onClick={() => loadMembers(p)}>
                    <Users size={15} />
                    成员
                  </button>
                  <button className="btn" onClick={() => C(p)}>
                    {p.archived ? "恢复" : "归档"}
                  </button>
                </>
              )}
            </div>
          </section>
        ))}
      </div>
      {edit && (
        <ProjectEdit project={edit} onClose={() => S(null)} onDone={refresh} />
      )}{" "}
      {confirm && (
        <Confirm
          title={confirm.archived ? "恢复项目" : "归档项目"}
          detail={
            confirm.archived
              ? "恢复后可以继续交付与协作。"
              : "项目中的任务将变为只读，文件、版本和资产保留。"
          }
          onClose={() => C(null)}
          onAccept={async () => {
            await api(
              "projects/" + confirm.id,
              { archived: !confirm.archived, revision: confirm.revision },
              "PATCH",
            );
            await refresh();
            toast("项目状态已更新");
          }}
        />
      )}
      {members && (
        <Dialog
          title={members.project.name + " · 协作成员"}
          onClose={() => M(null)}
        >
          <p className="muted">
            外包通过任务分配授权。移除成员前请处理其负责的任务。
          </p>
          <ErrorLine value={err} />
          {members.users.map((u) => (
            <div className="simple-row" key={u.id}>
              <span>{u.name}</span>
              {u.id === members.project.owner_id ? (
                <small>项目创建人</small>
              ) : (
                <button
                  className="text-link"
                  disabled={!!members.project.archived}
                  onClick={async () => {
                    try {
                      await api(
                        "projects/" + members.project.id + "/members/" + u.id,
                        {},
                        "DELETE",
                      );
                      await loadMembers(members.project);
                      await refresh();
                    } catch (e) {
                      E(e.message);
                    }
                  }}
                >
                  移除成员
                </button>
              )}
            </div>
          ))}
          <form
            className="module-actions"
            onSubmit={async (e) => {
              e.preventDefault();
              const userId = new FormData(e.currentTarget).get("userId");
              if (!userId) return;
              try {
                await api("projects/" + members.project.id + "/members", {
                  userId,
                });
                await loadMembers(members.project);
                await refresh();
              } catch (e) {
                E(e.message);
              }
            }}
          >
            <select name="userId" required>
              <option value="">选择内部成员</option>
              {base.people
                .filter(
                  (u) =>
                    u.role !== "vendor" &&
                    !members.users.some((x) => x.id === u.id),
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
            <button
              className="btn primary"
              disabled={!!members.project.archived}
            >
              添加成员
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
function ProjectEdit({ project: p, onClose, onDone }) {
  const [name, N] = useState(p.name),
    [description, D] = useState(p.description),
    [err, E] = useState(""),
    [busy, B] = useState(false);
  return (
    <Dialog title="编辑项目" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          B(true);
          try {
            await api(
              "projects/" + p.id,
              { name, description, revision: p.revision },
              "PATCH",
            );
            await onDone();
            onClose();
          } catch (e) {
            E(e.message);
          } finally {
            B(false);
          }
        }}
      >
        <Field label="项目名称" value={name} onChange={N} />
        <label className="field">
          <span>项目说明</span>
          <textarea
            required
            value={description}
            onChange={(e) => D(e.target.value)}
            rows={4}
          />
        </label>
        <ErrorLine value={err} />
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>
            保存项目
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function DeliveryUpload({ task: t, onDone }) {
  const [files, F] = useState([]),
    [notes, N] = useState(""),
    [kind, K] = useState("model"),
    [queue, Q] = useState([]),
    [err, E] = useState(""),
    [busy, B] = useState(false),
    [ready, R] = useState(false),
    [saved, S] = useState(""),
    sequence = useRef(Promise.resolve()),
    currentNotes = useRef("");
  useEffect(() => {
    let alive = true;
    api("tasks/" + t.id + "/draft")
      .then((d) => {
        if (alive) {
          F(d.files);
          N(d.notes);
          currentNotes.current = d.notes;
          R(true);
          S(d.updated_at ? "已恢复服务端草稿" : "");
        }
      })
      .catch((e) => E(e.message));
    return () => {
      alive = false;
    };
  }, [t.id, t.status]);
  const save = () => {
    const value = currentNotes.current;
    sequence.current = sequence.current
      .catch(() => {})
      .then(() => api("tasks/" + t.id + "/draft", { notes: value }, "PATCH"));
    return sequence.current.then(
      () => {
        if (value === currentNotes.current) S("草稿已保存");
      },
      (e) => {
        S("草稿保存失败");
        E(e.message);
        throw e;
      },
    );
  };
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      save().catch(() => {});
    }, 750);
    return () => clearTimeout(timer);
  }, [notes, ready]);
  const send = (entry) => {
    Q((q) =>
      q.map((i) =>
        i.id === entry.id ? { ...i, status: "uploading", progress: 0 } : i,
      ),
    );
    const fd = new FormData();
    fd.append("file", entry.file);
    fd.append("kind", entry.kind);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/tasks/" + t.id + "/files");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        Q((q) =>
          q.map((i) =>
            i.id === entry.id
              ? { ...i, progress: Math.round((e.loaded / e.total) * 100) }
              : i,
          ),
        );
    };
    xhr.onload = () => {
      let d;
      try {
        d = JSON.parse(xhr.responseText);
      } catch {
        d = { error: "服务返回异常" };
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        F((f) => [...f, d]);
        Q((q) => q.filter((i) => i.id !== entry.id));
        S("文件已保存，可刷新恢复");
      } else
        Q((q) =>
          q.map((i) =>
            i.id === entry.id
              ? { ...i, status: "error", error: d.error || "上传失败" }
              : i,
          ),
        );
    };
    xhr.onerror = () =>
      Q((q) =>
        q.map((i) =>
          i.id === entry.id
            ? { ...i, status: "error", error: "网络中断，请重试" }
            : i,
        ),
      );
    xhr.send(fd);
  };
  const pick = (e) => {
    const entries = Array.from(e.target.files || []).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      kind,
      status: "queued",
      progress: 0,
    }));
    e.target.value = "";
    Q((q) => [...q, ...entries]);
    entries.forEach(send);
  };
  return (
    <section className="panel padded">
      <div className="section-heading">
        <h2>提交新版本</h2>
        <small className="muted" aria-live="polite">
          {saved}
        </small>
      </div>
      {t.archived || t.project_archived ? (
        <div className="info">已归档，只能查看历史文件。</div>
      ) : t.status === "in_review" ? (
        <div className="info">当前版本正在审阅，收到结果后可继续提交。</div>
      ) : (
        <>
          <div className="label-row">
            <label htmlFor="upload-kind">文件类型</label>
            <select
              id="upload-kind"
              value={kind}
              onChange={(e) => K(e.target.value)}
            >
              <option value="model">模型文件（{t.formats}）</option>
              <option value="texture">贴图与依赖文件</option>
              <option value="preview">预览图</option>
            </select>
          </div>
          <label className="upload-zone">
            <Upload />
            <b>选择文件，支持多文件上传</b>
            <span>单文件不超过 25MB；成功文件自动保存到草稿</span>
            <input
              aria-label="交付文件"
              type="file"
              multiple
              hidden
              onChange={pick}
            />
          </label>
          {queue.map((item) => (
            <div className="upload-item" key={item.id}>
              <span>{item.file.name}</span>
              {item.status === "error" ? (
                <>
                  <small className="error-text">{item.error}</small>
                  <button className="btn" onClick={() => send(item)}>
                    重试失败文件
                  </button>
                  <button
                    className="iconbtn"
                    aria-label="移除失败项"
                    onClick={() => Q((q) => q.filter((x) => x.id !== item.id))}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <progress max="100" value={item.progress} />
                  <small>{item.progress}%</small>
                </>
              )}
            </div>
          ))}
          {files.map((f) => (
            <div className="uploaded-row" key={f.id}>
              <Check size={16} />
              <a href={"/api/files/" + f.id}>{f.name}</a>
              <small>
                {{ model: "模型", texture: "贴图", preview: "预览" }[f.kind]} ·{" "}
                {Math.ceil(f.size / 1024)} KB
              </small>
              <button
                className="iconbtn"
                aria-label={"移除 " + f.name}
                onClick={async () => {
                  try {
                    await api("files/" + f.id, {}, "DELETE");
                    F((x) => x.filter((z) => z.id !== f.id));
                  } catch (e) {
                    E(e.message);
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              B(true);
              E("");
              try {
                await save();
                await api("tasks/" + t.id + "/submit", {
                  notes: currentNotes.current,
                  fileIds: files.map((f) => f.id),
                });
                F([]);
                N("");
                currentNotes.current = "";
                R(false);
                await onDone();
              } catch (e) {
                E(e.message);
              } finally {
                B(false);
              }
            }}
          >
            <label className="field">
              <span>版本说明</span>
              <textarea
                name="notes"
                aria-label="版本说明"
                disabled={!ready || busy}
                value={notes}
                onChange={(e) => {
                  currentNotes.current = e.target.value;
                  N(e.target.value);
                  S("正在保存…");
                }}
                required
                maxLength={4000}
                rows={4}
                placeholder="描述本次调整，说明会自动保存"
              />
            </label>
            <ErrorLine value={err} />
            <div className="form-actions">
              <button
                className="btn"
                type="button"
                onClick={() => save().catch(() => {})}
              >
                保存草稿
              </button>
              <button
                className="btn primary"
                disabled={
                  busy ||
                  !ready ||
                  queue.some((i) => i.status === "uploading") ||
                  !files.length
                }
              >
                {busy ? "提交中…" : "提交审阅"}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
export function NotificationsPanel({ refresh }) {
  const [data, D] = useState(null),
    [page, P] = useState(1),
    [unread, U] = useState(false),
    [err, E] = useState("");
  const load = () =>
    api(`notifications?page=${page}&unread=${unread ? 1 : 0}`)
      .then(D)
      .catch((e) => E(e.message));
  useEffect(() => {
    load();
  }, [page, unread]);
  return (
    <>
      <div className="section-heading">
        <h2>消息通知 {data && <small>未读 {data.unreadCount}</small>}</h2>
        <div className="module-actions">
          <label className="check-label">
            <input
              type="checkbox"
              checked={unread}
              onChange={(e) => {
                U(e.target.checked);
                P(1);
              }}
            />
            仅未读
          </label>
          <button
            className="btn"
            onClick={async () => {
              try {
                await api("notifications/read", {});
                await load();
                await refresh();
              } catch (e) {
                E(e.message);
              }
            }}
          >
            全部已读
          </button>
        </div>
      </div>
      <ErrorLine value={err} />
      {data?.items.map((n) => (
        <div
          className={"notification-row " + (!n.is_read ? "unread" : "")}
          key={n.id}
        >
          <Bell size={17} />
          <div>
            <Link
              href={n.link}
              onClick={() =>
                api("notifications/" + n.id, { read: true }, "PATCH").catch(
                  () => {},
                )
              }
            >
              <b>{n.title}</b>
            </Link>
            <small>{n.created_at}</small>
          </div>
          <button
            className="text-link"
            onClick={async () => {
              try {
                await api(
                  "notifications/" + n.id,
                  { read: !n.is_read },
                  "PATCH",
                );
                await load();
                await refresh();
              } catch (e) {
                E(e.message);
              }
            }}
          >
            {n.is_read ? "标为未读" : "标为已读"}
          </button>
        </div>
      ))}
      {data && !data.items.length && <div className="empty">暂无消息</div>}
      <Pager page={page} data={data} onChange={P} />
    </>
  );
}
export function Pager({ page, data, onChange }) {
  return data ? (
    <div className="pager">
      <small>
        共 {data.total} 条 · 第 {page} / {data.pages} 页
      </small>
      <button
        className="btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="上一页"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        className="btn"
        disabled={page >= data.pages}
        onClick={() => onChange(page + 1)}
        aria-label="下一页"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  ) : null;
}
export function RecordsPanel({ type }) {
  const [data, D] = useState(null),
    [page, P] = useState(1),
    [search, S] = useState(""),
    [status, T] = useState(""),
    [err, E] = useState("");
  const params = new URLSearchParams({
    type,
    page: String(page),
    q: search,
    status,
  }).toString();
  useEffect(() => {
    const c = new AbortController(),
      t = setTimeout(() => {
        api("admin/records?" + params)
          .then((x) => {
            if (!c.signal.aborted) D(x);
          })
          .catch((e) => E(e.message));
      }, 200);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [params]);
  const headers =
    type === "usage"
      ? ["时间", "用户", "功能", "模型", "状态", "Tokens", "耗时"]
      : ["时间", "用户", "操作", "对象", "说明"];
  return (
    <section className="panel padded">
      <div className="section-heading">
        <h2>{type === "usage" ? "AI 调用记录" : "操作审计日志"}</h2>
        <a className="btn" href={"/api/admin/records?" + params + "&export=1"}>
          <Download size={15} />
          导出筛选结果
        </a>
      </div>
      <div className="toolbar">
        <input
          aria-label="搜索日志"
          placeholder="搜索用户、操作或模型…"
          value={search}
          onChange={(e) => {
            S(e.target.value);
            P(1);
          }}
        />
        {type === "usage" && (
          <select
            value={status}
            onChange={(e) => {
              T(e.target.value);
              P(1);
            }}
          >
            <option value="">全部状态</option>
            <option value="success">成功</option>
            <option value="error">失败</option>
          </select>
        )}
      </div>
      <ErrorLine value={err} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((r) => (
              <tr key={r.id}>
                <td>{r.created_at}</td>
                <td>{r.user_name || "—"}</td>
                {type === "usage" ? (
                  <>
                    <td>{r.feature}</td>
                    <td>{r.model}</td>
                    <td>{r.status === "success" ? "成功" : "失败"}</td>
                    <td>{r.tokens}</td>
                    <td>{(r.duration_ms / 1000).toFixed(1)}s</td>
                  </>
                ) : (
                  <>
                    <td>{r.action}</td>
                    <td>{r.target}</td>
                    <td>{r.detail}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && !data.items.length && (
        <div className="empty">没有符合条件的记录</div>
      )}
      <Pager page={page} data={data} onChange={P} />
    </section>
  );
}
export function UserActions({ user: u, onDone, self }) {
  const [mode, M] = useState(""),
    [name, N] = useState(u.name),
    [email, EM] = useState(u.email),
    [password, P] = useState(""),
    [err, E] = useState(""),
    [busy, B] = useState(false);
  return (
    <>
      <button
        className="text-link"
        onClick={() => {
          N(u.name);
          EM(u.email);
          E("");
          M("profile");
        }}
      >
        编辑
      </button>
      {!self && (
        <button
          className="text-link"
          onClick={() => {
            P("");
            E("");
            M("password");
          }}
        >
          重置密码
        </button>
      )}
      {mode && (
        <Dialog
          title={mode === "profile" ? "编辑成员资料" : "重置成员密码"}
          onClose={() => M("")}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              B(true);
              try {
                await api(
                  "admin/users/" + u.id + "/" + mode,
                  mode === "profile" ? { name, email } : { password },
                  mode === "profile" ? "PATCH" : "POST",
                );
                await onDone();
                M("");
              } catch (e) {
                E(e.message);
              } finally {
                B(false);
              }
            }}
          >
            {mode === "profile" ? (
              <>
                <Field label="姓名" value={name} onChange={N} />
                <Field label="邮箱" type="email" value={email} onChange={EM} />
              </>
            ) : (
              <>
                <p>重置后该成员的所有已登录会话将失效。</p>
                <Field
                  label="新密码（10–72 位）"
                  type="password"
                  value={password}
                  onChange={P}
                  minLength={10}
                  maxLength={72}
                />
              </>
            )}
            <ErrorLine value={err} />
            <div className="form-actions">
              <button className="btn primary" disabled={busy}>
                保存
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
export function ReuseRemove({ id, onDone }) {
  const [show, S] = useState(false);
  return (
    <>
      <button className="btn" onClick={() => S(true)}>
        移除引用
      </button>
      {show && (
        <Confirm
          title="移除项目引用"
          detail="只移除这个项目的引用记录，原资产和其他项目不受影响。"
          onClose={() => S(false)}
          onAccept={async () => {
            await api("reuses/" + id, {}, "DELETE");
            await onDone();
          }}
        />
      )}
    </>
  );
}
export function AssetManage({ task: t, onDone }) {
  const [show, S] = useState(false);
  return (
    <>
      <button className="btn" onClick={() => S(true)}>
        {t.library_visible ? "下架资产" : "恢复上架"}
      </button>
      {show && (
        <Confirm
          title={t.library_visible ? "下架资产" : "恢复上架"}
          detail={
            t.library_visible
              ? "资产将退出正式库搜索和新增复用，已有项目引用及历史文件保留。"
              : "恢复后内部成员可检索和复用当前已验收版本。"
          }
          onClose={() => S(false)}
          onAccept={async () => {
            await api(
              "assets/" + t.id + "/visibility",
              { visible: !t.library_visible },
              "PATCH",
            );
            await onDone();
          }}
        />
      )}
    </>
  );
}
export function ChatPanel() {
  const [conversations, C] = useState([]),
    [selected, S] = useState(null),
    [data, D] = useState(null),
    [prompt, P] = useState(""),
    [busy, B] = useState(false),
    [err, E] = useState(""),
    [models, M] = useState([]),
    [model, MO] = useState(""),
    [archived, A] = useState(false),
    [rename, R] = useState(false),
    [title, T] = useState("");
  const end = useRef();
  const list = () =>
    api("ai/conversations?archived=" + (archived ? 1 : 0))
      .then(C)
      .catch((e) => E(e.message));
  const load = (id) =>
    api("ai/conversations/" + id)
      .then(D)
      .catch((e) => E(e.message));
  useEffect(() => {
    list();
  }, [archived]);
  useEffect(() => {
    api("ai/models")
      .then(M)
      .catch((e) => E(e.message));
  }, []);
  useEffect(() => {
    D(null);
    if (selected) load(selected);
  }, [selected]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [data, busy]);
  const ask = async (value) => {
    if (busy) return;
    B(true);
    E("");
    let id = selected;
    try {
      if (!id) {
        id = (await api("ai/conversations", {})).id;
        S(id);
      }
      await api("ai/conversations/" + id + "/messages", {
        prompt: value,
        modelId: model || undefined,
      });
      P("");
      await load(id);
      await list();
    } catch (e) {
      E(e.message);
      if (id) await load(id);
    } finally {
      B(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>AI 创作助手</h1>
          <p>
            保留完整对话，结合当前可见任务继续讨论。{" "}
            <a href="/assistant/history" className="text-link">
              全部 AI 调用历史
            </a>
          </p>
        </div>
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => {
            S(null);
            D(null);
            P("");
            E("");
          }}
        >
          <Plus size={16} />
          新建对话
        </button>
      </div>
      <div className="chat-layout">
        <aside className="panel padded">
          <label className="check-label">
            <input
              type="checkbox"
              checked={archived}
              disabled={busy}
              onChange={(e) => {
                A(e.target.checked);
                S(null);
              }}
            />
            查看已归档对话
          </label>
          {conversations.map((c) => (
            <button
              disabled={busy}
              className={
                "history-item " + (c.id === selected ? "chat-selected" : "")
              }
              key={c.id}
              onClick={() => S(c.id)}
            >
              <b>{c.title}</b>
              <small>{c.updated_at}</small>
            </button>
          ))}
          {!conversations.length && (
            <p className="muted">暂无对话，发送问题开始。</p>
          )}
        </aside>
        <section className="panel padded chat-main">
          <div className="section-heading">
            <h2>{data?.title || "新的创作讨论"}</h2>
            {data && (
              <div className="module-actions">
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => {
                    T(data.title);
                    R(true);
                  }}
                >
                  重命名
                </button>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await api(
                        "ai/conversations/" + selected,
                        { archived: !data.archived },
                        "PATCH",
                      );
                      S(null);
                      D(null);
                      await list();
                    } catch (e) {
                      E(e.message);
                    }
                  }}
                >
                  {data.archived ? "恢复" : "归档"}
                </button>
              </div>
            )}
          </div>
          <div className="chat-messages">
            {!data?.messages.length && (
              <div className="assistant-intro">
                <Sparkles size={35} />
                <h2>有什么创作问题想一起解决？</h2>
                <p>可询问交付要求、任务进度或审阅方法。建议需人工核对。</p>
                <div className="suggestions">
                  {[
                    "帮我整理可见任务的待办事项",
                    "给我一份森林场景模型验收清单",
                  ].map((s) => (
                    <button disabled={busy} key={s} onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {data?.messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? "question-bubble" : "ai-output"}
              >
                {m.role === "assistant" && (
                  <span>
                    <Sparkles size={14} />
                    {m.status === "error" ? "生成失败" : m.model + " · AI 建议"}
                  </span>
                )}
                <div className="chat-message-text">{m.content}</div>
                {m.status === "error" && (
                  <button
                    className="btn"
                    disabled={busy || data.archived}
                    onClick={() => {
                      const prev = data.messages
                        .filter((x) => x.id < m.id && x.role === "user")
                        .at(-1);
                      if (prev) ask(prev.content);
                    }}
                  >
                    重试这条问题
                  </button>
                )}
              </div>
            ))}
            {busy && <div className="thinking">正在生成回复，请稍候…</div>}
            <div ref={end} />
          </div>
          <ErrorLine value={err} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(prompt);
            }}
          >
            <label className="field">
              <span>选择模型</span>
              <select
                value={model}
                disabled={busy}
                onChange={(e) => MO(e.target.value)}
              >
                <option value="">使用默认模型</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="assistant-input">
              <textarea
                aria-label="对话问题"
                value={prompt}
                onChange={(e) => P(e.target.value)}
                maxLength={4000}
                disabled={!!data?.archived}
                required
                placeholder={
                  data?.archived
                    ? "请先恢复对话"
                    : "继续提问，可以引用上一轮讨论…"
                }
              />
              <button
                className="btn primary"
                disabled={busy || !!data?.archived || !prompt.trim()}
              >
                <Send size={17} />
                发送
              </button>
            </div>
          </form>
        </section>
      </div>
      {rename && (
        <Dialog title="重命名对话" onClose={() => R(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("ai/conversations/" + selected, { title }, "PATCH");
                await load(selected);
                await list();
                R(false);
              } catch (e) {
                E(e.message);
              }
            }}
          >
            <Field
              label="对话标题"
              value={title}
              onChange={T}
              maxLength={100}
            />
            <div className="form-actions">
              <button className="btn primary">保存</button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
export function CommentEdit({ comment, onDone }) {
  const [open, O] = useState(false),
    [body, B] = useState(comment.body),
    [err, E] = useState(""),
    [busy, S] = useState(false);
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          B(comment.body);
          O(true);
        }}
      >
        编辑
      </button>
      {open && (
        <Dialog title="编辑审阅意见" onClose={() => O(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              S(true);
              try {
                await api(
                  "comments/" + comment.id + "/edit",
                  { body },
                  "PATCH",
                );
                await onDone();
                O(false);
              } catch (e) {
                E(e.message);
              } finally {
                S(false);
              }
            }}
          >
            <textarea
              required
              maxLength={3000}
              rows={5}
              value={body}
              onChange={(e) => B(e.target.value)}
            />
            <ErrorLine value={err} />
            <div className="form-actions">
              <button className="btn primary" disabled={busy}>
                保存意见
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

export function AIHistoryPanel() {
  const [page, P] = useState(1),
    [data, D] = useState(null),
    [selected, S] = useState(null),
    [error, E] = useState("");
  useEffect(() => {
    let active = true;
    api("ai/records?page=" + page)
      .then((d) => {
        if (active) {
          D(d);
          E("");
        }
      })
      .catch((e) => E(e.message));
    return () => {
      active = false;
    };
  }, [page]);
  const names = {
    assistant: "创作助手",
    requirements: "制作要求",
    summary: "审阅总结",
    tags: "标签建议",
    search: "语义检索",
    connectivity: "连接测试",
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>AI 调用历史</h1>
          <p>查看本人的各项 AI 请求、结果与失败记录。</p>
        </div>
        <Link href="/assistant" className="btn">
          返回对话
        </Link>
      </div>
      <ErrorLine value={error} />
      <section className="panel padded">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>功能</th>
                <th>问题</th>
                <th>模型 / 状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((r) => (
                <tr key={r.id}>
                  <td>{r.created_at}</td>
                  <td>{names[r.feature] || r.feature}</td>
                  <td>{r.input_text?.slice(0, 80)}</td>
                  <td>
                    {r.model} · {r.status === "success" ? "成功" : "失败"}
                  </td>
                  <td>
                    <button className="text-link" onClick={() => S(r)}>
                      查看结果
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && !data.items.length && (
          <p className="empty">暂无 AI 调用记录</p>
        )}
        <Pager page={page} data={data} onChange={P} />
      </section>
      {selected && (
        <Dialog
          title={names[selected.feature] || selected.feature}
          onClose={() => S(null)}
        >
          <b>请求</b>
          <p className="chat-message-text">{selected.input_text}</p>
          <b>{selected.status === "success" ? "结果" : "失败原因"}</b>
          <p className="chat-message-text">{selected.output_text}</p>
          <small>
            {selected.model} · {selected.tokens} tokens
          </small>
        </Dialog>
      )}
    </>
  );
}
