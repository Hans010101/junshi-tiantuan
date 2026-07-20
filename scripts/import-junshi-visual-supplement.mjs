import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const EXPECTED = { advisors: 109, avatars: 109, portraits: 109, strategyDiagrams: 545, total: 763 }
const args = parseArgs(process.argv.slice(2))
for (const required of ['bundle', 'strategy-roots']) {
  if (!args[required]) throw new Error(`缺少 --${required} 参数`)
}

const projectRoot = resolve(import.meta.dirname, '..')
const bundleRoot = resolve(args.bundle)
const strategyRoots = args['strategy-roots'].split(',').map((item) => resolve(item.trim()))
const knowledgeRoot = join(projectRoot, 'data', 'knowledge')
const publicRoot = join(projectRoot, 'public', 'advisors')
const inventoryPath = join(bundleRoot, 'images', 'image_inventory.json')

const [inventory, idMap] = await Promise.all([
  readJson(inventoryPath),
  readJson(join(knowledgeRoot, 'id_map.json')),
])

assertCount('人物映射', idMap, EXPECTED.advisors)
assertCount('图片清单', inventory, EXPECTED.total)
await assertSameFile(join(bundleRoot, 'knowledge_base', 'advisors.json'), join(knowledgeRoot, 'advisors.json'))
await assertSameFile(join(bundleRoot, 'knowledge_base', 'cases.json'), join(knowledgeRoot, 'cases.json'))
await assertSameFile(join(bundleRoot, 'knowledge_base', 'id_map.json'), join(knowledgeRoot, 'id_map.json'))

const cardIds = new Set(idMap.map((item) => item.card_id))
const counts = countBy(inventory, (item) => item.type)
if (counts.avatar !== EXPECTED.avatars || counts.portrait !== EXPECTED.portraits || counts.strategy_diagram !== EXPECTED.strategyDiagrams) {
  throw new Error(`图片类型计数不符：${JSON.stringify(counts)}`)
}

const perAdvisor = new Map()
const sourceFiles = []
for (const item of inventory) {
  if (!cardIds.has(item.card_id)) throw new Error(`未知 card_id：${item.card_id}`)
  const current = perAdvisor.get(item.card_id) ?? { avatar: 0, portrait: 0, strategy: new Set() }
  if (item.type === 'avatar') current.avatar += 1
  else if (item.type === 'portrait') current.portrait += 1
  else if (item.type === 'strategy_diagram') current.strategy.add(item.model_index)
  else throw new Error(`未知图片类型：${item.type}`)
  perAdvisor.set(item.card_id, current)

  const source = await resolveSource(item)
  const bytes = await readFile(source)
  const dimensions = readPngDimensions(bytes)
  sourceFiles.push({ ...item, source, sha256: sha256(bytes), ...dimensions })
}

for (const item of idMap) {
  const countsForAdvisor = perAdvisor.get(item.card_id)
  const indices = [...(countsForAdvisor?.strategy ?? [])].sort((a, b) => a - b)
  if (countsForAdvisor?.avatar !== 1 || countsForAdvisor?.portrait !== 1 || indices.join(',') !== '1,2,3,4,5') {
    throw new Error(`${item.card_id} 的资源不是 1 头像 + 1 肖像 + 5 谋略图`)
  }
}

for (const item of sourceFiles) {
  const target = targetPath(item)
  await mkdir(resolve(target, '..'), { recursive: true })
  await copyFile(item.source, target)
}

await copyFile(inventoryPath, join(knowledgeRoot, 'canonical_image_inventory.json'))

const generatedAt = new Date().toISOString()
const audit = {
  generated_at: generatedAt,
  advisors: EXPECTED.advisors,
  assets: {
    avatars_available: counts.avatar,
    portraits_available: counts.portrait,
    strategy_diagrams_available: counts.strategy_diagram,
    total_available: sourceFiles.length,
    missing: 0,
  },
  knowledge_unchanged: true,
}
await writeFile(join(knowledgeRoot, 'supplement_audit.json'), `${JSON.stringify(audit, null, 2)}\n`)
await writeFile(join(projectRoot, 'migrations', '0003_complete_visual_assets.sql'), buildMigration(sourceFiles))
console.log(JSON.stringify(audit, null, 2))

