# 架构与部署

## 当前架构

```text
桌面浏览器 / 手机浏览器 / 微信内置浏览器
                    │
                    ▼
       Cloudflare Workers Static Assets
          React + TypeScript + Vite
                    │ POST /api/advice
                    ▼
            Cloudflare Worker
       校验 → 安全分流 → 提示词编排
                    │
                    ▼
             Workers AI (Qwen)
                    │
                    ▼
       结构化决策简报 / 安全降级报告
```

浏览器历史使用 `localStorage`，当前没有服务端数据库。静态网站与 API 使用同一个 Worker 域名，避免额外跨域配置和密钥暴露。

## 为什么选择 Cloudflare Workers

- React 静态资源和 API 可以在同一项目部署。
- `workers.dev` 提供免费的默认访问域名，也支持后续绑定自有域名。
- Workers AI 通过绑定调用，不需要把模型密钥放进前端或 GitHub。
- GitHub 集成后可以从 `main` 自动构建发布。

官方资料：

- [React + Vite on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

## 微信生态

第一阶段直接发布 H5 链接或二维码，可在微信内置浏览器访问，也可配置到公众号菜单。它不依赖微信小程序云托管。

如果以后需要小程序入口，可做一个很薄的原生小程序壳，通过 `web-view` 打开 H5；届时需要按微信平台要求配置业务域名和主体资质。若主要服务中国大陆用户，还要评估访问延迟、域名备案和合规要求。Cloudflare 免费网络并不等同于中国大陆本地加速，流量规模上来后可以考虑大陆云厂商作为混合部署节点。

## 后续演进

1. 方法论库从代码常量升级为可评测、可版本化的数据层。
2. 增加追问阶段，而不是一次输入直接生成报告。
3. 通过 Cloudflare D1 增加可选账号与跨设备同步，并提供导出/删除。
4. 建立匿名质量评价、提示词回归测试和安全测试集。
5. 在有明确付费需求后再接入支付、邮件和管理后台。
