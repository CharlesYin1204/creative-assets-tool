import { db, q, tx } from "../lib/db.mjs";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
for (const statement of (await fs.readFile("database/schema.sql", "utf8"))
  .split(";")
  .filter((s) => s.trim()))
  await q(statement);
if ((await q("SELECT COUNT(*) n FROM users"))[0].n) {
  console.log("Existing users found; seed skipped.");
  await db.end();
  process.exit();
}
const password = crypto.randomBytes(12).toString("base64url");
await fs.writeFile(
  "docs/access.txt",
  `网站：http://154.40.47.111:3040\n管理员：admin@sharecreators.local\n美术负责人：lead@sharecreators.local\n内部美术：artist@sharecreators.local\n外包美术：vendor@sharecreators.local\n外包隔离测试：other@sharecreators.local\n以上初始密码：${password}\n请登录用户中心修改初始密码。\n`,
  { mode: 0o600 },
);
const hash = await bcrypt.hash(password, 12);
const users = [
  ["林予安", "admin", "admin"],
  ["陈墨", "lead", "lead"],
  ["苏木", "artist", "artist"],
  ["鹿鸣工作室", "vendor", "vendor"],
  ["星野工作室", "other", "vendor"],
];
for (const [name, email, role] of users)
  await q("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)", [
    name,
    email + "@sharecreators.local",
    hash,
    role,
  ]);
await q(
  "INSERT INTO projects(name,description,owner_id,color) VALUES('迷雾森林 · Forest of Echoes','写实奇幻开放世界 · 森林场景美术资产制作与交付',2,'#38664e'),('遗落之境 · Lost Realm','遗迹探索项目 · 跨项目资产复用与场景搭建',2,'#9b764b')",
);
for (const p of [1, 2])
  for (const uid of [1, 2, 3])
    await q("INSERT INTO project_members(project_id,user_id) VALUES(?,?)", [
      p,
      uid,
    ]);
