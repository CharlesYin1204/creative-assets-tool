# ShareCreators

ShareCreators 是面向游戏美术制作、外包交付和审阅协作的资产管理平台，将项目、任务、版本、三维资产、评论、验收、通知和 AI 辅助能力集中到统一工作台中。

## 核心能力

- 图片、OBJ、FBX、GLB/GLTF 等资产的版本化管理。
- 在线审阅、三维位置评论、版本对比和交付验收。
- 项目成员、任务分配、通知、审计和资产复用。
- AI 助手、制作要求草稿、审阅总结、标签建议和语义搜索。

## 产品界面

![ShareCreators 项目工作台](docs/screenshots/workspace.png)

![ShareCreators 在线审阅](docs/screenshots/review-1.png)

![ShareCreators 管理后台](docs/screenshots/admin.png)

## 技术架构

- React、Next.js、Node.js
- MySQL
- 受鉴权保护的本地文件存储
- Nginx、systemd

## 本地运行

1. 安装 Node.js 22 和 MySQL。
2. 执行 `npm ci`。
3. 复制 `.env.example` 为 `.env.local`，填写数据库、Session 和 AI 配置。
4. 空数据库执行 `npm run seed`；已有数据库执行 `npm run migrate`。
5. 执行 `npm run build`，然后运行 `npm start`。

默认端口为 `3040`。

## 生产部署

使用独立系统用户运行服务，Nginx 反向代理到 `127.0.0.1:3040` 并启用 HTTPS。更新前备份 MySQL、`storage/` 和加密主密钥；在独立构建目录完成 `npm test` 与健康检查后再切换服务。

## 项目结构

- `app/`：页面与 API
- `components/`：产品界面组件
- `lib/`：业务、数据库、权限和 AI 服务
- `database/`：数据库结构与迁移
- `storage/`：受保护的资产文件
- `scripts/`：初始化、迁移、测试和备份
- `docs/`：产品和验收文档
- `project-docs/`：项目维护记录

## 联系方式

微信：`charlesyin6015`
