# 公开访问已停用（2026-10-21）

按用户要求停止军师天团网站公开访问，未删除仓库、Worker、静态素材、D1 数据库或密钥。

- 账户：hans.pan002@gmail.com（a828bebda1f352216c7d7da425bad17a）。
- Worker：junshi-tiantuan，保留现有线上版本。
- 已解除 askjunshi.com、www.askjunshi.com 的 Worker 自定义域名绑定。
- 已禁用 workers.dev 和版本预览 URL。
- GitHub 工作流 Deploy to Cloudflare 002 已手动停用，防止自动发布重新开放。
- Wrangler 配置同步关闭三个公开入口；没有重新部署或替换业务代码。
- D1：junshi-tiantuan-db（c7c8584e-45f3-4095-bc82-75020d840d05）保留。
- 没有取消域名注册、调整邮件 DNS 或删除旧账户资源。

如需恢复，需获得用户明确指令，重新启用所需域名及发布入口；不要仅启用工作流。原域名配置可从 Git 历史恢复。操作前绑定快照与本次知识库导出保存在本机受限权限的 migration-002-20261009 目录。
