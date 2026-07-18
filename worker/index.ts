import { personas } from '../src/data/personas.js'
import type { AdviceReport, DecisionOption, Perspective, ReportMode } from '../src/types.js'

const MAX_BODY_BYTES = 16_000
const MODEL = '@cf/qwen/qwen3-30b-a3b-fp8' as const
const personaMap = new Map(personas.map((persona) => [persona.id, persona]))

const emergencyPattern = /自杀|轻生|不想活|结束生命|伤害自己|割腕|胸痛|呼吸困难|中毒|大量出血|意识不清/
const harmfulPattern = /洗钱|逃税|规避法律责任|逃避监管|制作武器|投毒|绑架|勒索|入侵.*系统|窃取.*密码/
const professionalPattern = /诊断|药物|治疗|律师|诉讼|合同|股票|基金|投资|借贷|保险/

interface AdviceRequest {
  question?: unknown
  context?: unknown
  personaIds?: unknown
}

interface AiPayload {
  title?: unknown
  diagnosis?: unknown
  perspectives?: unknown
  synthesis?: unknown
  options?: unknown
  actions?: unknown
}

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true, service: 'junshi-tiantuan', time: new Date().toISOString() })
    }
    if (url.pathname === '/api/advice' && request.method === 'POST') {
      return handleAdvice(request, env)
    }
    if (url.pathname.startsWith('/api/')) return json({ error: '接口不存在。' }, 404)
    return new Response(null, { status: 404 })
  },
} satisfies ExportedHandler<Env>

async function handleAdvice(request: Request, env: Env): Promise<Response> {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      throw new HttpError(415, '请使用 JSON 格式提交。')
    }
    const payload = await readJsonBody(request) as AdviceRequest
    const question = normalizeText(payload.question, '问题', 800)
    const context = normalizeOptionalText(payload.context, '背景', 1200)
    const personaIds = normalizePersonaIds(payload.personaIds)

    if (emergencyPattern.test(question + context)) {
      const report = safetyReport(question, personaIds, 'emergency')
      logResult(requestId, 'safety', Date.now() - startedAt, personaIds.length)
      return json(report)
    }
    if (harmfulPattern.test(question + context)) {
      const report = safetyReport(question, personaIds, 'harmful')
      logResult(requestId, 'safety', Date.now() - startedAt, personaIds.length)
      return json(report)
    }

    let report: AdviceReport
    try {
      const aiPayload = await runCouncil(env.AI, question, context, personaIds)
      report = normalizeAiReport(aiPayload, question, personaIds, professionalPattern.test(question + context))
    } catch (error) {
      console.warn(JSON.stringify({ event: 'ai_fallback', requestId, error: error instanceof Error ? error.name : 'unknown' }))
      report = fallbackReport(question, personaIds, professionalPattern.test(question + context))
    }
    logResult(requestId, report.mode, Date.now() - startedAt, personaIds.length)
    return json(report)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof HttpError ? error.message : '服务暂时不可用，请稍后重试。'
    console.error(JSON.stringify({ event: 'request_error', requestId, status, durationMs: Date.now() - startedAt }))
    return json({ error: message }, status)
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) throw new HttpError(413, '提交内容过长。')
  if (!request.body) throw new HttpError(400, '提交内容为空。')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BODY_BYTES) {
      await reader.cancel()
      throw new HttpError(413, '提交内容过长。')
    }
    chunks.push(value)
  }
  const combined = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return JSON.parse(new TextDecoder().decode(combined))
  } catch {
    throw new HttpError(400, 'JSON 格式无效。')
  }
}

