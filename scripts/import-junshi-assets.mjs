import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

const EXPECTED = { advisors: 109, cases: 451, inventory: 763, portraits: 109, modelsPerAdvisor: 5 }
const DOMAIN_META = [
  ['business', '商业', '壹'],
  ['history', '历史', '贰'],
  ['governance', '治理', '叁'],
  ['philosophy', '哲学', '肆'],
  ['strategy', '战略', '伍'],
  ['science', '科学', '陆'],
  ['investing', '投资', '柒'],
  ['writing', '创作', '捌'],
  ['innovation', '创新', '玖'],
  ['exploration', '探索', '拾'],
]

const args = parseArgs(process.argv.slice(2))
for (const required of ['full', 'cards', 'portraits']) {
  if (!args[required]) throw new Error(`缺少 --${required} 参数`)
}

const projectRoot = resolve(import.meta.dirname, '..')
const fullRoot = resolve(args.full)
const cardsRoot = resolve(args.cards)
const portraitsRoot = resolve(args.portraits)
const knowledgeRoot = join(projectRoot, 'data', 'knowledge')
const publicPortraitRoot = join(projectRoot, 'public', 'advisors', 'portraits')
const migrationPath = join(projectRoot, 'migrations', '0002_seed_knowledge.sql')

const sourcePaths = {
  advisors: join(fullRoot, 'knowledge_base', 'advisors.json'),
  cases: join(fullRoot, 'knowledge_base', 'cases.json'),
  idMap: join(fullRoot, 'knowledge_base', 'id_map.json'),
  inventory: join(fullRoot, 'images', 'image_inventory.json'),
}

const [advisors, cases, idMap, inventory] = await Promise.all([
  readJson(sourcePaths.advisors),
  readJson(sourcePaths.cases),
  readJson(sourcePaths.idMap),
  readJson(sourcePaths.inventory),
])

assertCount('军师', advisors, EXPECTED.advisors)
assertCount('案例', cases, EXPECTED.cases)
assertCount('人物映射', idMap, EXPECTED.advisors)
assertCount('图片清单', inventory, EXPECTED.inventory)

const idByCard = new Map(idMap.map((item) => [item.card_id, item]))
const idByPerson = new Map(idMap.map((item) => [item.person_id, item]))
if (idByCard.size !== EXPECTED.advisors || idByPerson.size !== EXPECTED.advisors) {
  throw new Error('card_id 或 person_id 存在重复')
}

const sourceStatus = await readSourceStatuses(cardsRoot)
const portraitFiles = await findFiles(portraitsRoot, (name) => name.endsWith('.png'))
assertCount('终版肖像', portraitFiles, EXPECTED.portraits)

const portraitByPerson = new Map()
for (const path of portraitFiles) {
  const match = basename(path).match(/_(P-[A-Za-z0-9]+)\.png$/)
  if (!match) throw new Error(`无法从肖像文件名识别 person_id：${path}`)
  if (portraitByPerson.has(match[1])) throw new Error(`肖像 person_id 重复：${match[1]}`)
  portraitByPerson.set(match[1], path)
}

const missingPortraits = [...idByPerson.keys()].filter((id) => !portraitByPerson.has(id))
const missingStatuses = [...idByPerson.keys()].filter((id) => !sourceStatus.has(id))
if (missingPortraits.length || missingStatuses.length) {
  throw new Error(`交叉映射不完整：缺肖像 ${missingPortraits.join(', ') || '无'}；缺源卡状态 ${missingStatuses.join(', ') || '无'}`)
}

await mkdir(knowledgeRoot, { recursive: true })
await mkdir(publicPortraitRoot, { recursive: true })
await Promise.all([
  copyFile(sourcePaths.advisors, join(knowledgeRoot, 'advisors.json')),
  copyFile(sourcePaths.cases, join(knowledgeRoot, 'cases.json')),
  copyFile(sourcePaths.idMap, join(knowledgeRoot, 'id_map.json')),
  copyFile(sourcePaths.inventory, join(knowledgeRoot, 'image_inventory.json')),
])

const portraitMeta = new Map()
for (const item of idMap) {
  const source = portraitByPerson.get(item.person_id)
  const target = join(publicPortraitRoot, `${item.card_id}.png`)
  await copyFile(source, target)
  const bytes = await readFile(target)
  const dimensions = readPngDimensions(bytes)
  portraitMeta.set(item.card_id, {
    sourceFilename: basename(source),
    sha256: sha256(bytes),
    ...dimensions,
  })
}

