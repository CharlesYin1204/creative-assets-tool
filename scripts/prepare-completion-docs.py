import json,html
from pathlib import Path
rows=[]
def add(id,side,module,name,role,behavior,rule,accept,route,note='V1.1 新增'):
 rows.append(dict(id=id,side=side,module=module,name=name,role=role,behavior=behavior,rule=rule,accept=accept,route=route,priority='P0',note=note))
add('F25','前端','项目管理','编辑、归档与恢复','管理员/项目负责人','维护项目名称与说明；归档保留任务、文件和版本；恢复后继续协作','项目 revision 冲突返回 409；归档项目不接受新任务、交付和成员变更','两个窗口并发编辑，旧窗口被拒；归档写入失败且恢复有效','/projects')
add('F26','前端','项目管理','项目成员移除','管理员/项目负责人','显示协作成员，可增添或移除内部成员','创建人不可移除；有未归档负责任务须先重新分配；外包通过任务授权','移除后原账号立即失去该项目访问','/projects')
add('F27','前端','任务管理','任务编辑与重新分配','管理员/项目负责人','修改规格、负责人、截止日、分类、格式、贴图要求、优先级和授权说明','乐观锁防旧窗口覆盖；审阅中不可换负责人；已有跨项目引用不可收紧为仅来源项目','重新分配撤销原外包访问并通知双方；无效日期和格式被拒','/tasks/:id')
add('F28','前端','任务管理','任务归档与恢复','管理员/项目负责人','归档后主列表默认隐藏，可筛选查看或恢复；历史交付保留','归档任务禁止上传、提交、审阅、意见编辑','归档提交返回 409；恢复后可正常继续交付','/tasks、/tasks/:id')
add('F29','前端','文件交付','上传队列、进度与失败重试','任务负责美术/管理员','显示每个文件上传进度；失败项可原文件重试或移除','成功文件不随失败项丢失；未提交文件限上传者与管理员访问','模拟一次失败后点击重试成功；公网 HTTP 上传正常','/tasks/:id')
add('F30','前端','文件交付','持久化草稿','任务负责美术/管理员','成功文件保存在服务端；说明自动保存并支持手动保存；刷新恢复','草稿按任务和用户隔离；已提交文件不可删除；提交成功清除草稿','刷新仍显示已上传文件和说明；删除未提交文件后不可下载','/tasks/:id')
add('F31','前端','在线审阅','真实三维模型预览','任务可见成员/资产可用成员','解析 OBJ、FBX、GLB/GLTF，拖动旋转、滚轮缩放、右键平移、重置、线框切换、模型选择','文件经过同一下载鉴权；资源依赖取本版本上传文件；无法解析明确提示并可切换图片','真实几何在 WebGL 画布显示，模型统计与文件一致','/review/:id、/assets/:id','V1.1 扩展；BLEND/ZIP 用于交付下载；不支持的编码需转换标准格式或补预览图')
add('F32','前端','在线审阅','三维位置意见与双版对比','任务可见成员','点击模型表面留下位置，存储模型编号、三维点、相机和目标；点击评论恢复视角；上一版与当前版可并排预览','模型必须属于评论版本；换版本清除未发出的评论草稿；图片坐标继续归一化保存','三维标注写入数据库；点击评论自动切换三维并还原位置','/review/:id')
add('F33','前端','在线审阅','评论作者编辑','评论作者','编辑本人未验收版本的意见，并记录编辑时间与操作审计','不得编辑他人意见；归档或已验收历史意见不可改写','本人可保存、他人 403、验收后 409','/review/:id')
add('F34','前端','资产管理','下架、恢复与手工标签','管理员/项目负责人','在交付详情下架或恢复验收资产；资产详情编辑标签','下架退出正式库与新增复用；已有引用及历史文件保留；新标签需主动保存','下架详情返回 404；已有引用仍可下载固定版；恢复后重现','/tasks/:id、/assets/:id')
add('U09','用户中心','消息通知','分页与单条已读','所有成员','每页 20 条，查看全部/未读、单条标记或全部已读，准确展示未读总数','仅可更改自己的通知','23 条测试数据分两页，单条已读总数减一，越权操作返回 404','/account')
add('U10','用户中心','复用记录','移除引用与历史文件访问','引用本人/管理员','移除项目引用；保留引用时即使资产有新版也能下载固定旧版','引用归属鉴权；移除后无项目源权限者失去旧文件访问','旧版引用下载 200，删除引用后旧文件 403','/account/reuses')
add('U11','用户中心','AI 历史','完整调用历史分页','所有成员','每页 20 条本人各项 AI 记录；查看完整请求、回答、失败原因和模型','其他用户不能读取个人历史正文','超过一页时可翻页，结果弹窗展示正确正文','/assistant/history')
add('A11','管理员后台','成员管理','编辑姓名与邮箱','管理员','维护用户姓名与登录邮箱','邮箱必须有效且唯一，不变更密码或角色','修改后重新查询显示新资料，重复邮箱返回冲突','/admin')
add('A12','管理员后台','成员管理','重置用户密码','管理员','为协作者设置至少 10 位新密码','重置撤销全部已有会话；管理员自身走用户中心验证旧密码','旧会话 401，新密码可登录','/admin')
add('A13','管理员后台','AI 模型','回复长度与超时配置','管理员','模型单独设置最大回复 tokens 和超时秒数，调用立即应用','tokens 256–16384；超时 10–180 秒；默认模型必须启用；变更 API 地址需新凭据','参数保存后回读一致，越界配置拒绝，密钥不回传','/admin')
add('A14','管理员后台','运营与审计','日志分页、筛选、导出','管理员','AI 调用与操作审计每页 25 条，关键词过滤；AI 可按成功失败筛选；导出 CSV','仅管理员可查；最多导出 10000 条；CSV 单元格防公式注入','下一页与上一页记录不重复；CSV 含筛选后的日志','/admin')
add('AI06','AI 功能','创作助手','持久化多轮会话','所有成员','创建会话、选择启用模型、发送多轮问题、回看消息；结合当前可见任务','最近 12 条成功消息作为上下文；单会话同时只允许一个生成；失败保留错误可重试','实际模型第二轮准确复述第一轮指定代号，刷新四条消息仍在','/assistant')
add('AI07','AI 功能','创作助手','会话重命名、归档和恢复','会话本人','会话列表按更新时间排列，重命名、归档、筛选归档、恢复继续对话','用户隔离，归档会话不可发送直至恢复','其他用户查对话 404；归档发送 409；恢复重新出现在列表','/assistant')
add('B07','业务规则','并发与历史','编辑冲突与历史不可变','服务端','项目/任务编辑检查 revision；交付锁定任务；已提交文件与验收意见保持可追溯','归档阻断写入；旧 revision 无法覆盖；软删除不作用于提交文件','并发旧窗口编辑 409；历史文件移除 409','lib/modules.mjs、提交事务')
add('B08','业务规则','数据迁移','增量迁移与兼容部署','运维','新增草稿、对话、消息表与扩展字段；保留已有记录；独立构建验证后切换服务','不重置已有用户/项目/任务；备份可恢复；预览仅本机端口','迁移可重复执行；生产 IP:3040 健康检查通过','scripts/migrate-complete.mjs、systemd')
Path('docs/completion/requirements.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
keys=['id','module','name','role','behavior','rule','accept','route','priority','note']; headers=['需求编号','模块','功能','使用角色','交互与行为','权限与业务规则','可观察验收标准','入口或实现位置','优先级','能力边界']
spec=[];styles=[]
for side,short in [('前端','front'),('用户中心','user'),('管理员后台','admin'),('AI 功能','ai'),('业务规则','rules')]:
 old=json.load(open('docs/completion/sheet-'+short+'-before.json'))['ranges'][0]['cells'];last=max(i+1 for i,r in enumerate(old)if any(c.get('value') for c in r));new=[r for r in rows if r['side']==side];start=last+1;end=last+len(new)
 spec.append(dict(name=side,start_cell=f'A{start}',header=False,allow_overwrite=False,columns=headers,data=[[r[k] for k in keys]for r in new],dtypes={h:'object' for h in headers}))
 styles.append(dict(name=side,cell_styles=[dict(range=f'A{start}:J{end}',font_size=11,word_wrap='auto-wrap',vertical_alignment='middle',font_color='#33483B',border={'style':'solid','color':'#E2E9E3'}),dict(range=f'A{start}:A{end}',background_color='#F0F6F1',font_weight='bold')],row_sizes=[dict(range=f'{start}:{end}',size=140)]))
Path('/tmp/share-completion-sheets.json').write_text(json.dumps({'sheets':spec},ensure_ascii=False));Path('docs/completion/sheet-styles.json').write_text(json.dumps({'styles':styles},ensure_ascii=False))
xml=['<h1>V1.1 功能补全与详细规则</h1>','<p>本章在原 53 条需求上补充 21 条功能与规则，覆盖日常维护、异常恢复、真实三维审阅、用户记录和 AI 对话。保留原始提交—审阅—验收—入库—复用主线与四类角色权限。新版对三维预览和上传恢复的要求以本章为准。</p>']
for side in ['前端','用户中心','管理员后台','AI 功能','业务规则']:
 xml.append('<h2>'+side+'</h2>')
 for r in rows:
  if r["side"] != side: continue
  xml.append('<h3>'+html.escape(r['id']+' '+r['module']+'：'+r['name'])+'</h3>')
  for label,key in [('使用角色','role'),('行为','behavior'),('业务规则','rule'),('验收标准','accept'),('入口','route'),('说明','note')]:xml.append('<p><b>'+label+'：</b>'+html.escape(r[key])+'</p>')
xml+=['<h2>数据、接口与发布</h2>','<p>数据库增加 task_drafts、ai_conversations、ai_messages；项目与任务增加 revision / archived，任务增加 library_visible；files 增加 deleted_at；comments 增加 anchor / edited_at；ai_models 增加 max_tokens / timeout_seconds。通过 npm run migrate 增量迁移，不清空已有业务数据。</p>','<p>新增接口：PATCH projects/:id 与 tasks/:id；DELETE projects/:id/members/:userId；GET/PATCH tasks/:id/draft；DELETE files/:id；PATCH comments/:id/edit、assets/:id/visibility；GET/PATCH notifications；DELETE reuses/:id；GET ai/records；ai/conversations 会话、消息与归档；admin/users 资料和密码；admin/records 分页/CSV。所有接口均在服务端执行身份与角色验证。</p>','<p>前端仍为 React，后端 Next.js/Node.js，数据库为 sharecreators。代码及上传文件位于 /www/wwwroot/sharecreators；网站入口 http://154.40.47.111:3040/。采用独立构建目录验证后切换 systemd 服务，保留旧构建回滚。</p>','<p>格式约束：OBJ、常规 FBX、GLB/GLTF 可在浏览器解析；外部贴图与依赖应随该版本上传。BLEND/ZIP 保留交付下载，不在浏览器内解压或执行。损坏文件、缺失依赖、不受支持的压缩编码和不具备 WebGL 的环境显示错误并可切换图片。AI 依然根据文字和权限范围给建议，不自动验收或改写资产。</p>']
Path('docs/completion/prd-append.xml').write_text('\n'.join(xml))
print('Prepared',len(rows),'new requirements; preserve all original sheet cells.')