async function resolveSource(item) {
  if (item.type === 'avatar' || item.type === 'portrait') {
    const path = join(bundleRoot, item.file)
    await readFile(path)
    return path
  }
  for (const root of strategyRoots) {
    const path = join(root, item.file)
    try {
      await readFile(path)
      return path
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  throw new Error(`缺少谋略图：${item.file}`)
}

function targetPath(item) {
  if (item.type === 'avatar') return join(publicRoot, 'avatars', `${item.card_id}.png`)
  if (item.type === 'portrait') return join(publicRoot, 'portraits', `${item.card_id}.png`)
  return join(publicRoot, 'strategy', item.card_id, `model-${item.model_index}.png`)
}

function assetUrl(item) {
  if (item.type === 'avatar') return `/advisors/avatars/${item.card_id}.png`
  if (item.type === 'portrait') return `/advisors/portraits/${item.card_id}.png`
  return `/advisors/strategy/${item.card_id}/model-${item.model_index}.png`
}

function buildMigration(items) {
  const lines = ['PRAGMA defer_foreign_keys = true;', '']
  const byAdvisor = new Map()
  for (const item of items) {
    const rows = byAdvisor.get(item.card_id) ?? []
    rows.push(item)
    byAdvisor.set(item.card_id, rows)
  }

  for (const [cardId, rows] of byAdvisor) {
    const avatar = rows.find((item) => item.type === 'avatar')
    const portrait = rows.find((item) => item.type === 'portrait')
    lines.push(`UPDATE advisors SET avatar_url = ${sql(assetUrl(avatar))}, portrait_url = ${sql(assetUrl(portrait))}, strategy_card_available = 5 WHERE card_id = ${sql(cardId)};`)
    lines.push(assetUpdate(avatar, 'thumb'))
    lines.push(assetUpdate(portrait, 'portrait'))
    for (const strategy of rows.filter((item) => item.type === 'strategy_diagram').sort((a, b) => a.model_index - b.model_index)) {
      lines.push(assetUpdate(strategy, 'strategy_card'))
    }
    lines.push('')
  }
  lines.push('PRAGMA optimize;', '')
  return lines.join('\n')
}

function assetUpdate(item, role) {
  const modelClause = role === 'strategy_card' ? ` AND model_name = ${sql(item.model)}` : ''
  return `UPDATE advisor_assets SET asset_url = ${sql(assetUrl(item))}, availability = 'available', checksum_sha256 = ${sql(item.sha256)}, width = ${item.width}, height = ${item.height} WHERE advisor_id = ${sql(item.card_id)} AND role = ${sql(role)}${modelClause};`
}

async function assertSameFile(source, current) {
  const [sourceBytes, currentBytes] = await Promise.all([readFile(source), readFile(current)])
  if (!sourceBytes.equals(currentBytes)) throw new Error(`知识数据发生变化，拒绝仅作为视觉补包导入：${source}`)
}

function readPngDimensions(bytes) {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error('文件不是有效 PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

function parseArgs(values) {
  const result = {}
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]?.replace(/^--/, '')
    const value = values[index + 1]
    if (!key || !value) throw new Error('参数必须使用 --name value 格式')
    result[key] = value
  }
  return result
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function assertCount(label, values, expected) {
  if (!Array.isArray(values) || values.length !== expected) throw new Error(`${label}数量应为 ${expected}，实际为 ${values?.length ?? '非数组'}`)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replaceAll("'", "''")}'`
}

function countBy(values, select) {
  return Object.fromEntries(values.reduce((map, item) => {
    const key = select(item)
    map.set(key, (map.get(key) ?? 0) + 1)
    return map
  }, new Map()))
}