const sourceStatusRows = idMap.map((item) => ({
  ...item,
  ...sourceStatus.get(item.person_id),
}))
await writeFile(join(knowledgeRoot, 'source_status.json'), `${JSON.stringify(sourceStatusRows, null, 2)}\n`)

const importedAt = new Date().toISOString()
const advisorRows = advisors.map((advisor, index) => {
  const map = idByCard.get(advisor.card_id)
  if (!map) throw new Error(`advisors.json 中存在未映射 card_id：${advisor.card_id}`)
  if (map.name !== advisor.name || map.domain !== advisor.domain) {
    throw new Error(`人物映射冲突：${advisor.card_id}`)
  }
  if (!Array.isArray(advisor.core_models) || advisor.core_models.length !== EXPECTED.modelsPerAdvisor) {
    throw new Error(`${advisor.card_id} 的 core_models 不是 5 项`)
  }
  const rawStatus = sourceStatus.get(map.person_id)
  const qcValues = Object.values(advisor.qc ?? {})
  const knowledgeQcStatus = qcValues.length > 0 && qcValues.every((value) => value === 'pass') ? 'pass' : 'pending'
  const portraitUrl = `/advisors/portraits/${advisor.card_id}.png`
  const profile = {
    ...advisor,
    person_id: map.person_id,
    avatar: portraitUrl,
    avatar_thumb: portraitUrl,
    asset_display_mode: 'portrait_crop',
    source_review_status: rawStatus.status,
    knowledge_qc_status: knowledgeQcStatus,
  }
  return {
    ...advisor,
    person_id: map.person_id,
    domain_id: domainId(advisor.domain),
    source_status: rawStatus.status,
    knowledge_qc_status: knowledgeQcStatus,
    insight: advisor.core_models.slice(0, 2).map((model) => model.name).join(' · '),
    avatar_url: portraitUrl,
    portrait_url: portraitUrl,
    profile,
    display_order: index + 1,
    imported_at: importedAt,
  }
})

const caseRows = cases.map((item) => {
  const advisorId = item.linked_cards?.[0]
  if (!advisorId || !idByCard.has(advisorId)) throw new Error(`案例 ${item.case_id} 缺少有效 linked_cards`)
  return { ...item, advisor_id: advisorId }
})

const assetRows = inventory.map((item) => {
  if (!idByCard.has(item.card_id)) throw new Error(`资源清单存在未知 card_id：${item.card_id}`)
  const portrait = portraitMeta.get(item.card_id)
  if (item.role === 'portrait') {
    return { ...item, asset_key: item.dest, asset_url: `/advisors/portraits/${item.card_id}.png`, availability: 'available', ...portrait }
  }
  if (item.role === 'thumb') {
    return { ...item, asset_key: item.dest, asset_url: `/advisors/portraits/${item.card_id}.png`, availability: 'derived_from_portrait', ...portrait }
  }
  return { ...item, asset_key: item.dest, asset_url: null, availability: 'missing', sha256: null, width: null, height: null }
})

