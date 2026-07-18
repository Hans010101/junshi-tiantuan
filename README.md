# 军师天团

一个面向中文用户的多元思维决策助手。用户提出真实问题，选择 1–3 个公开方法论视角，系统会输出包含核心矛盾、分歧观点、可选路径和七日行动的决策简报。

> 人物名称用于指向其公开思想与方法论；本项目不声称人物本人参与回答，也不提供身份模仿服务。

## 当前版本

- 响应式 Web/H5：适配桌面、手机浏览器和微信内置浏览器
- Cloudflare Worker API：输入校验、大小限制、结构化日志和错误降级
- Workers AI：通过 Cloudflare 绑定调用 Qwen，无需在前端保存 API Key
- 安全边界：紧急健康/人身风险、违法规避与医疗/法律/金融主题分流
- 本机历史：最近 10 份报告只保存在浏览器 `localStorage`
- PWA 基础：manifest、favicon、安全响应头和 SPA 路由回退

项目评估见 [docs/ASSESSMENT.md](docs/ASSESSMENT.md)，架构与部署说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 本地开发

需要 Node.js 24+ 与 pnpm。

```bash
pnpm install
pnpm run cf-typegen
pnpm dev
```

打开 `http://localhost:5173`。`wrangler.jsonc` 中 AI 绑定设为远程模式，本地开发会调用 Cloudflare Workers AI 的远程资源。

## 验证与部署

```bash
pnpm run check
pnpm run deploy
```

`check` 会依次执行代码检查、TypeScript/生产构建和 Wrangler 部署预检。首次部署前运行 `pnpm exec wrangler login`。

## 自动部署

推荐使用 Cloudflare Workers Builds 连接本仓库的 `main` 分支：

1. Cloudflare Dashboard → Workers & Pages → `junshi-tiantuan`。
2. Settings → Builds → Connect to Git。
3. 选择公开 GitHub 仓库，生产分支设为 `main`。
4. Build command 使用 `pnpm run build`，Deploy command 使用 `pnpm exec wrangler deploy`。

之后每次合并或推送到 `main`，Cloudflare 会自动构建并发布；无需把 Cloudflare Token 写进公开仓库。

## 数据策略

当前版本不设账号、数据库和用户画像。问题只在生成请求中发送给 Workers AI；服务端日志只记录请求 ID、模式、耗时和军师数量，不记录问题正文。未来若增加跨设备同步，应先引入明确授权、数据删除和留存策略。

## License

[MIT](LICENSE)
