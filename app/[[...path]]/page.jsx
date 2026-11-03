"use client";
import dynamic from "next/dynamic";
import {
  TaskActions,
  ProjectsPanel,
  DeliveryUpload,
  NotificationsPanel,
  RecordsPanel,
  UserActions,
  ReuseRemove,
  AssetManage,
  ChatPanel,
  AIHistoryPanel,
  CommentEdit,
} from "../components/ModulePanels";
const ModelViewer = dynamic(() => import("../components/ModelViewer"), {
  ssr: false,
  loading: () => <div className="info">加载三维预览…</div>,
});
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Layers,
  LayoutDashboard,
  FolderKanban,
  Box,
  MessageSquare,
  Users,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Bell,
  LogOut,
  Upload,
  Download,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Grid2X2,
  List,
  MoreHorizontal,
  Star,
  Sparkles,
  X,
  Send,
  FileBox,
  FileImage,
  GitCompare,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Target,
  Shield,
  Activity,
  KeyRound,
  User,
  Menu,
  ExternalLink,
  Leaf,
  Command,
  RefreshCw,
  FileText,
  Lock,
  Eye,
} from "lucide-react";
const roleNames = {
  admin: "系统管理员",
  lead: "美术负责人",
  artist: "内部美术",
  vendor: "外包美术",
};
const states = {
  assigned: "待提交",
  in_review: "待审阅",
  changes_requested: "待修改",
  approved: "已验收",
};
const sizes = (n) =>
  n > 1048576
    ? (n / 1048576).toFixed(1) + " MB"
    : Math.max(1, Math.round(n / 1024)) + " KB";