function normalizeText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${label}不能为空。`)
  const clean = value.trim()
  if (clean.length > maxLength) throw new HttpError(400, `${label}不能超过 ${maxLength} 个字符。`)
  return clean
}

function normalizeOptionalText(value: unknown, label: string, maxLength: number): string {
  if (value == null || value === '') return ''
  if (typeof value !== 'string') throw new HttpError(400, `${label}格式无效。`)
  const clean = value.trim()
  if (clean.length > maxLength) throw new HttpError(400, `${label}不能超过 ${maxLength} 个字符。`)
  return clean
}

function normalizePersonaIds(value: unknown): string[] {
  if (!Array.isArray(value)) throw new HttpError(400, '请选择 1–3 位军师。')
  const ids = [...new Set(value.filter((id): id is string => typeof id === 'string'))]
  if (ids.length < 1 || ids.length > 3 || ids.some((id) => !personaMap.has(id))) {
    throw new HttpError(400, '军师选择无效，请选择 1–3 位。')
  }
  return ids
}

async function runCouncil(ai: Ai, question: string, context: string, personaIds: string[]): Promise<AiPayload> {
  const council = personaIds.map((id) => {
    const persona = personaMap.get(id)!
    return `${persona.id}｜${persona.name}｜视角：${persona.lens}｜追问：${persona.challenge}｜语气：${persona.tone}`
  }).join('\n')
  const system = `你是一名严谨的中文决策分析助手。你引用人物公开的方法论，不扮演人物本人，不虚构名言、经历或事实。不同视角必须有真实分歧，先澄清目标和约束，再给出可验证行动。不要替用户做最终决定。对于医疗、法律、金融等高风险主题，明确建议咨询合格专业人士。只输出合法 JSON，不要 Markdown。`
  const prompt = `问题：${question}\n背景：${context || '未提供'}\n\n本次视角：\n${council}\n\n输出对象必须包含：title（短标题）、diagnosis（核心矛盾，80-180字）、perspectives（每位军师一项，字段 personaId/personaName/headline/analysis/question）、synthesis（综合判断，100-220字）、options（恰好3项，字段 title/upside/risk/firstStep）、actions（恰好3项、未来7天内可执行）。不要输出 disclaimer、id、时间。`

  const result = await ai.run(MODEL, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1800,
    temperature: 0.45,
  })
  const text = extractAiText(result)
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned) as AiPayload
}

function extractAiText(result: unknown): string {
  if (typeof result === 'string') return result
  if (!result || typeof result !== 'object') throw new Error('AI_EMPTY_RESULT')
  const value = result as Record<string, unknown>
  if (typeof value.response === 'string') return value.response
  if (typeof value.result === 'string') return value.result
  if (Array.isArray(value.choices)) {
    const first = value.choices[0] as { message?: { content?: unknown }; text?: unknown } | undefined
    if (typeof first?.message?.content === 'string') return first.message.content
    if (typeof first?.text === 'string') return first.text
  }
  throw new Error('AI_UNREADABLE_RESULT')
}

function normalizeAiReport(payload: AiPayload, question: string, personaIds: string[], professional: boolean): AdviceReport {
  const perspectives = normalizePerspectives(payload.perspectives, personaIds)
  const options = normalizeOptions(payload.options)
  const actions = normalizeStringArray(payload.actions, 3)
  return createReport({
    question,
    mode: 'ai',
    title: cleanAiString(payload.title, '你的决策简报'),
    diagnosis: cleanAiString(payload.diagnosis, '关键不是立刻做出选择，而是先厘清目标、约束和能够低成本验证的核心假设。'),
    perspectives,
    synthesis: cleanAiString(payload.synthesis, '先用一个可逆、低成本的行动收集真实反馈，再根据证据扩大投入。'),
    options,
    actions,
    disclaimer: disclaimer(professional),
  })
}

function normalizePerspectives(value: unknown, personaIds: string[]): Perspective[] {
  const rows = Array.isArray(value) ? value : []
  return personaIds.map((id, index) => {
    const persona = personaMap.get(id)!
    const row = rows[index] && typeof rows[index] === 'object' ? rows[index] as Record<string, unknown> : {}
    return {
      personaId: id,
      personaName: persona.name,
      headline: cleanAiString(row.headline, persona.role),
      analysis: cleanAiString(row.analysis, persona.lens),
      question: cleanAiString(row.question, persona.challenge),
    }
  })
}

function normalizeOptions(value: unknown): DecisionOption[] {
  const defaults = fallbackOptions()
  const rows = Array.isArray(value) ? value.slice(0, 3) : []
  return defaults.map((item, index) => {
    const row = rows[index] && typeof rows[index] === 'object' ? rows[index] as Record<string, unknown> : {}
    return {
      title: cleanAiString(row.title, item.title),
      upside: cleanAiString(row.upside, item.upside),
      risk: cleanAiString(row.risk, item.risk),
      firstStep: cleanAiString(row.firstStep, item.firstStep),
    }
  })
}

function normalizeStringArray(value: unknown, count: number): string[] {
  const defaults = fallbackActions()
  if (!Array.isArray(value)) return defaults
  const clean = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim().slice(0, 300))
  return [...clean, ...defaults].slice(0, count)
}

function cleanAiString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 800) : fallback
}

function fallbackReport(question: string, personaIds: string[], professional: boolean): AdviceReport {
  const perspectives = personaIds.map((id) => {
    const persona = personaMap.get(id)!
    return { personaId: id, personaName: persona.name, headline: persona.role, analysis: persona.lens, question: persona.challenge }
  })
  return createReport({
    question,
    mode: 'fallback',
    title: '先把选择变成可以验证的假设',
    diagnosis: '当前信息还不足以支持一次不可逆的决定。真正需要澄清的是：你想获得什么结果、最不能承受什么代价，以及哪项关键假设可以用最小成本得到真实反馈。',
    perspectives,
    synthesis: '这些视角的共同点不是要求你立刻选边，而是缩小不确定性。先把大问题拆成一个可逆实验，写清成功与停止标准；获得现实证据后，再决定是否增加投入。',
    options: fallbackOptions(),
    actions: fallbackActions(),
    disclaimer: disclaimer(professional),
  })
}

function safetyReport(question: string, personaIds: string[], kind: 'emergency' | 'harmful'): AdviceReport {
  const emergency = kind === 'emergency'
  return createReport({
    question,
    mode: 'safety',
    title: emergency ? '请先处理眼前的安全风险' : '换一种安全、合法的解决路径',
    diagnosis: emergency
      ? '你描述的情况可能涉及紧急的人身或健康风险，此时不适合继续做一般性的决策分析。请优先获得现实中的即时帮助。'
      : '这个问题可能涉及伤害他人、违法规避或严重安全风险。系统不会提供实施方法，但可以帮助你寻找合法、降低伤害的替代方案。',
    perspectives: personaIds.map((id) => {
      const persona = personaMap.get(id)!
      return { personaId: id, personaName: persona.name, headline: '先守住不可突破的底线', analysis: emergency ? '暂停独自处理，尽快让现实中的专业人员或可信赖的人介入。' : '把目标改写为合法合规且不伤害他人的结果，再讨论可行路径。', question: emergency ? '谁能在十分钟内来到你身边或与你通话？' : '你真正想实现的合法结果是什么？' }
    }),
    synthesis: emergency
      ? '如果存在立即危险，请联系当地紧急服务；在中国大陆可拨打 120（急救）或 110（报警）。也请立刻联系身边可信赖的人，不要独处。'
      : '停止任何可能造成伤害或违法的行动，保留必要记录，并向合格的法律、合规或安全专业人士说明真实情况。',
    options: emergency ? [
      { title: '立即求助', upside: '最快获得现场支持', risk: '等待会放大风险', firstStep: '拨打当地紧急电话并清楚说明位置与状况' },
      { title: '联系身边的人', upside: '避免独自面对风险', risk: '对方可能不了解严重程度', firstStep: '明确说“我现在需要你陪着我”' },
      { title: '前往专业机构', upside: '获得面对面评估', risk: '路途中仍需有人陪同', firstStep: '请可信赖的人陪同前往急诊或安全地点' },
    ] : fallbackOptions(),
    actions: emergency
      ? ['现在联系紧急服务或可信赖的人。', '离开危险物品和不安全环境，不要独处。', '把位置、症状和已经发生的事情如实告诉专业人员。']
      : ['暂停可能违法或伤害他人的操作。', '写下你真正想实现的合法目标。', '向合格的法律、合规或安全专业人士咨询。'],
    disclaimer: emergency ? '本页不能替代紧急服务或专业医疗帮助。' : '本工具不提供违法、规避监管或伤害他人的操作指导。',
  })
}

function fallbackOptions(): DecisionOption[] {
  return [
    { title: '小步验证', upside: '成本低、能尽快获得真实反馈', risk: '短期结果不一定代表长期趋势', firstStep: '设计一个 7 天内能完成的最小实验' },
    { title: '补齐信息', upside: '降低关键盲区和误判', risk: '容易以研究之名拖延行动', firstStep: '只列出三条会改变决定的信息并逐一验证' },
    { title: '保留现状', upside: '维持稳定并争取准备时间', risk: '机会成本会被忽略', firstStep: '设定明确复盘日期和触发改变的指标' },
  ]
}

function fallbackActions(): string[] {
  return ['写下目标、底线和最担心的失败情形。', '找一位利益无关的人挑战你的核心假设。', '完成一次低成本验证，并在第 7 天按证据复盘。']
}

function disclaimer(professional: boolean): string {
  return professional
    ? '本报告用于辅助思考，不构成医疗诊断、法律意见或投资建议。做出重要决定前，请咨询具有相应资质的专业人士。'
    : '本报告基于有限信息生成，用于辅助思考，不代表人物本人意见，也不能替代你的独立判断。'
}

function createReport(input: Omit<AdviceReport, 'id' | 'createdAt'>): AdviceReport {
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...input }
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  })
}

function logResult(requestId: string, mode: ReportMode, durationMs: number, personaCount: number) {
  console.log(JSON.stringify({ event: 'advice_completed', requestId, mode, durationMs, personaCount }))
}
