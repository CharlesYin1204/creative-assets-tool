from pathlib import Path
p=Path('app/[[...path]]/page.jsx');s=p.read_text();s=s.replace("'use client';",'"use client";')
pos=s.index('import React')
s=s[:pos]+'''import dynamic from 'next/dynamic';
import {TaskActions,ProjectsPanel,DeliveryUpload,NotificationsPanel,RecordsPanel,UserActions,ReuseRemove,AssetManage,ChatPanel} from '../components/ModulePanels';
const ModelViewer=dynamic(()=>import('../components/ModelViewer'),{ssr:false,loading:()=> <div className="info">加载三维预览…</div>});
'''+s[pos:]
s=s.replace('["交付任务", "/tasks", FolderKanban],','["交付任务", "/tasks", FolderKanban],\n    ...(internal?[["项目管理","/projects",Users]]:[]),')
s=s.replace('else if (path === "/tasks" || path === "/reviews")','else if(path==="/projects" && internal)content=<ProjectsPanel base={base} refresh={refresh} toast={T}/>;\n  else if (path === "/tasks" || path === "/reviews")')
s=s.replace('content = <Assistant />','content = <ChatPanel />')
s=s.replace('base.notifications.some((n) => !n.is_read)','base.unreadCount>0').replace('base.notifications.filter((n) => !n.is_read).length','base.unreadCount')
s=s.replace('tasks = base.tasks.filter(','tasks = base.tasks.filter(t=>!t.archived&&!t.project_archived).filter(',1)
start=s.index('function Tasks(');end=s.index('function TaskForm(',start);section=s[start:end];section=section.replace('[modal, M] = useState("");','[modal, M] = useState(""),[archived,AR]=useState(false);');section=section.replace('let tasks = base.tasks.filter(', 'let tasks = base.tasks.filter(t=>!!t.archived===archived).filter(')
section=section.replace('<div className="toolbar">','<div className="toolbar"><label className="check-label"><input type="checkbox" checked={archived} onChange={e=>AR(e.target.checked)}/>已归档任务</label>',1)
s=s[:start]+section+s[end:]
# Do not offer archived projects in create-task select; context-specific replacement only
start=s.index('function TaskForm(');end=s.index('function Task(',start);section=s[start:end].replace('base.projects.map((p) => (','base.projects.filter(p=>!p.archived).map((p) => (');s=s[:start]+section+s[end:]
start=s.index('function Task(');end=s.index('function FileList(',start);section=s[start:end];a=section.index('          {canSubmit && (');b=section.index('          {lead && !canSubmit && (',a);section=section[:a]+'''          {canSubmit && <DeliveryUpload task={t} onDone={async()=>{await reload();await refresh();toast('新版本已提交审阅')}}/>}
'''+section[b:]
section=section.replace('<Badge status={t.status} />','<Badge status={t.status} />\n        {lead&&<TaskActions task={t} people={base.people} onDone={async()=>{await reload();await refresh();toast("任务已更新")}}/>}\n        {lead&&t.approved_version_id&&<AssetManage task={t} onDone={async()=>{await reload();await refresh();toast("资产可见性已更新")}}/>}',1)
section=section.replace('{lead && !canSubmit && (','{lead && !t.archived && !t.project_archived && !canSubmit && (');s=s[:start]+section+s[end:]
start=s.index('function Review(');end=s.index('function Assets(',start);section=s[start:end];section=section.replace('[reply, RP] = useState(null);','[reply, RP] = useState(null),[mode,MODE]=useState("image"),[anchor,ANCHOR]=useState(null),[decisionBusy,DB]=useState(false);\n  useEffect(()=>{B("");P(null);RP(null);ANCHOR(null)},[selected]);')
section=section.replace('lead && version?.id === t.versions[0]?.id && t.status === "in_review"','lead && !t.archived && !t.project_archived && version?.id === t.versions[0]?.id && t.status === "in_review"')
section=section.replace('const approve = async (decision) => {\n    try {','const approve = async (decision) => {\n    if(decisionBusy)return;DB(true);try {');section=section.replace('E(e.message);\n    }\n  };','E(e.message);\n    } finally {DB(false)}\n  };',1)
section=section.replace('      >\n        <button','      >\n        <select aria-label="预览模式" value={mode} onChange={e=>{MODE(e.target.value);P(null);ANCHOR(null)}}><option value="image">图片预览</option><option value="3d">三维模型</option></select>\n        <button',1)
needle='<div className="viewer-column">';section=section.replace(needle,needle+'''{mode==='3d' ? (compare&&old?<div className="model-compare"><div><b>V{old.number} · 上一版</b><ModelViewer key={old.id} files={t.files.filter(f=>f.version_id===old.id)} readOnly/></div><div><b>V{version.number} · 当前版</b><ModelViewer key={version.id} files={t.files.filter(f=>f.version_id===version.id)} focus={comments.find(c=>c.id===focus)} onPoint={a=>{ANCHOR(a);RP(null);P(null)}} readOnly={!!t.archived||!!t.project_archived}/></div></div>:<ModelViewer key={version.id} files={t.files.filter(f=>f.version_id===version.id)} focus={comments.find(c=>c.id===focus)} onPoint={a=>{ANCHOR(a);RP(null);P(null)}} readOnly={!!t.archived||!!t.project_archived}/>) : <>
''',1)
# Close image branch before compare notes / review actions
section=section.replace('            {compare && old && (','            </>}{compare && old && (',1)
# mode select associated comment restores 3d view
section=section.replace('FO(c.id);\n                      if (c.x != null)', 'FO(c.id);if(c.anchor)MODE("3d");else MODE("image");\n                      if (c.x != null)')
section=section.replace('parentId: reply,','parentId: reply,\n                      anchor,')
section=section.replace('                  RP(null);\n                  await reload();','                  RP(null);ANCHOR(null);\n                  await reload();')
section=section.replace(': point\n                    ? "已选择画面位置"', ': anchor?"已选择三维表面位置": point\n                    ? "已选择画面位置"')
section=section.replace('{(point || reply) && (','{(point || reply || anchor) && (').replace('P(null);\n                        RP(null);','P(null);\n                        RP(null);ANCHOR(null);')
section=section.replace('onClick={() => approve("approved")}','disabled={decisionBusy} onClick={() => approve("approved")}').replace('onClick={() => approve("changes_requested")}','disabled={decisionBusy} onClick={() => approve("changes_requested")}')
section=section.replace('<button className="btn primary" type="submit">','<button className="btn primary" type="submit" disabled={!!t.archived||!!t.project_archived}>')
section=section.replace('预览图模拟视角','图片 / 三维模型').replace('不解析真实 3D 几何','支持 OBJ、GLB、GLTF、FBX')
# Add comment edit using own existing inline dialog with local prompt avoided; component later
section=section.replace('<div className="comment-buttons">','<div className="comment-buttons">{c.author_id===base.user.id && version.status!=="approved" && !t.archived && <CommentEdit comment={c} onDone={reload}/>}')
s=s[:start]+section+s[end:]
# Asset details interactive model
start=s.index('function Asset(');end=s.index('function Assistant(',start);section=s[start:end].replace('[err, E] = useState("");','[err, E] = useState(""),[show3D,S3]=useState(false);',1)
section=section.replace('<div className="asset-detail-preview">','<div className="module-actions"><button className="btn" onClick={()=>S3(!show3D)}>{show3D?"查看预览图":"查看三维模型"}</button></div>{show3D?<ModelViewer files={t.files} readOnly/>:<div className="asset-detail-preview">',1)
section=section.replace('          <section className="panel padded">','          }<section className="panel padded">',1)
section=section.replace('              <h3>检索标签</h3>','              <h3>检索标签</h3>{["admin","lead"].includes(base.user.role)&&<button className="text-link" onClick={()=>T(t.tags||"")}>手工编辑</button>}')
s=s[:start]+section+s[end:]
start=s.index('          {tab === "notifications" && (');end=s.index('          {tab === "submissions" && (',start);s=s[:start]+'          {tab === "notifications" && <NotificationsPanel refresh={refresh}/>}\n'+s[end:]
s=s.replace('<div className="reuse-row" key={r.id}>','<div className="reuse-row" key={r.id}><ReuseRemove id={r.id} onDone={refresh}/>',1)
start=s.index('      {tab === "projects" && (');end=s.index('      {tab === "models" && (',start);s=s[:start]+'      {tab === "projects" && <ProjectsPanel base={base} refresh={refresh} toast={toast}/>}\n'+s[end:]
start=s.index('      {tab === "usage" && (');end=s.index('      {modal === "user" && (',start);s=s[:start]+'      {tab === "usage" && <RecordsPanel type="usage"/>}\n      {tab === "audit" && <RecordsPanel type="audit"/>}\n'+s[end:]
s=s.replace('{u.active ? "停用" : "启用"}\n                      </button>','{u.active ? "停用" : "启用"}\n                      </button><UserActions user={u} self={u.id===base.user.id} onDone={async()=>{await reload();await refresh()}}/>',1)
s=s.replace('            <label className="check-label">\n              <input\n                type="checkbox"\n                name="enabled"','''            <div className="form-grid"><Field label="最大回复 tokens（256–16384）"><input name="maxTokens" type="number" min="256" max="16384" defaultValue={model?.max_tokens||4096}/></Field><Field label="超时秒数（10–180）"><input name="timeoutSeconds" type="number" min="10" max="180" defaultValue={model?.timeout_seconds||60}/></Field></div>
            <label className="check-label">
              <input
                type="checkbox"
                name="enabled"''',1)
s=s.replace('示例资产为概念示意，预览不解析真实 3D 模型','示例资产用于演示 · 模型文件支持三维预览')
p.write_text(s)
# project archive state visible to views
for name in ['lib/auth.mjs','app/api/[...path]/route.js']:
 p=Path(name);s=p.read_text().replace('p.name project_name','p.archived project_archived,p.name project_name');p.write_text(s)
