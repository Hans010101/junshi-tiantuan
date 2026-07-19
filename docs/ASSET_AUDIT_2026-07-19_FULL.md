# 军师天团 · 109 人完整素材复核与入库报告

复核时间：2026-07-19  
入库目标：Cloudflare D1 `junshi-tiantuan-db`

## 结论

这批附件已经补齐 109 人的结构化知识正文、决策案例与终版肖像，人物、领域和 `person_id` 交叉映射均为 109/109，没有发现漏人、重人、重图或损坏 PNG。

仍有两类明确缺口：

1. 545 张“思维模型谋略图”只有完整清单，没有图片文件。
2. 资料所称的 109 张独立圆头像没有随包提供；当前 109 张终版肖像可以稳定裁切为圆形金线头像，系统已经采用这一方案，但它不等于原清单所述的独立 `thumb.png` 文件。

知识正文虽然数量齐全，但审核状态并未齐全：源卡 109 份中仅 3 份为 `approved`，其余 106 份仍为 `in_review`。因此数据库分别保存了“已导入”和“已审核”状态，没有把二者混为一谈。

机器可读的核对结果见 [`data/knowledge/audit.json`](../data/knowledge/audit.json)，763 条图片预期清单见 [`data/knowledge/image_inventory.json`](../data/knowledge/image_inventory.json)。

## 附件逐项检查

| 附件 | 实际内容 | 结果 |
|---|---|---|
| `军师卡库源_109.zip` | 109 份 Markdown 框架卡 | 数量完整；3 approved，106 in_review |
| `军师名单_分域名录.md` | 10 域、109 人名单 | 数量和各域分布匹配 |
| `军师头像花名册_109.md` | 109 个 `person_id` 与预期头像文件名 | 映射完整，但对应独立圆头像文件未附带 |
| `头像源图包_1of1.zip` | 109 张肖像源图 | 数量完整；并非独立圆头像包 |
| `肖像卡终版_109.zip` | 109 张终版肖像 PNG | 数量完整、均可解码、无重复，作为线上权威版本 |
| `junshi_full_assets.zip` | 109 人 JSON、451 案例、763 图片清单、取图脚本 | 知识完整；图片目录为空，只有清单和脚本 |
| `UI工单_编号4_匹配页与出谋划策页.md` | 交互与视觉文字规范 | 可用；其中腾讯云 `cloud://` 路径方案已转换为 Cloudflare HTTPS 静态资源方案 |

`头像源图包_1of1.zip` 与 `肖像卡终版_109.zip` 中有 86 张字节完全一致、23 张经过终版调整；系统只采用后者。终版尺寸分布如下：

- 885×1023：43 张
- 885×1024：10 张
- 886×1040：17 张
- 900×1040：6 张
- 909×1080：33 张

## 已入库数据

| 数据 | 数量 | 数据库位置 |
|---|---:|---|
| 军师 | 109 | `advisors` |
| 核心思维模型（文字） | 545 | `advisors.profile_json` |
| 决策案例 | 451 | `advisor_cases` |
| 结构化来源登记 | 329 | `advisors.profile_json` |
| 图片资源索引 | 763 | `advisor_assets` |
| 可用终版肖像 | 109 | 静态资源 + D1 索引 |
| 由肖像裁切的头像 | 109 | D1 标记 `derived_from_portrait` |
| 缺失谋略图 | 545 | D1 标记 `missing` |

案例质量标签也已原样保留：

- 来源层级：primary 217、secondary 229、tertiary 5。
- 史实性：confirmed 403、disputed 43、legendary 5。

## 知识审核状态

源卡明确通过审核的 3 人是：

- 理查德·费曼（名录简称“费曼”）
- 林肯
- 苏格拉底

其余 106 人内容已经导入，但仍应逐人完成：盲区识别、反例、差异化与可追溯性复核。`junshi_full_assets.zip` 中的运行时 JSON 将 109 人全部标为 `published`，这只说明旧后端曾对外读取，不能替代源卡审核状态。

## 还需要你补充什么

### 1. 优先补 545 张谋略图

最省事的交付方式是从原腾讯云 COS 下载整个 `kb-assets/` 目录，保留：

```text
kb-assets/{card_id}/model-1.png
kb-assets/{card_id}/model-2.png
kb-assets/{card_id}/model-3.png
kb-assets/{card_id}/model-4.png
kb-assets/{card_id}/model-5.png
```

然后打成一个 ZIP 上传即可。不要提供 SecretId、SecretKey 或任何长期密钥。若只能逐张查找，按 [`image_inventory.json`](../data/knowledge/image_inventory.json) 中 `role = strategy_card` 的 545 条记录核对；其中 `cos_source` 是中文原文件名，`dest` 是本项目标准文件名。

### 2. 可选补独立圆头像原件

请查找名单文档中提到但本次没有附带的 `军师头像_109.zip`，理想文件名形如：

```text
军师头像_战略_孙子_P-sunzi.png
```

如果找不到也不影响当前上线：终版肖像的圆形裁切已经通过桌面与移动端视觉检查。只有当你希望完全复刻“米底金线圆徽章”的独立图片文件时，才需要继续找这一包。

### 3. 可选补品牌源文件和高保真稿

这 7 份附件没有新的 Logo SVG/AI/Figma 源文件，也没有匹配页、出谋划策页的高保真画面，只有文字工单。当前 Logo 会继续使用已有正式 PNG；若要做无损多尺寸适配，请补 Logo 的 SVG/AI 原文件及页面高保真稿。

## 后续导入方式

仓库内 [`scripts/import-junshi-assets.mjs`](../scripts/import-junshi-assets.mjs) 会验证 109/451/763 三组计数、人物映射、PNG 尺寸和 SHA-256，再生成 D1 种子迁移。后续补图时应继续使用同一清单，不要手工改线上路径。