const audit = buildAudit({ advisors: advisorRows, cases: caseRows, assets: assetRows, sourceStatusRows, importedAt })
await writeFile(join(knowledgeRoot, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`)
await writeFile(migrationPath, buildSeedSql({ advisors: advisorRows, cases: caseRows, assets: assetRows, importedAt }))

console.log(JSON.stringify(audit, null, 2))

function buildSeedSql({ advisors: rows, cases: caseItems, assets, importedAt: timestamp }) {
  const statements = ['PRAGMA defer_foreign_keys = true;', '']
  DOMAIN_META.forEach(([id, name, seq], index) => {
    statements.push(`INSERT INTO advisor_domains (domain_id, name, seq_label, display_order) VALUES (${sql(id)}, ${sql(name)}, ${sql(seq)}, ${index + 1});`)
  })
  statements.push('')
  for (const row of rows) {
    const profileJson = JSON.stringify(row.profile)
    statements.push(`INSERT INTO advisors (card_id, person_id, name, domain_id, title, era, language, bundle_status, source_status, knowledge_qc_status, living_status, material_type, insight, avatar_url, portrait_url, strategy_card_expected, strategy_card_available, profile_json, content_sha256, display_order, imported_at) VALUES (${[
      row.card_id, row.person_id, row.name, row.domain_id, row.title, row.era, row.language ?? 'zh-CN', row.status,
      row.source_status, row.knowledge_qc_status, row.living_status, row.material_type, row.insight, row.avatar_url,
      row.portrait_url, EXPECTED.modelsPerAdvisor, 0, profileJson, sha256(profileJson), row.display_order, timestamp,
    ].map(sql).join(', ')});`)
  }
  statements.push('')
  for (const item of caseItems) {
    const caseJson = JSON.stringify(item)
    statements.push(`INSERT INTO advisor_cases (case_id, advisor_id, title_period, dilemma_constraints, key_judgment, outcome, transferable_lesson, source_tier, historicity, status, case_json, content_sha256) VALUES (${[
      item.case_id, item.advisor_id, item.title_period, item.dilemma_constraints, item.key_judgment, item.outcome,
      item.transferable_lesson, item.source_tier, item.historicity, item.status, caseJson, sha256(caseJson),
    ].map(sql).join(', ')});`)
  }
  statements.push('')
  for (const item of assets) {
    statements.push(`INSERT INTO advisor_assets (asset_key, advisor_id, person_id, role, model_name, asset_url, expected_path, source_filename, availability, checksum_sha256, width, height) VALUES (${[
      item.asset_key, item.card_id, item.person_id, item.role, item.model, item.asset_url, item.cos_target,
      item.cos_source, item.availability, item.sha256, item.width, item.height,
    ].map(sql).join(', ')});`)
  }
  statements.push('', 'PRAGMA optimize;', '')
  return statements.join('\n')
}

function buildAudit({ advisors: rows, cases: caseItems, assets, sourceStatusRows, importedAt: timestamp }) {
  return {
    generated_at: timestamp,
    knowledge: {
      advisors: rows.length,
      cases: caseItems.length,
      core_models: rows.reduce((sum, item) => sum + item.core_models.length, 0),
      references: rows.reduce((sum, item) => sum + (item.references?.length ?? 0), 0),
      bundle_status: countBy(rows, (item) => item.status),
      source_status: countBy(sourceStatusRows, (item) => item.status),
      qc_status: countBy(rows, (item) => item.knowledge_qc_status),
      case_source_tier: countBy(caseItems, (item) => item.source_tier),
      case_historicity: countBy(caseItems, (item) => item.historicity),
    },
    assets: {
      inventory_total: assets.length,
      portraits_available: assets.filter((item) => item.role === 'portrait' && item.availability === 'available').length,
      thumbs_ready_made: 0,
      thumbs_derived_from_portrait: assets.filter((item) => item.role === 'thumb' && item.availability === 'derived_from_portrait').length,
      strategy_cards_available: assets.filter((item) => item.role === 'strategy_card' && item.availability === 'available').length,
      strategy_cards_missing: assets.filter((item) => item.role === 'strategy_card' && item.availability === 'missing').length,
    },
  }
}

async function readSourceStatuses(root) {
  const files = await findFiles(root, (name) => name.endsWith('.md'))
  assertCount('知识源卡', files, EXPECTED.advisors)
  const result = new Map()
  for (const path of files) {
    const text = await readFile(path, 'utf8')
    const personId = frontMatterValue(text, 'person_id')
    const status = frontMatterValue(text, 'status')
    const schemaVersion = frontMatterValue(text, 'schema_version')
    if (!personId || !status || !schemaVersion) throw new Error(`源卡元信息不完整：${path}`)
    if (result.has(personId)) throw new Error(`知识源卡 person_id 重复：${personId}`)
    result.set(personId, { source_file: basename(path), status, schema_version: schemaVersion })
  }
  return result
}

function frontMatterValue(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*([^#\\r\\n]+)`, 'm'))
  return match?.[1].trim() ?? ''
}

async function findFiles(root, predicate) {
  const result = []
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile() && predicate(entry.name)) result.push(path)
    }
  }
  await visit(root)
  return result.sort()
}

function readPngDimensions(bytes) {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error('文件不是有效 PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

function domainId(name) {
  const entry = DOMAIN_META.find(([, domainName]) => domainName === name)
  if (!entry) throw new Error(`未知领域：${name}`)
  return entry[0]
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
  if (typeof value === 'number') return String(value)
  return `'${String(value).replaceAll("'", "''")}'`
}

function countBy(values, select) {
  return Object.fromEntries([...values.reduce((map, item) => {
    const key = select(item) || 'unknown'
    map.set(key, (map.get(key) ?? 0) + 1)
    return map
  }, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b, 'zh-CN')))
}
