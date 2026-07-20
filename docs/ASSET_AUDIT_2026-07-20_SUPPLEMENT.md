# 军师天团 · 补充视觉素材质检与入库报告

复核时间：2026-07-20  
入库目标：Cloudflare Static Assets + D1 `junshi-tiantuan-db`

## 结论

本次 9 个补充 ZIP 均通过压缩包完整性与路径安全检查。109 位军师的独立圆头像、终版肖像和思维模型谋略图已经全部找齐，标准资源总数为 763，缺失为 0。

| 资源 | 应有 | 实有 | 缺失 | 结果 |
|---|---:|---:|---:|---|
| 独立圆头像 | 109 | 109 | 0 | 完整 |
| 终版肖像 | 109 | 109 | 0 | 完整 |
| 思维模型谋略图 | 545 | 545 | 0 | 完整 |
| 合计 | 763 | 763 | 0 | 完整 |

每位军师都严格对应 1 个圆头像、1 张肖像和 5 张谋略图；没有重人、漏人、重复资源路径、损坏 PNG 或模型编号缺口。545 张谋略图的 `(card_id, 模型名)` 与现有 109 份知识卡完全匹配，模型编号均为 1–5。

机器可读结果见 [`data/knowledge/supplement_audit.json`](../data/knowledge/supplement_audit.json)，763 项规范清单见 [`data/knowledge/canonical_image_inventory.json`](../data/knowledge/canonical_image_inventory.json)。

## 多包交叉核验

- `军师头像_109.zip` 与 `junshi_1of4_kb_portraits_avatars.zip` 中的 109 个头像逐文件 SHA-256 完全一致。
- `junshi_1of4` 至 `junshi_4of4` 是权威标准包：包含 109 头像、109 肖像、545 谋略图和规范资源清单。
- 三个“图上传包”合计 654 张图，其中 545 张谋略图与权威包完全一致；23 张肖像是较早修订版，因此未覆盖现有终版肖像。
- `军师卡库_全量109张_v3.zip` 与当前 109 人名单一致。
- 补充包中的 `advisors.json`、`cases.json`、`id_map.json` 与现有知识库逐字节一致，因此没有用同内容重复改写数据库。
- 109 份源卡审核状态未发生变化：3 份 `approved`，106 份 `in_review`。

## 已完成入库

- 圆头像：`public/advisors/avatars/{card_id}.png`
- 终版肖像：`public/advisors/portraits/{card_id}.png`
- 谋略图：`public/advisors/strategy/{card_id}/model-{1..5}.png`
- D1 索引迁移：`migrations/0003_complete_visual_assets.sql`
- 可重复导入脚本：`scripts/import-junshi-visual-supplement.mjs`

军师名录现在展示独立设计圆头像；点击任意军师可查看 5 个思维模型、对应谋略图、决策原则、使用盲区和案例。

主页原九视角中的彼得·德鲁克、埃隆·马斯克不属于权威 109 人花名册，因而也没有对应素材与知识卡。为避免花名册外占位人物，入口已分别调整为 109 人库中的稻盛和夫（经营与组织）和亚里士多德（第一性原理）。

## 仍需补充什么

视觉素材方面没有必须补充的文件。当前唯一大规模待办是 106 份知识源卡的人工内容复核，重点检查来源可追溯性、模型差异化、反例与盲区。

品牌 Logo 的 SVG/AI 源文件和页面 Figma 高保真稿仍属于可选增强项；当前 PNG Logo 与响应式 Web/H5 不受影响。