const date = (s) => (s ? String(s).slice(0, 10) : "—");
async function api(url, data, method) {
  const r = await fetch("/api/" + url, {
    method: method || (data ? "POST" : "GET"),
    headers:
      data && !(data instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {},
    body: data
      ? data instanceof FormData
        ? data
        : JSON.stringify(data)
      : undefined,
  });
  let j;
  try {
    j = await r.json();
  } catch {
    throw new Error("服务返回异常，请重试");
  }
  if (!r.ok)
    throw Object.assign(new Error(j.error || "请求失败"), { status: r.status });
  return j;
}
function useLoad(url) {
  const [data, set] = useState(null),
    [error, err] = useState("");
  const reload = () =>
    api(url)
      .then((d) => {
        set(d);
        err("");
        return d;
      })
      .catch((e) => err(e.message));
  useEffect(() => {
    set(null);
    reload();
  }, [url]);
  return { data, error, reload };
}
function Badge({ status }) {
  return (
    <span className={"badge " + status}>
      <i />
      {states[status] || status}
    </span>
  );
}
function Avatar({ name = "S", small = false }) {
  return (
    <span className={"avatar " + (small ? "small" : "")}>
      {name.slice(0, 1)}
    </span>
  );
}
function Empty({
  text = "这里还没有内容",
  hint = "完成下一步操作后，内容会显示在这里。",
}) {
  return (
    <div className="empty">
      <Box size={32} />
      <h3>{text}</h3>
      <p>{hint}</p>
    </div>
  );
}
function ErrorBox({ error }) {
  return error ? (
    <div className="error">
      <AlertCircle size={16} />
      {error}
    </div>
  ) : null;
}
function Modal({ title, onClose, children }) {
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
      >
        <header>
          <h2>{title}</h2>
          <button className="iconbtn" aria-label="关闭弹窗" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Form({ children, onSubmit, button = "保存", secondary }) {
  const [busy, B] = useState(false),
    [error, E] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        B(true);
        E("");
        try {
          await onSubmit(Object.fromEntries(new FormData(e.currentTarget)));
        } catch (x) {
          E(x.message);
        } finally {
          B(false);
        }
      }}
    >
      {children}
      <ErrorBox error={error} />
      <div className="form-actions">
        {secondary}
        <button className="btn primary" disabled={busy}>
          {busy ? "处理中…" : button}
        </button>
      </div>
    </form>
  );
}
function AIOutput({ value }) {
  return (
    <div className="ai-output">
      <span>
        <Sparkles size={15} />
        AI 建议 · 请人工核对
      </span>
      <div>{value}</div>
    </div>
  );
}
function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <Layers size={21} />
      </span>
      ShareCreators<span className="brand-dot">.</span>
    </span>
  );
}
function Landing() {
  return (
    <div className="landing">
      <nav>
        <Brand />
        <div>
          <a href="#workflow">工作流程</a>
          <a href="#features">产品能力</a>
          <Link className="btn" href="/login">
            登录工作空间 <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>
      <main>
        <section className="studio-hero">
          <div className="hero-copy">
            <span className="studio-intro">
              <span /> 游戏美术团队的协作空间
            </span>
            <h1>
              让创作流动，
              <br />
              让好作品发生。
            </h1>
            <p>
              从第一版灵感，到最后一处细节。
              <br />
              将交付、审阅与资产收藏放进同一个空间，
              <br className="desktop-break" />
              让团队专注于创造下一个世界。
            </p>
            <div className="hero-actions">
              <Link href="/login" className="btn primary large">
                进入协作空间 <ArrowUpRight size={18} />
              </Link>
              <a className="workflow-link" href="#workflow">
                了解工作流程 <ChevronDown size={16} />
              </a>
            </div>
            <div className="hero-disciplines">
              <span>
                <Box size={16} /> 3D 资产
              </span>
              <span>
                <FileImage size={16} /> 概念设计
              </span>
              <span>
                <MessageSquare size={16} /> 在线审阅
              </span>
            </div>
          </div>
          <div className="studio-stage" aria-label="森林场景示例作品审阅界面">
            <div className="stage-header">
              <span>
                <span className="online-dot" /> 森林回响 / 场景探索
              </span>
              <span>
                示例项目 <ExternalLink size={12} />
              </span>
            </div>
            <div className="stage-canvas">
              <img src="/art/asset-1.svg" alt="森林古树游戏场景概念作品" />
              <span className="stage-version">
                森林古树 <b>V2</b>
              </span>
              <span className="stage-pin">1</span>
              <div className="stage-note">
                <span className="reviewer-dot">林</span>
                <div>
                  <b>美术审阅</b>
                  <p>树皮层次更清晰了，保留这一版。</p>
                  <span>
                    <CheckCircle2 size={12} /> 已完成修改
                  </span>
                </div>
              </div>
              <div className="stage-tools">
                <Box size={16} />
                <span /> <ZoomIn size={16} />
                <RotateCcw size={16} />
              </div>
            </div>
            <div className="stage-assets">
              {[
                [1, "森林古树"],
                [5, "林间植被"],
                [8, "场景道具"],
              ].map(([id, name]) => (
                <div key={id}>
                  <img src={`/art/asset-${id}.svg`} alt={name} />
                  <span>
                    {name}
                    <small>概念资产</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="workflow" className="landing-section">
          <div className="section-kicker">创作的每一步，都在一起</div>
          <h2>从交付到复用，一路清晰。</h2>
          <div className="workflow">
            {["提交作品", "位置审阅", "迭代修改", "验收入库", "跨项目复用"].map(
              (x, i) => (
                <div key={x}>
                  <b>0{i + 1}</b>
                  <h3>{x}</h3>
                  <p>
                    {
                      [
                        "模型、贴图与说明一起交付",
                        "意见绑定位置和具体版本",
                        "保留每一版创作与反馈",
                        "让确认过的成果有序沉淀",
                        "先确认授权，再选择升级",
                      ][i]
                    }
                  </p>
                </div>
              ),
            )}
          </div>
        </section>
        <section id="features" className="landing-section feature-three">
          {[
            [GitCompare, "版本不再混淆", "V1 与 V2 并排比较，反馈始终有来源。"],
            [
              Shield,
              "协作有清晰边界",
              "外包只看到自己的任务，素材复用遵守授权。",
            ],
            [
              Sparkles,
              "把重复工作交给 AI",
              "整理审阅意见、建议标签，用自然语言寻找资产。",
            ],
          ].map(([I, t, p]) => (
            <div key={t}>
              <I size={26} />
              <h3>{t}</h3>
              <p>{p}</p>
            </div>
          ))}
        </section>
      </main>
      <footer>
        <Brand />
        <span>为游戏美术团队而设计</span>
      </footer>
    </div>
  );
}
function Login() {
  const router = useRouter();
  return (
    <div className="login-page">
      <div className="login-art">
        <Link href="/">
          <Brand />
        </Link>
        <div>
          <div className="eyebrow">让创作与协作，同步发生</div>
          <h1>
            好作品，
            <br />
            值得更好的协作。
          </h1>
          <img src="/art/asset-5.svg" alt="森林植被概念示意" />
          <p>一个空间，连接创作的每个阶段。</p>
        </div>
      </div>
      <div className="login-form">
        <div>
          <span className="eyebrow">你的下一件好作品，从这里开始</span>
          <h1>欢迎回到创作空间</h1>
          <p>使用管理员为你分配的账号登录</p>
          <Form
            button="登录工作空间"
            onSubmit={async (d) => {
              await api("auth/login", d);
              router.push("/workspace");
            }}
          >
            <Field label="邮箱">
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                placeholder="you@studio.com"
              />
            </Field>
            <Field label="密码">
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="请输入密码"
              />
            </Field>
          </Form>
          <p className="login-help">
            <Lock size={14} />
            账号由管理员创建。如需加入，请联系项目负责人。
          </p>
          <Link href="/" className="muted">
            ← 返回产品首页
          </Link>
        </div>
      </div>
    </div>
  );
}
export default function Page() {
  const pathname = usePathname();
  if (pathname === "/") return <Landing />;
  if (pathname === "/login") return <Login />;
  return <Workspace key={pathname} path={pathname} />;
}
function Workspace({ path }) {
  const router = useRouter(),
    [base, S] = useState(null),
    [error, E] = useState(""),
    [toast, T] = useState(""),
    [mobile, M] = useState(false);
  const refresh = async () => {
    try {
      S(await api("bootstrap"));
    } catch (e) {
      if (e.status === 401) router.replace("/login");
      else E(e.message);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => T(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  if (!base)
    return (
      <div className="loading">
        <Brand />
        <p>{error || "正在加载工作空间…"}</p>
      </div>
    );
  const u = base.user,
    admin = u.role === "admin",
    internal = u.role !== "vendor";
  const nav = [
    ["工作空间", null],
    ["项目工作台", "/workspace", LayoutDashboard],
    ["交付任务", "/tasks", FolderKanban],
    ...(internal ? [["项目管理", "/projects", Users]] : []),
    ["在线审阅", "/reviews", MessageSquare],
    ...(internal
      ? [
          ["资产管理", null],
          ["正式资产库", "/assets", Box],
          ["我的收藏", "/account/favorites", Star],
        ]
      : []),
    ["个人空间", null],
    ["AI 创作助手", "/assistant", Sparkles],
    ["用户中心", "/account", User],
    ...(admin
      ? [
          ["管理空间", null],
          ["管理员后台", "/admin", Shield],
        ]
      : []),
  ];
  const isActive = (p) =>
    p === "/account"
      ? path.startsWith("/account") && path !== "/account/favorites"
      : p === "/tasks"
        ? path.startsWith("/tasks")
        : p === "/reviews"
          ? path.startsWith("/review")
          : path === p || path.startsWith(p + "/");
  const title = path.startsWith("/admin")
    ? "管理控制台"
    : path.startsWith("/account")
      ? "个人空间"
      : path.startsWith("/assets")
        ? "资产管理"
        : path.startsWith("/review")
          ? "审阅空间"
          : path === "/assistant"
            ? "AI 创作助手"
            : "工作空间";
  let content;
  if (path === "/workspace") content = <Dashboard base={base} />;
  else if (path === "/projects" && internal)
    content = <ProjectsPanel base={base} refresh={refresh} toast={T} />;
  else if (path === "/tasks" || path === "/reviews")
    content = (
      <Tasks
        base={base}
        refresh={refresh}
        toast={T}
        review={path === "/reviews"}
      />
    );
  else if (/^\/tasks\/\d+/.test(path))
    content = (
      <Task id={path.split("/")[2]} base={base} toast={T} refresh={refresh} />
    );
  else if (/^\/review\/\d+/.test(path))
    content = <Review id={path.split("/")[2]} base={base} toast={T} />;
  else if (path === "/assets" || path === "/account/favorites")
    content = (
      <Assets
        base={base}
        toast={T}
        favorites={path.includes("favorites")}
        refresh={refresh}
      />
    );
  else if (/^\/assets\/\d+/.test(path))
    content = (
      <Asset id={path.split("/")[2]} base={base} toast={T} refresh={refresh} />
    );
  else if (path === "/assistant") content = <ChatPanel />;
  else if (path === "/assistant/history") content = <AIHistoryPanel />;
  else if (path.startsWith("/account"))
    content = <Account base={base} refresh={refresh} toast={T} path={path} />;
  else if (path.startsWith("/admin") && admin)
    content = <Admin base={base} refresh={refresh} toast={T} path={path} />;
  else content = <Empty text="页面不存在或无权访问" />;
  return (
    <div className="shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="关闭导航"
          onClick={() => M(false)}
        />
      )}
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <Link href="/workspace">
          <Brand />
        </Link>
        <div className="workspace-switch">
          <span className="studio-icon">S</span>
          <span>
            Studio Workspace<small>游戏美术协作空间</small>
          </span>
          <Layers size={15} />
        </div>
        <nav>
          {nav.map(([label, p, I]) =>
            p ? (
              <Link key={p} className={isActive(p) ? "active" : ""} href={p}>
                <I size={18} />
                {label}
                {p === "/reviews" &&
                  base.tasks.filter((t) => t.status === "in_review").length >
                    0 && (
                    <em>
                      {
                        base.tasks.filter((t) => t.status === "in_review")
                          .length
                      }
                    </em>
                  )}
                {p === "/assistant" && <span className="new">AI</span>}
              </Link>
            ) : (
              <div className="nav-label" key={label}>
                {label}
              </div>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-tip">
            <span className="online-dot" />
            创作连接一切<small>让每一份灵感成为资产</small>
          </div>
          <Link href="/account" className="user-pill">
            <Avatar name={u.name} />
            <span>
              {u.name}
              <small>{roleNames[u.role]}</small>
            </span>
            <Settings size={16} />
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="iconbtn mobile-menu"
              aria-label={mobile ? "收起导航" : "展开导航"}
              aria-expanded={mobile}
              onClick={() => M(!mobile)}
            >
              <Menu />
            </button>
            <span>Studio Workspace</span>
            <ChevronRight size={14} />
            <b>{title}</b>
          </div>
          <div>
            <Link className="top-search" href={internal ? "/assets" : "/tasks"}>
              <Search size={15} />
              <span>搜索资产、项目与任务</span>
              <kbd>⌕</kbd>
            </Link>
            <Link
              className="notification-icon"
              href="/account/notifications"
              aria-label="查看通知"
            >
              <Bell size={19} />
              {base.unreadCount > 0 && <i />}
            </Link>
            <Avatar name={u.name} small />
          </div>
        </header>
        <main className="content">{content}</main>
        <footer className="app-footer">
          <span>ShareCreators · 为每一次创作提供连接</span>
          <span>示例资产用于演示 · 模型文件支持三维预览</span>
        </footer>
      </div>
      <MobileNavigation
        path={path}
        internal={internal}
        unread={base.unreadCount}
        close={() => M(false)}
      />
      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Heading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Dashboard({ base }) {
  const [project, P] = useState("all"),
    tasks = base.tasks
      .filter((t) => !t.archived && !t.project_archived)
      .filter((t) => project === "all" || t.project_id === Number(project));
  const review = tasks.filter((t) => t.status === "in_review"),
    change = tasks.filter((t) => t.status === "changes_requested"),
    done = tasks.filter((t) => t.approved_version_id);
  return (
    <>
      <Heading
        eyebrow="YOUR CREATIVE OVERVIEW"
        title={`你好，${base.user.name}`}
        description="新的一天，让好创意继续向前。这里是你的创作进度。"
      >
        <select value={project} onChange={(e) => P(e.target.value)}>
          <option value="all">全部项目</option>
          {base.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Link href="/tasks" className="btn primary">
          <Plus size={16} />
          管理交付任务
        </Link>
      </Heading>
      <div className="dashboard-banner">
        <div>
          <span className="pill">创作进行时</span>
          <h2>
            从一棵树，
            <br />
            到一个生长的世界。
          </h2>
          <p>聚焦森林场景交付，把每一次反馈变成更好的作品。</p>
          <Link href={base.user.role === "vendor" ? "/tasks" : "/assets"}>
            继续探索工作空间 <ArrowRight size={16} />
          </Link>
        </div>
        <img src="/art/asset-1.svg" alt="森林场景概念示意" />
        <span className="banner-caption">森林回响 · 场景概念作品</span>
      </div>
      <div className="stats-grid">
        {[
          [FolderKanban, "交付任务", tasks.length, "当前可见任务", "green"],
          [MessageSquare, "等待审阅", review.length, "让反馈更及时", "orange"],
          [
            RotateCcw,
            "待修改作品",
            change.length,
            "每次迭代都更进一步",
            "purple",
          ],
          [Box, "已入库资产", done.length, "让创作持续产生价值", "blue"],
        ].map(([I, t, n, h, c]) => (
          <div className="stat-card" key={t}>
            <span className={"stat-icon " + c}>
              <I size={20} />
            </span>
            <span>{t}</span>
            <strong>
              {n}
              <small>项</small>
            </strong>
            <p>{h}</p>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="section-heading">
            <h2>
              需要你的关注{" "}
              <span className="count">{review.length + change.length}</span>
            </h2>
            <Link href="/reviews">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          {tasks
            .filter((t) =>
              ["in_review", "changes_requested"].includes(t.status),
            )
            .slice(0, 4)
            .map((t) => (
              <Link
                className="attention-row"
                href={"/review/" + t.id}
                key={t.id}
              >
                <img src={t.preview || "/art/asset-1.svg"} alt="" />
                <div>
                  <h3>{t.title.split(" · ")[0]}</h3>
                  <p>
                    {t.project_name.split(" · ")[0]}
                    <span>·</span>V{t.version_count}
                  </p>
                </div>
                <Badge status={t.status} />
                <ArrowUpRight size={16} />
              </Link>
            ))}
          {!review.length && !change.length && (
            <Empty text="所有待办都处理好了" hint="可以去看看已沉淀的资产。" />
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>近期交付</h2>
            <Clock size={17} />
          </div>
          {tasks
            .filter((t) => t.status !== "approved")
            .sort((a, b) => a.due_date.localeCompare(b.due_date))
            .slice(0, 3)
            .map((t) => (
              <Link href={"/tasks/" + t.id} className="deadline-row" key={t.id}>
                <span className="date-box">
                  <small>{date(t.due_date).slice(5, 7)}月</small>
                  {date(t.due_date).slice(8)}
                </span>
                <div>
                  <h3>{t.title.split(" · ")[0]}</h3>
                  <p>{t.assignee_name}</p>
                </div>
                <span className={"priority " + t.priority}>
                  {t.priority === "high" ? "高优先级" : "普通"}
                </span>
              </Link>
            ))}
          <Link className="ai-callout" href="/assistant">
            <Sparkles size={22} />
            <div>
              <b>让 AI 帮你梳理工作</b>
              <p>总结审阅意见，找到下一步</p>
            </div>
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="section-heading spaced">
        <h2>项目空间</h2>
        <Link href="/tasks">
          进入项目 <ArrowRight size={14} />
        </Link>
      </div>
      <div className="project-grid">
        {base.projects.map((p, i) => {
          const all = base.tasks.filter((t) => t.project_id === p.id),
            n = all.filter((t) => t.status === "approved").length;
          return (
            <Link
              href={"/tasks?project=" + p.id}
              className="project-card"
              key={p.id}
            >
              <img
                src={"/art/asset-" + (i ? 6 : 1) + ".svg"}
                alt="项目概念示意"
              />
              <div>
                <span className="eyebrow">项目 {p.id}</span>
                <h3>{p.name.split(" · ")[0]}</h3>
                <p>{p.description}</p>
                <div className="progress">
                  <i
                    style={{
                      width: (all.length ? (n / all.length) * 100 : 0) + "%",
                    }}
                  />
                </div>
                <div className="project-meta">
                  <span>
                    {n} / {all.length} 项已验收
                  </span>
                  <ArrowUpRight size={17} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
function Tasks({ base, refresh, toast, review }) {
  const [status, S] = useState(review ? "in_review" : "all"),
    [search, Q] = useState(""),
    [project, P] = useState("all"),
    [modal, M] = useState(""),
    [archived, AR] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("project");
    if (p) P(p);
  }, []);
  let tasks = base.tasks
    .filter((t) => !!t.archived === archived)
    .filter(
      (t) =>
        (status === "all" || t.status === status) &&
        (project === "all" || t.project_id === +project) &&
        (t.title + t.project_name).toLowerCase().includes(search.toLowerCase()),
    );
  const elevated = ["admin", "lead"].includes(base.user.role);
  return (
    <>
      <Heading
        eyebrow={review ? "REVIEW & COLLABORATE" : "PROJECT DELIVERIES"}
        title={review ? "在线审阅" : "交付任务"}
        description={
          review
            ? "让反馈有位置、有版本，让每次修改都有依据。"
            : "让要求清楚，让交付有序。追踪每一份创作的进度。"
        }
      >
        {elevated && (
          <>
            <button className="btn" onClick={() => M("project")}>
              <Plus size={16} />
              新建项目
            </button>
            <button className="btn primary" onClick={() => M("task")}>
              <Plus size={16} />
              创建任务
            </button>
          </>
        )}
      </Heading>
      <div className="panel">
        <div className="tabs">
          {[["all", "全部任务"], ...Object.entries(states)].map(
            ([s, label]) => (
              <button
                key={s}
                className={s === status ? "selected" : ""}
                onClick={() => S(s)}
              >
                {label}
                <span>
                  {
                    base.tasks.filter((t) => s === "all" || t.status === s)
                      .length
                  }
                </span>
              </button>
            ),
          )}
        </div>
        <div className="toolbar">
          <label className="check-label">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => AR(e.target.checked)}
            />
            已归档任务
          </label>
          <div className="input-icon">
            <Search size={17} />
            <input
              placeholder="搜索任务名称或项目…"
              value={search}
              onChange={(e) => Q(e.target.value)}
            />
          </div>
          <select value={project} onChange={(e) => P(e.target.value)}>
            <option value="all">全部项目</option>
            {base.projects.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="muted">{tasks.length} 个任务</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>交付任务</th>
                <th>所属项目</th>
                <th>负责人</th>
                <th>截止日期</th>
                <th>当前状态</th>
                <th>版本</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link
                      className="table-asset"
                      href={(review ? "/review/" : "/tasks/") + t.id}
                    >
                      <img src={t.preview || "/art/asset-1.svg"} alt="" />
                      <div>
                        <b>{t.title.split(" · ")[0]}</b>
                        <small>
                          {t.category} · TASK-{String(t.id).padStart(3, "0")}
                        </small>
                      </div>
                    </Link>
                  </td>
                  <td>{t.project_name.split(" · ")[0]}</td>
                  <td>
                    <span className="inline-avatar">
                      <Avatar small name={t.assignee_name} />
                      {t.assignee_name}
                    </span>
                  </td>
                  <td>{date(t.due_date)}</td>
                  <td>
                    <Badge status={t.status} />
                  </td>
                  <td>V{t.version_count}</td>
                  <td>
                    <Link
                      className="text-link"
                      href={(review ? "/review/" : "/tasks/") + t.id}
                    >
                      {review ? "审阅" : "详情"}
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!tasks.length && (
          <Empty text="没有符合条件的任务" hint="尝试调整搜索或筛选条件。" />
        )}
      </div>
      {modal === "project" && (
        <Modal title="创建项目空间" onClose={() => M("")}>
          <Form
            onSubmit={async (d) => {
              await api("projects", d);
              await refresh();
              M("");
              toast("项目已创建");
            }}
          >
            <Field label="项目名称">
              <input
                name="name"
                required
                maxLength={150}
                placeholder="例如：遗落之境"
              />
            </Field>
            <Field label="项目说明">
              <textarea
                name="description"
                required
                placeholder="描述项目目标与美术方向"
              />
            </Field>
          </Form>
        </Modal>
      )}
      {modal === "task" && (
        <Modal title="创建交付任务" onClose={() => M("")}>
          <TaskForm
            base={base}
            onDone={async () => {
              await refresh();
              M("");
              toast("交付任务已创建");
            }}
          />
        </Modal>
      )}
    </>
  );
}
function TaskForm({ base, onDone }) {
  const [requirements, R] = useState(""),
    [title, T] = useState(""),
    [ai, A] = useState(false),
    [err, E] = useState("");
  return (
    <Form
      button="创建并分配任务"
      onSubmit={async (d) => {
        await api("tasks", { ...d, requireTexture: d.requireTexture === "on" });
        await onDone();
      }}
    >
      <div className="form-grid">
        <Field label="任务名称">
          <input
            required
            name="title"
            value={title}
            onChange={(e) => T(e.target.value)}
          />
        </Field>
        <Field label="所属项目">
          <select name="projectId" required>
            {base.projects
              .filter((p) => !p.archived)
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <div className="label-row">
        <b>制作要求与验收标准</b>
        <button
          type="button"
          className="text-link"
          disabled={ai || !title}
          onClick={async () => {
            A(true);
            E("");
            try {
              R(
                (await api("ai", { feature: "requirements", prompt: title }))
                  .text,
              );
            } catch (e) {
              E(e.message);
            } finally {
              A(false);
            }
          }}
        >
          <Sparkles size={14} />
          {ai ? "生成中…" : "AI 起草要求"}
        </button>
      </div>
      <textarea
        name="requirements"
        rows={6}
        value={requirements}
        onChange={(e) => R(e.target.value)}
        required
        placeholder="描述风格、规格和验收要求。AI 生成内容需要你确认。"
      />
      <ErrorBox error={err} />
      <div className="form-grid">
        <Field label="负责人">
          <select name="assigneeId" required>
            {base.people.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {roleNames[u.role]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="截止日期">
          <input
            name="dueDate"
            type="date"
            required
            defaultValue={new Date(Date.now() + 7 * 86400000)
              .toISOString()
              .slice(0, 10)}
          />
        </Field>
        <Field label="资产分类">
          <select name="category">
            {["场景", "角色", "道具", "材质", "特效"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="优先级">
          <select name="priority">
            <option value="normal">普通</option>
            <option value="high">高优先级</option>
          </select>
        </Field>
        <Field label="允许模型格式（逗号分隔）">
          <input name="formats" defaultValue="OBJ,FBX,GLB" required />
        </Field>
        <Field label="复用授权">
          <select name="license">
            <option value="all_projects">公司内部所有项目</option>
            <option value="source_only">仅限来源项目</option>
          </select>
        </Field>
      </div>
      <Field label="授权限制说明">
        <input
          name="licenseNote"
          defaultValue="仅限公司内部项目，不得对外分发或转售"
        />
      </Field>
      <label className="check-label">
        <input type="checkbox" name="requireTexture" defaultChecked />
        提交时必须包含贴图文件
      </label>
    </Form>
  );
}
function Task({ id, base, toast, refresh }) {
  const { data: t, error, reload } = useLoad("tasks/" + id);
  const [uploadError, E] = useState("");
  if (!t) return <ErrorBox error={error} />;
  const canSubmit =
      t.assignee_id === base.user.id || base.user.role === "admin",
    lead = ["admin", "lead"].includes(base.user.role);
  return (
    <>
      <div className="breadcrumb">
        <Link href="/tasks">交付任务</Link>
        <ChevronRight size={14} />
        <span>TASK-{String(id).padStart(3, "0")}</span>
      </div>
      <Heading
        eyebrow={t.project_name}
        title={t.title.split(" · ")[0]}
        description="明确交付要求，记录每一次创作迭代。"
      >
        <Badge status={t.status} />
        {lead && (
          <TaskActions
            task={t}
            people={base.people}
            onDone={async () => {
              await reload();
              await refresh();
              toast("任务已更新");
            }}
          />
        )}
        {lead && t.approved_version_id && (
          <AssetManage
            task={t}
            onDone={async () => {
              await reload();
              await refresh();
              toast("资产可见性已更新");
            }}
          />
        )}
        {t.versions.length > 0 && (
          <Link className="btn primary" href={"/review/" + id}>
            <Eye size={16} />
            进入在线审阅
          </Link>
        )}
      </Heading>
      <div className="detail-columns">
        <div>
          <section className="panel padded">
            <div className="section-heading">
              <h2>
                <FileText size={18} />
                制作要求
              </h2>
              <span className="pill neutral">{t.category}</span>
            </div>
            <div className="prose">{t.requirements}</div>
            <div className="spec-grid">
              <div>
                <small>文件格式</small>
                <b>{t.formats}</b>
              </div>
              <div>
                <small>贴图要求</small>
                <b>{t.require_texture ? "必须提交" : "按需提交"}</b>
              </div>
              <div>
                <small>复用授权</small>
                <b>
                  {t.license === "all_projects" ? "公司内部项目" : "仅来源项目"}
                </b>
              </div>
            </div>
            <p className="muted">{t.license_note}</p>
            <h3>参考资料</h3>
            <FileList
              files={t.files.filter((f) => f.kind === "reference")}
              onRemove={
                lead && !t.archived && !t.project_archived
                  ? async (file) => {
                      try {
                        await api("files/" + file.id, {}, "DELETE");
                        await reload();
                        toast("参考资料已移除");
                      } catch (e) {
                        E(e.message);
                      }
                    }
                  : undefined
              }
            />
            <ErrorBox error={uploadError} />
          </section>
          {canSubmit && (
            <DeliveryUpload
              task={t}
              onDone={async () => {
                await reload();
                await refresh();
                toast("新版本已提交审阅");
              }}
            />
          )}
          {lead && !t.archived && !t.project_archived && (
            <section className="panel padded">
              <h2>补充参考资料</h2>
              <label className="upload-zone">
                <FileImage />
                <span>上传参考图片或 PDF</span>
                <input
                  hidden
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("file", file);
                    fd.append("kind", "reference");
                    try {
                      await api("tasks/" + id + "/files", fd);
                      await reload();
                      toast("参考资料已添加");
                    } catch (e) {
                      E(e.message);
                    }
                  }}
                />
              </label>
              <ErrorBox error={uploadError} />
            </section>
          )}
        </div>
        <div>
          <section className="panel padded">
            <img
              className="task-cover"
              src={t.preview || "/art/asset-1.svg"}
              alt="资产概念示意"
            />
            <dl className="metadata">
              <dt>负责人</dt>
              <dd>{t.assignee_name}</dd>
              <dt>截止日期</dt>
              <dd>{date(t.due_date)}</dd>
              <dt>优先级</dt>
              <dd>{t.priority === "high" ? "高优先级" : "普通"}</dd>
              <dt>创建时间</dt>
              <dd>{date(t.created_at)}</dd>
            </dl>
          </section>
          <section className="panel padded">
            <h2>版本历史</h2>
            {t.versions.map((v) => (
              <div className="version-history" key={v.id}>
                <span className="version-dot" />
                <div>
                  <Link href={"/review/" + id + "?version=" + v.id}>
                    <b>V{v.number}</b> <Badge status={v.status} />
                  </Link>
                  <p>{v.notes}</p>
                  <small>
                    {v.author_name} · {date(v.created_at)}
                  </small>
                  <FileList
                    files={t.files.filter((f) => f.version_id === v.id)}
                  />
                </div>
              </div>
            ))}
            {!t.versions.length && <p className="muted">还没有提交记录</p>}
          </section>
        </div>
      </div>
    </>
  );
}
function FileList({ files, onRemove }) {
  return (
    <div className="file-list">
      {files.map((f) => (
        <div key={f.id} className="file-entry">
          <a href={"/api/files/" + f.id} className="file-row">
            <FileBox size={16} />
            <span>
              {f.name}
              <small>{sizes(f.size)}</small>
            </span>
            <Download size={15} />
          </a>
          {onRemove && (
            <button
              className="text-link"
              onClick={() => onRemove(f)}
              aria-label={"移除参考资料 " + f.name}
            >
              移除
            </button>
          )}
        </div>
      ))}
      {!files.length && <p className="muted">暂无文件</p>}
    </div>
  );
}
function Review({ id, base, toast }) {
  const { data: t, error, reload } = useLoad("tasks/" + id),
    [selected, S] = useState(null),
    [compare, C] = useState(false),
    [point, P] = useState(null),
    [angle, A] = useState(0),
    [zoom, Z] = useState(1),
    [body, B] = useState(""),
    [err, E] = useState(""),
    [summary, SUM] = useState(""),
    [busy, BUSY] = useState(false),
    [reject, R] = useState(false),
    [focus, FO] = useState(null),
    [reply, RP] = useState(null),
    [mode, MODE] = useState("image"),
    [anchor, ANCHOR] = useState(null),
    [decisionBusy, DB] = useState(false);
  useEffect(() => {
    B("");
    P(null);
    RP(null);
    ANCHOR(null);
  }, [selected]);
  useEffect(() => {
    if (t && !selected) {
      const id = Number(
        new URLSearchParams(window.location.search).get("version"),
      );
      S(t.versions.some((v) => v.id === id) ? id : t.versions[0]?.id);
    }
  }, [t]);
  if (!t) return <ErrorBox error={error} />;
  const version = t.versions.find((v) => v.id === selected);
  const comments = t.comments.filter((c) => c.version_id === selected),
    old = t.versions.find((v) => v.number === (version?.number || 1) - 1);
  const lead = ["admin", "lead"].includes(base.user.role),
    canReview =
      lead &&
      !t.archived &&
      !t.project_archived &&
      version?.id === t.versions[0]?.id &&
      t.status === "in_review";
  const preview = (v) => {
    const img = t.files.find(
      (f) => f.version_id === v?.id && f.kind === "preview",
    );
    return img ? "/api/files/" + img.id + "?inline=1" : t.preview;
  };
  const approve = async (decision) => {
    if (decisionBusy) return;
    DB(true);
    try {
      E("");
      await api("tasks/" + id + "/review", {
        versionId: selected,
        decision,
        reason: body,
      });
      await reload();
      R(false);
      B("");
      toast(
        decision === "approved"
          ? "验收通过，资产已进入正式库"
          : "已发送修改要求",
      );
    } catch (e) {
      E(e.message);
    } finally {
      DB(false);
    }
  };
  return (
    <>
      <div className="breadcrumb">
        <Link href="/reviews">在线审阅</Link>
        <ChevronRight size={14} />
        <Link href={"/tasks/" + id}>{t.title}</Link>
      </div>
      <Heading
        eyebrow="REVIEW STUDIO"
        title={t.title.split(" · ")[0]}
        description={t.project_name}
      >
        <select
          aria-label="预览模式"
          value={mode}
          onChange={(e) => {
            MODE(e.target.value);
            P(null);
            ANCHOR(null);
          }}
        >
          <option value="image">图片预览</option>
          <option value="3d">三维模型</option>
        </select>
        <button
          className={"btn " + (compare ? "active-btn" : "")}
          disabled={!old}
          onClick={() => C(!compare)}
        >
          <GitCompare size={16} />
          {compare ? "退出对比" : "版本对比"}
        </button>
        <Badge status={t.status} />
      </Heading>
      {!version ? (
        <Empty text="尚未提交作品" hint="提交模型文件后即可开始审阅。" />
      ) : (
        <>
          <div className="review-layout">
            <aside className="review-files">
              <h3>文件与版本</h3>
              <select
                value={selected || ""}
                onChange={(e) => {
                  S(+e.target.value);
                  P(null);
                  FO(null);
                  C(false);
                  A(0);
                  Z(1);
                }}
              >
                {t.versions.map((v) => (
                  <option value={v.id} key={v.id}>
                    V{v.number} · {states[v.status]}
                  </option>
                ))}
              </select>
              <div className="version-note">
                <b>V{version.number} 提交说明</b>
                <p>{version.notes}</p>
                <small>
                  {version.author_name}
                  <br />
                  {date(version.created_at)}
                </small>
              </div>
              <h4>交付文件</h4>
              <FileList
                files={t.files.filter((f) => f.version_id === selected)}
              />
              <div className="preview-hint">
                <Eye size={16} />
                <span>
                  图片 / 三维模型
                  <br />
                  支持 OBJ、GLB、GLTF、FBX
                </span>
              </div>
            </aside>
            <div className="viewer-column">
              {mode === "3d" ? (
                compare && old ? (
                  <div className="model-compare">
                    <div>
                      <b>V{old.number} · 上一版</b>
                      <ModelViewer
                        key={old.id}
                        files={t.files.filter((f) => f.version_id === old.id)}
                        readOnly
                      />
                    </div>
                    <div>
                      <b>V{version.number} · 当前版</b>
                      <ModelViewer
                        key={version.id}
                        files={t.files.filter(
                          (f) => f.version_id === version.id,
                        )}
                        focus={comments.find((c) => c.id === focus)}
                        onPoint={(a) => {
                          ANCHOR(a);
                          RP(null);
                          P(null);
                        }}
                        readOnly={!!t.archived || !!t.project_archived}
                      />
                    </div>
                  </div>
                ) : (
                  <ModelViewer
                    key={version.id}
                    files={t.files.filter((f) => f.version_id === version.id)}
                    focus={comments.find((c) => c.id === focus)}
                    onPoint={(a) => {
                      ANCHOR(a);
                      RP(null);
                      P(null);
                    }}
                    readOnly={!!t.archived || !!t.project_archived}
                  />
                )
              ) : (
                <>
                  <div
                    className={"viewer " + (compare ? "compare" : "")}
                    onClick={(e) => {
                      if (compare) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      P({
                        x: (e.clientX - r.left) / r.width,
                        y: (e.clientY - r.top) / r.height,
                      });
                      RP(null);
                    }}
                  >
                    {compare && old && (
                      <div className="compare-half">
                        <span>V{old.number} · 上一版</span>
                        {preview(old) ? (
                          <img src={preview(old)} alt="上一版本预览图" />
                        ) : (
                          <p>此版本没有预览图</p>
                        )}
                      </div>
                    )}
                    <div className={compare ? "compare-half" : ""}>
                      {compare && <span>V{version.number} · 当前版</span>}
                      {preview(version) ? (
                        <img
                          className="preview-image"
                          src={preview(version)}
                          alt="当前版本预览图"
                          style={{
                            transform: `scale(${zoom}) rotate(${angle}deg)`,
                          }}
                        />
                      ) : (
                        <div className="preview-fallback">
                          <FileBox size={48} />
                          <h3>当前模型无法预览</h3>
                          <p>可下载文件检查，或在新版本中补交预览图。</p>
                        </div>
                      )}
                    </div>
                    {!compare && (
                      <>
                        <div className="viewer-tag">
                          <span className="online-dot" />V{version.number} ·
                          图片预览
                        </div>
                        <span className="viewer-instruction">
                          <Target size={14} />
                          点击画面添加位置标注
                        </span>
                        {comments
                          .filter((c) => c.x != null && !c.parent_id)
                          .map((c, i) => (
                            <button
                              key={c.id}
                              className={
                                "pin " +
                                (c.resolved ? "resolved" : "") +
                                (focus === c.id ? " focused" : "")
                              }
                              style={{
                                left: c.x * 100 + "%",
                                top: c.y * 100 + "%",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                FO(c.id);
                                A(c.view_angle);
                                Z(c.zoom);
                              }}
                            >
                              {i + 1}
                            </button>
                          ))}
                        {point && (
                          <span
                            className="pin new-pin"
                            style={{
                              left: point.x * 100 + "%",
                              top: point.y * 100 + "%",
                            }}
                          >
                            +
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="viewer-controls">
                    <span>图片视角模拟</span>
                    <button
                      className="iconbtn"
                      title="旋转预览图"
                      onClick={() => {
                        A(angle + 15);
                        P(null);
                      }}
                    >
                      <RotateCcw size={17} />
                    </button>
                    <button
                      className="iconbtn"
                      title="缩小"
                      onClick={() => Z(Math.max(0.5, zoom - 0.1))}
                    >
                      <ZoomOut size={17} />
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button
                      className="iconbtn"
                      title="放大"
                      onClick={() => Z(Math.min(3, zoom + 0.1))}
                    >
                      <ZoomIn size={17} />
                    </button>
                    <button
                      className="text-link"
                      onClick={() => {
                        Z(1);
                        A(0);
                        P(null);
                      }}
                    >
                      重置视角
                    </button>
                  </div>
                </>
              )}
              {compare && old && (
                <div className="compare-notes">
                  <div>
                    <b>V{old.number}</b>
                    <p>{old.notes}</p>
                    <small>
                      {
                        t.comments.filter(
                          (c) =>
                            c.version_id === old.id &&
                            !c.resolved &&
                            !c.parent_id,
                        ).length
                      }{" "}
                      条未解决意见
                    </small>
                    <button
                      className="text-link"
                      onClick={() => {
                        S(old.id);
                        C(false);
                      }}
                    >
                      查看该版本意见
                    </button>
                  </div>
                  <div>
                    <b>V{version.number}</b>
                    <p>{version.notes}</p>
                  </div>
                </div>
              )}
              <div className="review-actions">
                <span>
                  {comments.filter((c) => !c.resolved && !c.parent_id).length}{" "}
                  条意见待处理
                </span>
                {canReview && (
                  <>
                    <button
                      className="btn"
                      onClick={() => {
                        R(true);
                        B("");
                      }}
                    >
                      <RotateCcw size={15} />
                      请求修改
                    </button>
                    <button
                      className="btn primary"
                      disabled={decisionBusy}
                      onClick={() => approve("approved")}
                    >
                      <Check size={16} />
                      审阅通过
                    </button>
                  </>
                )}
              </div>
            </div>
            <aside className="comments-panel">
              <div className="section-heading">
                <h3>
                  审阅意见{" "}
                  <span className="count">
                    {comments.filter((c) => !c.parent_id).length}
                  </span>
                </h3>
                <button
                  className="iconbtn"
                  title="AI 总结审阅"
                  disabled={busy}
                  onClick={async () => {
                    BUSY(true);
                    E("");
                    try {
                      SUM(
                        (await api("ai", { feature: "summary", taskId: id }))
                          .text,
                      );
                    } catch (e) {
                      E(e.message);
                    } finally {
                      BUSY(false);
                    }
                  }}
                >
                  <Sparkles size={18} />
                </button>
              </div>
              <div className="comment-list">
                {comments
                  .filter((c) => !c.parent_id)
                  .map((c, i) => (
                    <div
                      key={c.id}
                      className={"comment " + (focus === c.id ? "focused" : "")}
                      onClick={() => {
                        FO(c.id);
                        if (c.anchor) MODE("3d");
                        else if (c.x != null) MODE("image");
                        if (c.x != null) {
                          A(c.view_angle);
                          Z(c.zoom);
                        }
                      }}
                    >
                      <div className="comment-header">
                        <Avatar name={c.author_name} small />
                        <b>{c.author_name}</b>
                        {c.x != null && (
                          <span className="comment-index">#{i + 1}</span>
                        )}
                      </div>
                      <p>{c.body}</p>
                      <div className="comment-meta">
                        <small>{date(c.created_at)}</small>
                        <span>{c.resolved ? "已解决" : "待处理"}</span>
                      </div>
                      {comments
                        .filter((r) => r.parent_id === c.id)
                        .map((r) => (
                          <div className="reply" key={r.id}>
                            <b>{r.author_name}</b>
                            <p>{r.body}</p>
                          </div>
                        ))}
                      <div className="comment-buttons">
                        {c.author_id === base.user.id &&
                          version.status !== "approved" &&
                          !t.archived && (
                            <CommentEdit comment={c} onDone={reload} />
                          )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            RP(c.id);
                            P(null);
                            ANCHOR(null);
                          }}
                        >
                          回复
                        </button>
                        {lead &&
                          version.status !== "approved" &&
                          !t.archived &&
                          !t.project_archived && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await api(
                                    "comments/" + c.id,
                                    { resolved: !c.resolved },
                                    "PATCH",
                                  );
                                  await reload();
                                } catch (e) {
                                  E(e.message);
                                }
                              }}
                            >
                              {c.resolved ? "重新打开" : "标记解决"}
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                {!comments.length && (
                  <p className="muted">暂无评论。点击预览图添加位置标注。</p>
                )}
              </div>
              <form
                className="comment-compose"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    E("");
                    await api("comments", {
                      versionId: selected,
                      body,
                      ...point,
                      angle,
                      zoom,
                      parentId: reply,
                      anchor,
                    });
                    B("");
                    P(null);
                    RP(null);
                    ANCHOR(null);
                    await reload();
                  } catch (e) {
                    E(e.message);
                  }
                }}
              >
                <small>
                  {reply
                    ? "正在回复评论 #" + reply
                    : anchor
                      ? "已选择三维模型位置"
                      : point
                        ? "已选择画面位置"
                        : "添加一般审阅意见"}
                  {(point || reply || anchor) && (
                    <button
                      type="button"
                      onClick={() => {
                        P(null);
                        RP(null);
                        ANCHOR(null);
                      }}
                    >
                      取消
                    </button>
                  )}
                </small>
                <textarea
                  placeholder="写下具体的修改意见…"
                  value={body}
                  onChange={(e) => B(e.target.value)}
                  required
                />
                <button
                  className="btn primary"
                  type="submit"
                  disabled={!!t.archived || !!t.project_archived}
                >
                  <Send size={14} />
                  发送意见
                </button>
              </form>
            </aside>
          </div>
          <ErrorBox error={err} />
          {busy && <p className="muted">AI 正在梳理审阅记录…</p>}
          {summary && <AIOutput value={summary} />}
        </>
      )}
      {reject && (
        <Modal title="请求修改" onClose={() => R(false)}>
          <p className="muted">修改要求将发送给负责美术，并记录到当前版本。</p>
          <textarea
            rows={5}
            value={body}
            onChange={(e) => B(e.target.value)}
            placeholder="请描述需要调整的内容"
          />
          <ErrorBox error={err} />
          <div className="form-actions">
            <button
              className="btn primary"
              disabled={decisionBusy}
              onClick={() => approve("changes_requested")}
            >
              发送修改要求
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Assets({ base, toast, favorites, refresh }) {
  const { data: all, error } = useLoad("assets"),
    [search, S] = useState(""),
    [category, C] = useState("全部"),
    [project, P] = useState("all"),
    [ai, AI] = useState(null),
    [busy, B] = useState(false),
    [err, E] = useState(""),
    [layout, L] = useState("grid");
  const list = (ai || all || []).filter(
    (t) =>
      (!favorites || base.favorites.includes(t.id)) &&
      (category === "全部" || t.category === category) &&
      (project === "all" || t.project_id === +project) &&
      (ai ||
        !search ||
        (t.title + t.tags + t.project_name)
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  return (
    <>
      <Heading
        eyebrow="YOUR CREATIVE LIBRARY"
        title={favorites ? "我的收藏" : "正式资产库"}
        description="每一份经过验收的创作，都能成为下一个世界的起点。"
      >
        <span className="library-count">
          <Box size={17} />
          {all?.length || 0} 份已验收资产
        </span>
      </Heading>
      <div className="asset-search">
        <Sparkles size={23} />
        <input
          placeholder="试试搜索「适合森林场景的枯树」…"
          value={search}
          onChange={(e) => {
            S(e.target.value);
            AI(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <button
          className="btn primary"
          disabled={busy || !search}
          onClick={async () => {
            B(true);
            E("");
            try {
              AI(
                (await api("ai", { feature: "search", prompt: search })).assets,
              );
            } catch (e) {
              E(e.message);
            } finally {
              B(false);
            }
          }}
        >
          {busy ? "正在寻找…" : "AI 语义搜索"}
          <ArrowRight size={16} />
        </button>
      </div>
      <ErrorBox error={err || error} />
      <div className="asset-toolbar">
        <div className="category-tabs">
          {["全部", "场景", "角色", "道具", "材质", "特效"].map((x) => (
            <button
              className={category === x ? "selected" : ""}
              key={x}
              onClick={() => C(x)}
            >
              {x}
            </button>
          ))}
        </div>
        <div>
          <select value={project} onChange={(e) => P(e.target.value)}>
            <option value="all">全部项目</option>
            {base.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            className={"iconbtn " + (layout === "grid" ? "active-btn" : "")}
            onClick={() => L("grid")}
            title="网格视图"
          >
            <Grid2X2 size={18} />
          </button>
          <button
            className={"iconbtn " + (layout === "list" ? "active-btn" : "")}
            onClick={() => L("list")}
            title="列表视图"
          >
            <List size={18} />
          </button>
        </div>
      </div>
      <div className="results-row">
        <span>
          {ai ? "AI 匹配结果" : "所有资产"} <b>{list.length}</b>
        </span>
        <span>已验收版本 · 最近更新优先</span>
        {ai && (
          <button
            className="text-link"
            onClick={() => {
              AI(null);
              S("");
            }}
          >
            清除 AI 搜索
          </button>
        )}
      </div>
      <div className={"asset-grid " + (layout === "list" ? "asset-list" : "")}>
        {list.map((t) => (
          <article className="asset-card" key={t.id}>
            <Link href={"/assets/" + t.id} className="asset-preview">
              <img src={t.preview || "/art/asset-1.svg"} alt={t.title} />
              <span className="asset-format">{t.formats.split(",")[0]}</span>
              <span className="asset-version">V{t.version_number}</span>
            </Link>
            <button
              className={
                "favorite " + (base.favorites.includes(t.id) ? "saved" : "")
              }
              title={base.favorites.includes(t.id) ? "取消收藏" : "收藏资产"}
              onClick={async () => {
                try {
                  await api("assets/" + t.id + "/favorite", {
                    saved: !base.favorites.includes(t.id),
                  });
                  await refresh();
                } catch (e) {
                  toast(e.message);
                }
              }}
            >
              <Star size={16} />
            </button>
            <Link className="asset-info" href={"/assets/" + t.id}>
              <div className="asset-title">
                <h3>{t.title.split(" · ")[0]}</h3>
                <CheckCircle2 size={15} />
              </div>
              <p>{t.title.split(" · ")[1] || t.category}</p>
              <div className="tags">
                {(t.tags || t.category)
                  .split(/[，,]/)
                  .slice(0, 3)
                  .map((x, i) => (
                    <span key={i}>{x}</span>
                  ))}
              </div>
              <div className="asset-meta">
                <span>
                  <FolderKanban size={12} />
                  {t.project_name.split(" · ")[0]}
                </span>
                <span>
                  {t.license === "source_only" ? (
                    <Lock size={12} />
                  ) : (
                    <ArrowUpRight size={13} />
                  )}
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>
      {all && !list.length && (
        <Empty
          text="暂时没有匹配的资产"
          hint="尝试更换关键词或分类。只有验收通过的资产会出现在这里。"
        />
      )}
    </>
  );
}
function Asset({ id, base, toast, refresh }) {
  const { data: t, error, reload } = useLoad("assets/" + id),
    [modal, M] = useState(false),
    [tags, T] = useState(""),
    [busy, B] = useState(false),
    [err, E] = useState(""),
    [show3D, S3] = useState(false);
  if (!t) return <ErrorBox error={error} />;
  const preview = t.files.find((f) => f.kind === "preview");
  return (
    <>
      <div className="breadcrumb">
        <Link href="/assets">正式资产库</Link>
        <ChevronRight size={14} />
        <span>{t.title.split(" · ")[0]}</span>
      </div>
      <Heading
        eyebrow="ASSET DETAILS"
        title={t.title.split(" · ")[0]}
        description={t.title.split(" · ")[1]}
      >
        <button
          className="btn"
          onClick={async () => {
            try {
              await api("assets/" + id + "/favorite", {
                saved: !base.favorites.includes(+id),
              });
              await refresh();
              toast("收藏已更新");
            } catch (e) {
              E(e.message);
            }
          }}
        >
          <Star size={16} />
          {base.favorites.includes(+id) ? "已收藏" : "收藏资产"}
        </button>
        <button className="btn primary" onClick={() => M(true)}>
          <Plus size={16} />
          加入项目
        </button>
      </Heading>
      <div className="detail-columns">
        <div>
          <div className="module-actions">
            <button className="btn" onClick={() => S3(!show3D)}>
              {show3D ? "查看预览图" : "查看三维模型"}
            </button>
          </div>
          {show3D ? (
            <ModelViewer files={t.files} readOnly />
          ) : (
            <div className="asset-detail-preview">
              <img
                src={
                  preview
                    ? "/api/files/" + preview.id + "?inline=1"
                    : t.preview || "/art/asset-1.svg"
                }
                alt="资产预览图"
              />
              <span className="viewer-tag">
                V{t.version.number} · 已验收预览
              </span>
              <span className="preview-disclaimer">
                图片预览 / 非真实 3D 模型解析
              </span>
            </div>
          )}
          <section className="panel padded">
            <h2>资产说明</h2>
            <div className="prose">{t.requirements}</div>
            <h3>版本说明 · V{t.version.number}</h3>
            <p>{t.version.notes}</p>
            <div className="section-heading">
              <h3>检索标签</h3>
              {["admin", "lead"].includes(base.user.role) && (
                <button className="text-link" onClick={() => T(t.tags || " ")}>
                  手工编辑
                </button>
              )}
              {["admin", "lead"].includes(base.user.role) && (
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={async () => {
                    B(true);
                    E("");
                    try {
                      T(
                        (await api("ai", { feature: "tags", taskId: id })).text,
                      );
                    } catch (e) {
                      E(e.message);
                    } finally {
                      B(false);
                    }
                  }}
                >
                  <Sparkles size={15} />
                  {busy ? "生成中…" : "AI 建议标签"}
                </button>
              )}
            </div>
            <div className="tags">
              {(t.tags || "待补充").split(/[，,]/).map((x, i) => (
                <span key={i}>{x}</span>
              ))}
            </div>
            {tags && (
              <div className="ai-output">
                <p>基于文字元数据的建议，请确认后保存。</p>
                <textarea value={tags} onChange={(e) => T(e.target.value)} />
                <button
                  className="btn primary"
                  onClick={async () => {
                    try {
                      await api("assets/" + id + "/tags", { tags }, "PATCH");
                      T("");
                      await reload();
                      toast("标签已保存");
                    } catch (e) {
                      E(e.message);
                    }
                  }}
                >
                  确认保存标签
                </button>
              </div>
            )}
            <ErrorBox error={err} />
          </section>
        </div>
        <div>
          <section className="panel padded">
            <h2>
              <Shield size={18} />
              来源与使用授权
            </h2>
            <dl className="metadata">
              <dt>来源项目</dt>
              <dd>{t.project_name.split(" · ")[0]}</dd>
              <dt>制作团队</dt>
              <dd>{t.assignee_name}</dd>
              <dt>当前版本</dt>
              <dd>V{t.version.number} · 已验收</dd>
              <dt>分类</dt>
              <dd>{t.category}</dd>
            </dl>
            <div className="license-box">
              <Lock size={17} />
              <div>
                <b>
                  {t.license === "source_only"
                    ? "仅限来源项目使用"
                    : "可在公司内部项目使用"}
                </b>
                <p>{t.license_note}</p>
              </div>
            </div>
            <button className="btn primary full" onClick={() => M(true)}>
              <Plus size={16} />
              加入项目
            </button>
          </section>
          <section className="panel padded">
            <h2>下载交付文件</h2>
            <FileList files={t.files} />
          </section>
          <section className="panel padded">
            <h2>使用记录</h2>
            {t.usage.map((r) => (
              <div className="simple-row" key={r.id}>
                <span>{r.project_name}</span>
                <b>V{r.version_number}</b>
              </div>
            ))}
            {!t.usage.length && <p className="muted">暂无你可见的复用记录</p>}
          </section>
        </div>
      </div>
      {modal && (
        <Modal title="将资产加入项目" onClose={() => M(false)}>
          <div className="license-box">
            <Shield size={20} />
            <div>
              <b>
                {t.license === "source_only"
                  ? "仅限来源项目使用"
                  : "公司内部项目授权"}
              </b>
              <p>{t.license_note}</p>
              <p>
                本次引用固定为 V{t.version.number}
                。后续新版本发布时，会通知你选择是否升级。
              </p>
            </div>
          </div>
          <Form
            button="确认授权并加入"
            onSubmit={async (d) => {
              await api("assets/" + id + "/reuse", {
                projectId: d.projectId,
                accepted: d.accepted === "on",
              });
              M(false);
              await reload();
              await refresh();
              toast("资产已加入项目，版本已固定");
            }}
          >
            <Field label="目标项目">
              <select name="projectId">
                {base.projects.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={
                      t.license === "source_only" && p.id !== t.project_id
                    }
                  >
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="check-label">
              <input name="accepted" required type="checkbox" />
              我已阅读并确认上述授权范围与限制
            </label>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Assistant() {
  const { data: history, reload } = useLoad("ai/history"),
    [prompt, P] = useState(""),
    [busy, B] = useState(false),
    [error, E] = useState(""),
    [answer, A] = useState(null);
  const ask = async (value) => {
    B(true);
    E("");
    try {
      const r = await api("ai", { feature: "assistant", prompt: value });
      A({ q: value, ...r });
      P("");
      await reload();
    } catch (e) {
      E(e.message);
    } finally {
      B(false);
    }
  };
  return (
    <>
      <Heading
        eyebrow="YOUR AI COPILOT"
        title="AI 创作助手"
        description="梳理交付要求，整理审阅思路，把时间留给创作。"
      />
      <div className="assistant-layout">
        <section className="assistant-main">
          <div className="assistant-intro">
            <span className="ai-orb">
              <Sparkles size={31} />
            </span>
            <h2>今天，我们一起创造什么？</h2>
            <p>
              我可以基于你有权访问的任务提供建议。审批与保存操作仍由你确认。
            </p>
            <div className="suggestions">
              {[
                "帮我梳理待处理的交付任务",
                "给我一份森林场景美术验收清单",
                "如何写清楚模型的修改意见？",
              ].map((x) => (
                <button disabled={busy} key={x} onClick={() => ask(x)}>
                  <MessageSquare size={16} />
                  {x}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
          </div>
          {answer && (
            <div className="assistant-answer">
              <div className="question-bubble">{answer.q}</div>
              <AIOutput value={answer.text} />
              <small className="muted">
                {answer.model} · {answer.tokens} tokens
              </small>
            </div>
          )}
          {busy && (
            <div className="thinking">
              <Sparkles className="spin" size={18} />
              正在结合任务信息思考…
            </div>
          )}
          <ErrorBox error={error} />
          <form
            className="assistant-input"
            onSubmit={(e) => {
              e.preventDefault();
              ask(prompt);
            }}
          >
            <textarea
              rows={2}
              required
              value={prompt}
              onChange={(e) => P(e.target.value)}
              placeholder="描述你的任务或问题…"
            />
            <button className="btn primary" disabled={busy || !prompt.trim()}>
              <ArrowRight size={20} />
            </button>
          </form>
          <p className="ai-disclaimer">
            AI 可能出错，请核验关键规格。不会自动验收作品，也不会修改资产。
          </p>
        </section>
        <aside className="panel padded assistant-history">
          <h3>最近使用</h3>
          {(history || []).map((h) => (
            <button
              key={h.id}
              className="history-item"
              onClick={() =>
                A({ q: h.input_text, text: h.output_text, model: h.model })
              }
            >
              <span>
                {{
                  assistant: "创作助手",
                  tags: "标签建议",
                  summary: "审阅总结",
                  requirements: "制作要求",
                  search: "语义检索",
                  connectivity: "连接测试",
                }[h.feature] || h.feature}
              </span>
              <p>{h.input_text.slice(0, 65)}</p>
              <small>
                {date(h.created_at)} ·{" "}
                {h.status === "success" ? "已完成" : "失败"}
              </small>
            </button>
          ))}
          {history?.length === 0 && (
            <p className="muted">开始对话后，记录将保存在这里。</p>
          )}
        </aside>
      </div>
    </>
  );
}
function MobileNavigation({ path, internal, unread, close }) {
  const items = [
    [
      "工作台",
      "/workspace",
      LayoutDashboard,
      path === "/workspace" || path === "/projects",
    ],
    ["任务", "/tasks", FolderKanban, path.startsWith("/tasks")],
    internal
      ? [
          "资产",
          "/assets",
          Box,
          path.startsWith("/assets") || path === "/account/favorites",
        ]
      : ["审阅", "/reviews", MessageSquare, path.startsWith("/review")],
    ["AI 助手", "/assistant", Sparkles, path.startsWith("/assistant")],
    [
      "我的",
      "/account",
      User,
      (path.startsWith("/account") && path !== "/account/favorites") ||
        path.startsWith("/admin"),
    ],
  ];
  return (
    <nav className="mobile-bottom-nav" aria-label="移动端核心导航">
      {items.map(([label, href, Icon, active]) => (
        <Link
          key={href}
          href={href}
          onClick={close}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={active ? "active" : ""}
        >
          <span className="mobile-nav-icon">
            <Icon size={21} />
            {href === "/account" && unread > 0 && (
              <i aria-label={`${unread} 条未读通知`} />
            )}
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
function AccountDirectory({ base }) {
  const internal = base.user.role !== "vendor";
  const groups = [
    [
      "项目与交付",
      [
        ["项目工作台", "/workspace", LayoutDashboard, "项目动态与待办"],
        ["交付任务", "/tasks", FolderKanban, "提交文件与跟踪进度"],
        ["在线审阅", "/reviews", MessageSquare, "预览、批注与版本对比"],
        ...(internal
          ? [["项目管理", "/projects", Users, "项目资料与协作成员"]]
          : []),
        ["我的交付", "/account/submissions", Upload, "分配给我的交付任务"],
      ],
    ],
    ...(internal
      ? [
          [
            "资产管理",
            [
              ["正式资产库", "/assets", Box, "搜索、下载与复用资产"],
              ["我的收藏", "/account/favorites", Star, "收藏的创作资源"],
              ["复用记录", "/account/reuses", GitCompare, "项目引用与版本升级"],
            ],
          ],
        ]
      : []),
    [
      "AI 创作",
      [
        ["AI 创作助手", "/assistant", Sparkles, "创作咨询与多轮对话"],
        [
          "AI 调用历史",
          "/assistant/history",
          Activity,
          "查看生成结果与调用记录",
        ],
      ],
    ],
    [
      "账号与消息",
      [
        [
          "消息通知",
          "/account/notifications",
          Bell,
          base.unreadCount
            ? `${base.unreadCount} 条未读通知`
            : "交付、审阅与项目消息",
        ],
        ["个人资料", "/account/profile", User, "姓名、工作室与个人简介"],
        ["账号安全", "/account/security", Lock, "修改登录密码"],
      ],
    ],
    ...(base.user.role === "admin"
      ? [
          [
            "管理员工具",
            [
              ["平台概览", "/admin", LayoutDashboard, "平台数据与运行情况"],
              ["用户与权限", "/admin/users", Shield, "成员账号与角色管理"],
              [
                "后台项目管理",
                "/admin/projects",
                FolderKanban,
                "项目与成员配置",
              ],
              [
                "AI 模型配置",
                "/admin/models",
                Settings,
                "模型接入、启用与测试",
              ],
              ["AI 使用记录", "/admin/usage", Activity, "平台调用与用量记录"],
              ["操作日志", "/admin/audit", FileText, "查询管理操作记录"],
            ],
          ],
        ]
      : []),
  ];
  return (
    <div className="account-directory">
      <div className="directory-heading">
        <h2>全部功能</h2>
        <p>按当前账号权限展示，点击即可进入。</p>
      </div>
      {groups.map(([title, entries]) => (
        <section className="function-group" key={title}>
          <h3>{title}</h3>
          <div className="function-grid">
            {entries.map(([label, href, Icon, description]) => (
              <Link className="function-entry" key={href} href={href}>
                <span className="function-icon">
                  <Icon size={21} />
                </span>
                <span>
                  <b>{label}</b>
                  <small>{description}</small>
                </span>
                <ChevronRight size={15} />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
function Account({ base, refresh, toast, path }) {
  const router = useRouter();
  const tab = path.split("/")[2] || "overview";
  const [error, E] = useState("");
  return (
    <>
      <Heading
        eyebrow="YOUR PERSONAL SPACE"
        title="用户中心"
        description="项目、资产、AI 与账号服务，所有入口都在这里。"
      >
        <button
          className="btn"
          onClick={async () => {
            await api("auth/logout", {});
            window.location.href = "/login";
          }}
        >
          <LogOut size={16} />
          退出登录
        </button>
      </Heading>
      <div className="account-banner">
        <Avatar name={base.user.name} />
        <div>
          <h2>{base.user.name}</h2>
          <p>{base.user.email}</p>
        </div>
        <span className="pill neutral">{roleNames[base.user.role]}</span>
      </div>
      <div className="panel">
        <div className="tabs">
          {[
            ["overview", "全部功能"],
            ["profile", "个人资料"],
            ["security", "账号安全"],
            ["notifications", "消息通知"],
            ["submissions", "我的交付"],
            ...(base.user.role === "vendor" ? [] : [["reuses", "复用记录"]]),
          ].map(([key, label]) => (
            <button
              className={tab === key ? "selected" : ""}
              onClick={() =>
                router.push(key === "overview" ? "/account" : "/account/" + key)
              }
              key={key}
            >
              {label}
              {key === "notifications" && <span>{base.unreadCount}</span>}
            </button>
          ))}
        </div>
        <div className="padded">
          <ErrorBox error={error} />
          {tab === "overview" && <AccountDirectory base={base} />}
          {tab === "security" && (
            <div className="account-form">
              <Form
                button="更新密码"
                onSubmit={async (d) => {
                  await api(
                    "me",
                    { ...d, name: base.user.name, bio: base.user.bio },
                    "PATCH",
                  );
                  toast("密码已更新");
                }}
              >
                <Field label="当前密码">
                  <input
                    name="oldPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <Field label="新密码（至少 10 位）">
                  <input
                    name="password"
                    type="password"
                    minLength={10}
                    autoComplete="new-password"
                    required
                  />
                </Field>
              </Form>
            </div>
          )}
          {tab === "profile" && (
            <div className="account-form">
              <Form
                button="保存个人资料"
                onSubmit={async (d) => {
                  await api("me", d, "PATCH");
                  await refresh();
                  toast("个人资料已保存");
                }}
              >
                <Field label="姓名 / 工作室名称">
                  <input name="name" defaultValue={base.user.name} required />
                </Field>
                <Field label="邮箱（由管理员管理）">
                  <input disabled value={base.user.email} readOnly />
                </Field>
                <Field label="个人简介">
                  <textarea name="bio" defaultValue={base.user.bio} />
                </Field>
              </Form>
            </div>
          )}
          {tab === "notifications" && <NotificationsPanel refresh={refresh} />}
          {tab === "submissions" && (
            <>
              {base.tasks
                .filter((t) => t.assignee_id === base.user.id)
                .map((t) => (
                  <Link
                    className="notification-row"
                    key={t.id}
                    href={"/tasks/" + t.id}
                  >
                    <FileBox size={20} />
                    <div>
                      <b>{t.title}</b>
                      <small>
                        V{t.version_count} · {t.project_name}
                      </small>
                    </div>
                    <Badge status={t.status} />
                  </Link>
                ))}
              {!base.tasks.some((t) => t.assignee_id === base.user.id) && (
                <Empty text="暂未分配交付任务" />
              )}
            </>
          )}
          {tab === "reuses" && (
            <>
              <div className="info">
                <GitCompare size={18} />
                新版本不会自动覆盖正在使用的版本。请在检查后确认升级。
              </div>
              {base.reuses.map((r) => (
                <div className="reuse-row" key={r.id}>
                  <ReuseRemove id={r.id} onDone={refresh} />
                  <Box size={22} />
                  <div>
                    <Link href={"/assets/" + r.task_id}>
                      <b>{r.title}</b>
                    </Link>
                    <p>
                      {r.project_name} · 当前 V{r.version_number}
                    </p>
                  </div>
                  {r.version_id !== r.approved_version_id ? (
                    <button
                      className="btn primary"
                      onClick={async () => {
                        try {
                          await api("reuses/" + r.id, {}, "PATCH");
                          await refresh();
                          toast("已确认升级到新版本");
                        } catch (e) {
                          E(e.message);
                        }
                      }}
                    >
                      升级至 V{r.latest_number}
                    </button>
                  ) : (
                    <span className="badge approved">最新版本</span>
                  )}
                </div>
              ))}
              {!base.reuses.length && (
                <Empty
                  text="暂无复用记录"
                  hint="从正式资产库中选择资产加入项目。"
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
function Admin({ base, refresh, toast, path }) {
  const router = useRouter();
  const tab = path.split("/")[2] || "overview";
  const { data: d, error, reload } = useLoad("admin/overview"),
    [modal, M] = useState(""),
    [model, MODEL] = useState(null),
    [err, E] = useState(""),
    [testing, TEST] = useState(null),
    [members, MEM] = useState(null);
  if (!d) return <ErrorBox error={error} />;
  const tabs = [
    ["overview", "平台概览", LayoutDashboard],
    ["users", "用户与权限", Users],
    ["projects", "项目管理", FolderKanban],
    ["models", "AI 模型配置", Sparkles],
    ["usage", "AI 使用记录", Activity],
    ["audit", "操作日志", FileText],
  ];
  return (
    <>
      <Heading
        eyebrow="ADMINISTRATION"
        title="管理员后台"
        description="维护协作空间、成员权限和 AI 服务。"
      >
        <span className="pill neutral">
          <Shield size={14} />
          管理员专属
        </span>
      </Heading>
      <div className="admin-tabs">
        {tabs.map(([id, t, I]) => (
          <button
            key={id}
            className={tab === id ? "selected" : ""}
            onClick={() =>
              router.push(id === "overview" ? "/admin" : "/admin/" + id)
            }
          >
            <I size={16} />
            {t}
          </button>
        ))}
      </div>
      <ErrorBox error={err} />
      {tab === "overview" && (
        <>
          <div className="stats-grid">
            {[
              ["平台成员", d.stats.users, Users],
              ["协作项目", d.stats.projects, FolderKanban],
              ["交付任务", d.stats.tasks, FileBox],
              ["正式资产", d.stats.assets, Box],
            ].map(([title, n, I]) => (
              <div className="stat-card" key={title}>
                <span className="stat-icon green">
                  <I size={20} />
                </span>
                <span>{title}</span>
                <strong>{n}</strong>
                <p>数据库实时统计</p>
              </div>
            ))}
          </div>
          <div className="dashboard-columns">
            <section className="panel padded">
              <h2>服务概况</h2>
              <div className="simple-row">
                <span>应用服务</span>
                <span className="badge approved">运行中</span>
              </div>
              <div className="simple-row">
                <span>数据库</span>
                <span>MySQL · sharecreators</span>
              </div>
              <div className="simple-row">
                <span>文件占用</span>
                <b>{sizes(d.stats.storage_bytes)}</b>
              </div>
              <div className="simple-row">
                <span>累计 AI tokens</span>
                <b>{Number(d.stats.tokens).toLocaleString()}</b>
              </div>
              <div className="simple-row">
                <span>可用 AI 模型</span>
                <b>{d.models.filter((m) => m.enabled).length}</b>
              </div>
            </section>
            <section className="panel padded">
              <h2>权限说明</h2>
              {[
                ["admin", "全平台管理、模型配置、操作审计"],
                ["lead", "项目任务、在线审阅、验收与标签确认"],
                ["artist", "项目内协作、正式资产检索与复用"],
                ["vendor", "仅分配给自己的任务、提交、评论与历史"],
              ].map(([r, t]) => (
                <div className="permission-row" key={r}>
                  <Shield size={17} />
                  <div>
                    <b>{roleNames[r]}</b>
                    <p>{t}</p>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
      {tab === "users" && (
        <section className="panel padded">
          <div className="section-heading">
            <h2>
              成员管理 <span className="count">{d.users.length}</span>
            </h2>
            <button className="btn primary" onClick={() => M("user")}>
              <Plus size={16} />
              创建用户
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>成员</th>
                  <th>邮箱</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {d.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="inline-avatar">
                        <Avatar name={u.name} small />
                        {u.name}
                      </span>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        disabled={u.id === base.user.id}
                        value={u.role}
                        onChange={async (e) => {
                          try {
                            await api(
                              "admin/users/" + u.id,
                              { role: e.target.value, active: u.active },
                              "PATCH",
                            );
                            await reload();
                            toast("角色已更新，该用户需要重新登录");
                          } catch (e) {
                            E(e.message);
                          }
                        }}
                      >
                        {Object.entries(roleNames).map(([v, n]) => (
                          <option key={v} value={v}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span
                        className={
                          "badge " +
                          (u.active ? "approved" : "changes_requested")
                        }
                      >
                        {u.active ? "已启用" : "已停用"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-link"
                        disabled={u.id === base.user.id}
                        onClick={async () => {
                          try {
                            await api(
                              "admin/users/" + u.id,
                              { role: u.role, active: !u.active },
                              "PATCH",
                            );
                            await reload();
                            toast("用户状态已更新");
                          } catch (e) {
                            E(e.message);
                          }
                        }}
                      >
                        {u.active ? "停用" : "启用"}
                      </button>
                      <UserActions
                        user={u}
                        self={u.id === base.user.id}
                        onDone={async () => {
                          await reload();
                          await refresh();
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "projects" && (
        <ProjectsPanel base={base} refresh={refresh} toast={toast} />
      )}
      {tab === "models" && (
        <>
          <div className="section-heading spaced">
            <div>
              <h2>AI 模型服务</h2>
              <p className="muted">
                兼容 Chat Completions 接口；密钥仅保存在服务端。
              </p>
            </div>
            <button
              className="btn primary"
              onClick={() => {
                MODEL(null);
                M("model");
              }}
            >
              <Plus size={16} />
              添加模型
            </button>
          </div>
          <div className="model-grid">
            {d.models.map((m) => (
              <section className="panel padded model-card" key={m.id}>
                <div className="section-heading">
                  <span className="model-icon">
                    <Sparkles />
                  </span>
                  <span
                    className={"badge " + (m.enabled ? "approved" : "assigned")}
                  >
                    {m.enabled ? "已启用" : "已停用"}
                  </span>
                </div>
                <h2>{m.name}</h2>
                <code>{m.model}</code>
                <p>{m.base_url}</p>
                <div className="simple-row">
                  <span>凭据来源</span>
                  <span>
                    {m.has_custom_key ? "独立加密密钥" : "服务端环境配置"}
                  </span>
                </div>
                <div className="simple-row">
                  <span>默认服务</span>
                  <span>{m.is_default ? "是" : "否"}</span>
                </div>
                <div className="model-actions">
                  <button
                    className="btn"
                    onClick={() => {
                      MODEL(m);
                      M("model");
                    }}
                  >
                    <Settings size={15} />
                    配置
                  </button>
                  <button
                    className="btn primary"
                    disabled={testing === m.id || !m.enabled}
                    onClick={async () => {
                      TEST(m.id);
                      E("");
                      try {
                        const r = await api(
                          "admin/models/" + m.id + "/test",
                          {},
                        );
                        toast(m.name + "：" + r.text);
                        await reload();
                      } catch (e) {
                        E(e.message);
                      } finally {
                        TEST(null);
                      }
                    }}
                  >
                    {testing === m.id ? "测试中…" : "测试连接"}
                    <Activity size={15} />
                  </button>
                </div>
              </section>
            ))}
          </div>
          <div className="info">
            <Sparkles size={18} />
            默认模型用于助手、需求起草、审阅总结、标签建议及语义搜索。AI
            建议不会自动执行审批。
          </div>
        </>
      )}
      {tab === "usage" && <RecordsPanel type="usage" />}
      {tab === "audit" && <RecordsPanel type="audit" />}
      {modal === "user" && (
        <Modal title="创建协作成员" onClose={() => M("")}>
          <Form
            button="创建用户"
            onSubmit={async (x) => {
              await api("admin/users", x);
              await reload();
              await refresh();
              M("");
              toast("成员已创建");
            }}
          >
            <Field label="姓名 / 工作室">
              <input name="name" required />
            </Field>
            <Field label="邮箱">
              <input type="email" name="email" required />
            </Field>
            <Field label="初始密码（至少 10 位）">
              <input type="password" name="password" required minLength={10} />
            </Field>
            <Field label="成员角色">
              <select name="role">
                {Object.entries(roleNames).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </Form>
        </Modal>
      )}
      {modal === "model" && (
        <Modal
          title={model ? "配置 AI 模型" : "添加 AI 模型"}
          onClose={() => M("")}
        >
          <Form
            onSubmit={async (x) => {
              await api(
                "admin/models" + (model ? "/" + model.id : ""),
                {
                  ...x,
                  enabled: x.enabled === "on",
                  isDefault: x.isDefault === "on",
                },
                model ? "PATCH" : "POST",
              );
              await reload();
              M("");
              toast("模型配置已保存");
            }}
          >
            <Field label="显示名称">
              <input name="name" required defaultValue={model?.name} />
            </Field>
            <Field label="模型标识">
              <input
                name="model"
                required
                defaultValue={model?.model}
                placeholder="gpt-5.6-luna"
              />
            </Field>
            <Field label="API Base URL">
              <input
                name="baseUrl"
                type="url"
                required
                defaultValue={model?.base_url || "https://api.apilio.ai/v1"}
              />
            </Field>
            <Field label="API Key（留空保留原值 / 使用环境配置）">
              <input
                name="apiKey"
                type="password"
                autoComplete="new-password"
                placeholder="密钥不会回显"
              />
            </Field>
            <div className="form-grid">
              <Field label="最大回复 tokens（256–16384）">
                <input
                  name="maxTokens"
                  type="number"
                  min="256"
                  max="16384"
                  defaultValue={model?.max_tokens || 4096}
                />
              </Field>
              <Field label="超时秒数（10–180）">
                <input
                  name="timeoutSeconds"
                  type="number"
                  min="10"
                  max="180"
                  defaultValue={model?.timeout_seconds || 60}
                />
              </Field>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={model ? !!model.enabled : true}
              />
              启用模型
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={!!model?.is_default}
              />
              设为默认模型
            </label>
          </Form>
        </Modal>
      )}
      {modal === "members" && members && (
        <Modal title={members.project.name + " · 成员"} onClose={() => M("")}>
          <div className="tags">
            {members.users.map((u) => (
              <span key={u.id}>
                {u.name} · {roleNames[u.role]}
              </span>
            ))}
          </div>
          <p className="muted">
            外包通过任务分配获得权限，不加入内部项目成员。
          </p>
          <Form
            button="添加项目成员"
            onSubmit={async (x) => {
              await api("projects/" + members.project.id + "/members", x);
              MEM({
                ...members,
                users: await api("projects/" + members.project.id + "/members"),
              });
              toast("项目成员已添加");
            }}
          >
            <Field label="内部成员">
              <select name="userId">
                {d.users
                  .filter(
                    (u) =>
                      u.active &&
                      u.role !== "vendor" &&
                      !members.users.some((m) => m.id === u.id),
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </Field>
          </Form>
        </Modal>
      )}
    </>
  );
}