await q(
  "INSERT INTO ai_models(name,model,base_url,is_default) VALUES(?,?,?,1),(?,?,?,0)",
  [
    "Luna · 创作助手",
    process.env.AI_DEFAULT_MODEL,
    process.env.AI_BASE_URL,
    "Claude · 深度审阅",
    process.env.AI_SECONDARY_MODEL,
    process.env.AI_BASE_URL,
  ],
);
const titles = [
  "森林古树 · Ancient Oak",
  "苔藓岩石组 · Mossy Rocks",
  "林地蕨类 · Woodland Fern",
  "枯木残枝 · Fallen Branch",
  "针叶松树 · Alpine Pine",
  "古代石门 · Ruin Gateway",
  "森林蘑菇 · Forest Mushrooms",
  "野生草丛 · Wild Grass",
  "溪流卵石 · River Stones",
  "藤蔓石柱 · Vine Pillar",
  "橡木木箱 · Oak Crate",
  "营地灯笼 · Camp Lantern",
  "地表苔藓 · Ground Moss",
  "蕨叶材质 · Fern Texture",
  "林间灌木 · Forest Shrub",
  "古树根系 · Ancient Roots",
  "石制路标 · Stone Sign",
  "蘑菇灯簇 · Glowing Fungi",
];
await fs.mkdir("storage", { recursive: true });
await fs.mkdir("public/art", { recursive: true });
function art(i) {
  const type = i % 6;
  const palette = [
    ["#192b25", "#80ad81", "#426b46"],
    ["#262c2b", "#b4b4a4", "#69746a"],
    ["#16332b", "#93b984", "#3d7c5d"],
    ["#302b22", "#b69d74", "#786646"],
    ["#1b2b2c", "#89a78f", "#375e4b"],
    ["#2e2e29", "#c1b396", "#847e69"],
  ][type];
  let shape = "";
  const rand = (n) => Math.abs(Math.sin(i * 39 + n * 17)) * 1;
  for (let j = 0; j < (type === 0 || type === 4 ? 8 : 12); j++) {
    const x = 100 + rand(j) * 400,
      y = 190 + rand(j + 30) * 130,
      r = 25 + rand(j + 60) * 48;
    if (type === 0 || type === 4) {
      shape += `<path d="M${x} ${y + 60}l-5 -105h10l3 105" fill="#65563e"/><path d="M${x} ${y - 150}l-${r} 120h${r * 2}Z" fill="${j % 2 ? palette[1] : palette[2]}"/><path d="M${x} ${y - 120}l-${r * 1.2} 100h${r * 2.4}Z" fill="${j % 2 ? palette[2] : palette[1]}" opacity=".8"/>`;
    } else if (type === 1 || type === 5) {
      shape += `<path d="M${x - r} ${y}l${r * 0.5} -${r} ${r} -${r * 0.2} ${r * 0.7} ${r * 0.8} -${r * 0.3} ${r * 0.8} -${r} ${r * 0.3}Z" fill="${j % 2 ? palette[1] : palette[2]}"/><path d="M${x - r / 2} ${y - r}l${r} -${r * 0.2} -${r * 0.15} ${r * 0.9}Z" fill="#e5e0c4" opacity=".12"/>`;
    } else {
      shape += `<path d="M${x} ${y + 25}Q${x - r} ${y - r * 1.5} ${x - r * 1.3} ${y - r}Q${x} ${y - r} ${x} ${y + 25}Q${x + r * 1.4} ${y - r * 1.2} ${x + r * 1.2} ${y - r}Q${x + r} ${y} ${x} ${y + 25}" fill="${j % 2 ? palette[1] : palette[2]}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><radialGradient id="bg"><stop stop-color="${palette[2]}"/><stop offset="1" stop-color="${palette[0]}"/></radialGradient><filter id="s"><feGaussianBlur stdDeviation="10"/></filter></defs><rect width="640" height="420" fill="url(#bg)"/><ellipse cx="320" cy="335" rx="225" ry="28" fill="#071711" opacity=".5" filter="url(#s)"/><path d="M75 300L310 240 565 301 334 374Z" fill="#263d2e"/>${shape}<path d="M0 370h640M0 390h640" stroke="#fff" opacity=".025"/></svg>`;
}
for (let i = 0; i < 18; i++) {
  await fs.writeFile(`public/art/asset-${i + 1}.svg`, art(i));
  const status =
    i < 3 ? ["in_review", "changes_requested", "assigned"][i] : "approved";
  const assignee = i === 2 ? 5 : 4;
  const r = await q(
    "INSERT INTO tasks(project_id,title,requirements,category,assignee_id,creator_id,due_date,status,priority,license,tags,preview) VALUES(?,?,?,?,?,?,DATE_ADD(CURDATE(),INTERVAL ? DAY),?,?,?,?,?)",
    [
      i === 5 || i === 10 ? 2 : 1,
      titles[i],
      "写实奇幻风格，适用于森林场景。模型比例以米为单位；建议面数不超过 20,000 tris；UV 无重叠；提供 BaseColor、Normal、Roughness 贴图（建议 2K）。提交 OBJ/FBX/GLB 模型、贴图及预览图。具体规格由负责人确认。",
      i === 12 || i === 13 ? "材质" : i === 10 || i === 11 ? "道具" : "场景",
      assignee,
      2,
      i < 3 ? i + 2 : 15,
      status,
      i === 0 ? "high" : "normal",
      i === 5 ? "source_only" : "all_projects",
      i % 6 === 1
        ? "森林，岩石，苔藓，写实"
        : i % 6 === 3
          ? "森林，枯树，枯木，自然，场景"
          : "森林，自然，植被，写实，场景",
      `/art/asset-${i + 1}.svg`,
    ],
  );
  const tid = r.insertId;
  if (status === "assigned") continue;
  const count = i === 0 ? 2 : 1;
  let last;
  for (let n = 1; n <= count; n++) {
    const v = await q(
      "INSERT INTO versions(task_id,number,notes,author_id,status) VALUES(?,?,?,?,?)",
      [
        tid,
        n,
        n === 2
          ? "V2：优化树皮纹理接缝，降低根部面数；请复核细节。"
          : "V1：首次提交模型、基础贴图与预览示意。",
        assignee,
        i === 0 && n === 1 ? "changes_requested" : status,
      ],
    );
    last = v.insertId;
    const modelName = `seed-${tid}-v${n}.obj`;
    await fs.writeFile(
      "storage/" + modelName,
      `# ShareCreators demonstration geometry; not a production game asset\no Asset_${tid}_v${n}\nv -1 0 -1\nv 1 0 -1\nv 1 0 1\nv -1 0 1\nv 0 ${n + 2} 0\nf 1 2 5\nf 2 3 5\nf 3 4 5\nf 4 1 5\nf 4 3 2 1\n`,
    );
    const stats = await fs.stat("storage/" + modelName);
    await q(
      "INSERT INTO files(task_id,version_id,uploader_id,name,path,mime,size,kind) VALUES(?,?,?,?,?,?,?,?)",
      [
        tid,
        last,
        assignee,
        `model_v${n}.obj`,
        modelName,
        "application/octet-stream",
        stats.size,
        "model",
      ],
    );
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    );
    const tex = `seed-${tid}-v${n}.png`;
    await fs.writeFile("storage/" + tex, png);
    await q(
      "INSERT INTO files(task_id,version_id,uploader_id,name,path,mime,size,kind) VALUES(?,?,?,?,?,?,?,?)",
      [
        tid,
        last,
        assignee,
        "demo_texture.png",
        tex,
        "image/png",
        png.length,
        "texture",
      ],
    );
    if (i === 0 && n === 1) {
      for (const [b, x, y] of [
        ["树皮纹理重复明显，请调整。", 0.5, 0.45],
        ["根部轮廓过于规则，请增加自然变化。", 0.35, 0.7],
      ])
        await q(
          "INSERT INTO comments(version_id,author_id,body,x,y,resolved) VALUES(?,?,?,?,?,1)",
          [last, 2, b, x, y],
        );
      await q(
        "INSERT INTO comments(version_id,author_id,body,parent_id) VALUES(?,?,?,1)",
        [last, 4, "已在 V2 中调整纹理与根部形态，请查看新版本。"],
      );
    }
  }
  if (status === "approved")
    await q("UPDATE tasks SET approved_version_id=? WHERE id=?", [last, tid]);
  if (i === 0)
    await q(
      "INSERT INTO comments(version_id,author_id,body,x,y) VALUES(?,?,?,?,?)",
      [last, 2, "请再确认左侧枝干的贴图接缝。", 0.62, 0.4],
    );
}
await q(
  "INSERT INTO notifications(user_id,title,link) VALUES(2,'森林古树 V2 已提交，等待你的审阅','/review/1'),(4,'森林古树 V2 有新的审阅意见','/review/1'),(1,'欢迎来到 ShareCreators，示例资产用于流程体验','/workspace')",
);
await q(
  "INSERT INTO reuses(task_id,project_id,version_id,user_id) SELECT id,2,approved_version_id,3 FROM tasks WHERE id=4",
);
console.log(
  "Schema and 18 sample tasks created. Account credentials saved in docs/access.txt (0600).",
);
await db.end();
