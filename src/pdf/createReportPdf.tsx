/* oxlint-disable react/only-export-components */
import { createRoot } from 'react-dom/client'
import { personas } from '../data/personas'
import type { AdvisorCoreModel, AdvisorDetailResponse } from '../data/advisorRoster'
import type { AdviceReport, ProblemAnalysis } from '../types'

export type PdfProgress = {
  stage: 'preparing' | 'rendering' | 'saving'
  current?: number
  total?: number
}

interface ModelAppendix {
  advisorName: string
  model: AdvisorCoreModel
}

const DEFAULT_ANALYSIS: ProblemAnalysis = {
  decisionGoal: '把模糊的两难选择改写为能够验证、比较和复盘的决策目标。',
  coreTension: '既要抓住行动窗口，也要避免在关键假设尚未验证时做出过度投入。',
  constraints: ['时间、资金与注意力都有限。', '现有信息仍缺少真实场景反馈。', '部分选择具有路径依赖。'],
  assumptions: ['当前焦点确实是决定成败的核心变量。', '真实行为会与口头反馈基本一致。', '小规模实验可以暴露主要风险。'],
  successCriteria: ['获得足以改变判断的真实证据。', '明确继续、调整与停止的阈值。', '行动后仍保留必要的选择空间。'],
}

const DEFAULT_CONSENSUS = ['先明确目标与底线，再讨论具体方案。', '优先验证最关键且最不确定的假设。', '用可逆的小步行动换取现实证据。']
const DEFAULT_DISAGREEMENTS = ['行动窗口是否紧迫，决定验证节奏。', '能够承受的最大损失，需要由你明确。', '短期结果与长期价值的权重仍需取舍。']
const DEFAULT_RISKS = ['不要把一次偶然反馈直接外推为长期结论。', '警惕沉没成本和确认偏误推动继续投入。', '涉及专业问题时应交由合格人士复核。']

export async function downloadReportPdf(report: AdviceReport, onProgress?: (progress: PdfProgress) => void) {
  onProgress?.({ stage: 'preparing' })
  const [{ default: html2canvas }, { jsPDF }, models] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
    loadModelAppendices(report),
  ])

  const host = document.createElement('div')
  host.className = 'pdf-export-host'
  host.setAttribute('aria-hidden', 'true')
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    root.render(<PdfBook report={report} models={models} />)
    await nextPaint()
    await document.fonts.ready
    await waitForImages(host)

    const sheets = Array.from(host.querySelectorAll<HTMLElement>('.pdf-sheet'))
    if (sheets.length === 0) throw new Error('PDF_PAGE_EMPTY')

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    pdf.setProperties({
      title: report.title,
      subject: '军师天团 · 完整锦囊',
      author: '军师天团',
      creator: '军师天团',
    })
    for (let index = 0; index < sheets.length; index += 1) {
      onProgress?.({ stage: 'rendering', current: index + 1, total: sheets.length })
      const isModelPage = sheets[index].querySelector('.pdf-model-page') !== null
      const imageData = await renderSheetAsJpeg(html2canvas, sheets[index], isModelPage)
      if (index > 0) pdf.addPage('a4', 'portrait')
      pdf.addImage(imageData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
      await yieldToBrowser()
    }

    onProgress?.({ stage: 'saving' })
    const blob = pdf.output('blob')
    if (blob.size === 0) throw new Error('PDF_FILE_EMPTY')
    saveBlob(blob, `军师天团-完整锦囊-${safeFilename(report.title)}.pdf`)
  } finally {
    root.unmount()
    host.remove()
  }
}

async function renderSheetAsJpeg(
  html2canvas: typeof import('html2canvas').default,
  sheet: HTMLElement,
  isModelPage: boolean,
) {
  try {
    return await renderSheetAtScale(html2canvas, sheet, 1.8, isModelPage ? 0.96 : 0.92)
  } catch (reason) {
    console.warn('PDF page render retried in low-memory mode', reason)
    await yieldToBrowser()
    return renderSheetAtScale(html2canvas, sheet, 1.25, 0.9)
  }
}

async function renderSheetAtScale(
  html2canvas: typeof import('html2canvas').default,
  sheet: HTMLElement,
  scale: number,
  quality: number,
) {
  const canvas = await html2canvas(sheet, {
    backgroundColor: '#f7f1e5',
    scale,
    useCORS: true,
    logging: false,
    imageTimeout: 20_000,
    width: 794,
    height: 1123,
  })
  try {
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
    if (blob.size === 0) throw new Error('PDF_PAGE_IMAGE_EMPTY')
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    canvas.width = 1
    canvas.height = 1
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PDF_PAGE_ENCODING_FAILED'))
    }, type, quality)
  })
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

async function yieldToBrowser() {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
}

async function loadModelAppendices(report: AdviceReport): Promise<ModelAppendix[]> {
  const results = await Promise.all(report.perspectives.map(async (perspective) => {
    const persona = personas.find((item) => item.id === perspective.personaId)
    const advisorId = persona?.advisorId ?? perspective.personaId
    try {
      const response = await fetch(`/api/advisors/${encodeURIComponent(advisorId)}`)
      if (!response.ok) return null
      const payload = await response.json() as AdvisorDetailResponse
      const models = payload.data.core_models
      const model = models.find((item) => item.name === perspective.modelName) ?? models[0]
      return model ? { advisorName: perspective.personaName, model } : null
    } catch {
      return null
    }
  }))
  return results.filter((item): item is ModelAppendix => item !== null)
}

function PdfBook({ report, models }: { report: AdviceReport; models: ModelAppendix[] }) {
  const analysis = report.deepAnalysis ?? DEFAULT_ANALYSIS
  const consensus = report.consensus?.length ? report.consensus : DEFAULT_CONSENSUS
  const disagreements = report.disagreements?.length ? report.disagreements : DEFAULT_DISAGREEMENTS
  const risks = report.risks?.length ? report.risks : DEFAULT_RISKS
  const synthesisNumber = String(3 + report.perspectives.length).padStart(2, '0')
  const optionsNumber = String(4 + report.perspectives.length).padStart(2, '0')
  const actionNumber = String(5 + report.perspectives.length).padStart(2, '0')
  const pages = [
    <CoverPage key="cover" report={report} />,
    <ProblemPage key="problem" report={report} analysis={analysis} />,
    <AnalysisPage key="analysis" analysis={analysis} />,
    ...report.perspectives.map((perspective, index) => (
      <PerspectivePage key={`${perspective.personaId}-${index}`} report={report} index={index} />
    )),
    <SynthesisPage key="synthesis" report={report} consensus={consensus} disagreements={disagreements} number={synthesisNumber} />,
    <OptionsPage key="options" report={report} number={optionsNumber} />,
    <ActionPage key="actions" report={report} risks={risks} number={actionNumber} />,
    ...models.map((model, index) => <ModelPage key={`${model.advisorName}-${model.model.name}-${index}`} item={model} />),
  ]

  return (
    <div className="pdf-book">
      {pages.map((content, index) => (
        <section className={`pdf-sheet ${index === 0 ? 'pdf-sheet--cover' : ''}`} key={index}>
          {index > 0 && <PdfHeader />}
          <div className="pdf-sheet__body">{content}</div>
          <PdfFooter page={index + 1} total={pages.length} reportId={report.id} />
        </section>
      ))}
    </div>
  )
}

function CoverPage({ report }: { report: AdviceReport }) {
  return (
    <div className="pdf-cover-page">
      <div className="pdf-cover-brand"><img src="/brand/logo.png" alt="" /><span><b>军师天团</b><small>多元思维决策室</small></span></div>
      <div className="pdf-cover-kicker">完整锦囊 · 系统决策方案</div>
      <h1>{report.title}</h1>
      <p className="pdf-cover-question">{shorten(report.question, 180)}</p>
      <div className="pdf-cover-rule" />
      <div className="pdf-cover-advisors">
        <small>本次会诊军师</small>
        <strong>{report.perspectives.map((item) => item.personaName).join(' · ')}</strong>
      </div>
      <div className="pdf-cover-meta">
        <span>{formatDate(report.createdAt)}</span>
        <span>{report.mode === 'ai' ? 'AI 综合生成' : report.mode === 'safety' ? '安全提示' : '基础分析模式'}</span>
      </div>
      <div className="pdf-cover-seal" aria-hidden="true"><b>策</b><small>集智成案</small></div>
    </div>
  )
}

function ProblemPage({ report, analysis }: { report: AdviceReport; analysis: ProblemAnalysis }) {
  return (
    <div>
      <SectionHeading number="01" eyebrow="定义问题" title="先看清真正需要决定的是什么" />
      <ContentLabel>用户原始问题</ContentLabel>
      <blockquote className="pdf-question-block">“{report.question}”</blockquote>
      <ContentLabel>核心诊断</ContentLabel>
      <p className="pdf-lead">{report.diagnosis}</p>
      <div className="pdf-two-column pdf-problem-focus">
        <InfoCard title="决策目标" text={analysis.decisionGoal} />
        <InfoCard title="核心矛盾" text={analysis.coreTension} accent />
      </div>
    </div>
  )
}

function AnalysisPage({ analysis }: { analysis: ProblemAnalysis }) {
  return (
    <div>
      <SectionHeading number="02" eyebrow="深度剖析" title="把混乱拆成可以检查的部分" />
      <ListPanel index="A" title="关键约束" intro="哪些边界决定了方案不能只谈理想状态" items={analysis.constraints} />
      <ListPanel index="B" title="隐含假设" intro="哪些尚未验证的判断正在左右选择" items={analysis.assumptions} />
      <ListPanel index="C" title="成功标准" intro="用什么证据判断应该继续、调整或停止" items={analysis.successCriteria} />
    </div>
  )
}

function PerspectivePage({ report, index }: { report: AdviceReport; index: number }) {
  const item = report.perspectives[index]
  const persona = personas.find((candidate) => candidate.id === item.personaId)
  return (
    <div>
      <SectionHeading number={String(index + 3).padStart(2, '0')} eyebrow="军师分策" title={`${item.personaName}的解决思路`} />
      <div className="pdf-advisor-intro">
        <img src={`/advisors/avatars/${persona?.advisorId ?? item.personaId}.png`} alt="" />
        <div><small>{persona?.era ?? '军师视角'} · {persona?.role ?? '决策方法'}</small><h2>{item.headline}</h2></div>
      </div>
      {item.modelName && <p className="pdf-model-tag">本次采用 · {item.modelName}</p>}
      <ContentLabel>策略分析</ContentLabel>
      <p className="pdf-perspective-analysis">{item.analysis}</p>
      <div className="pdf-thinking-path">
        <div><small>看问题</small><p>{persona?.lens ?? '从不同视角重新审视问题的目标、约束和代价。'}</p></div>
        <span>→</span>
        <div><small>转化为行动</small><p>把这一视角转化为可验证的下一步，并预先定义证据和停止条件。</p></div>
      </div>
      <ContentLabel>留给你的关键追问</ContentLabel>
      <blockquote className="pdf-challenge">“{item.question}”</blockquote>
    </div>
  )
}

function SynthesisPage({ report, consensus, disagreements, number }: { report: AdviceReport; consensus: string[]; disagreements: string[]; number: string }) {
  return (
    <div>
      <SectionHeading number={number} eyebrow="综合判断" title="在共识与分歧之间形成主线" />
      <p className="pdf-lead pdf-synthesis">{report.synthesis}</p>
      <div className="pdf-two-column pdf-judgement-grid">
        <ListPanel index="同" title="军师共识" intro="可以直接进入方案的共同判断" items={consensus} compact />
        <ListPanel index="异" title="关键分歧" intro="仍需你根据现实条件作出的取舍" items={disagreements} compact accent />
      </div>
    </div>
  )
}

function OptionsPage({ report, number }: { report: AdviceReport; number: string }) {
  return (
    <div>
      <SectionHeading number={number} eyebrow="路径比较" title="三条可选路径，不急着替你选答案" />
      <div className="pdf-option-list">
        {report.options.map((option, index) => (
          <article key={option.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div className="pdf-option-main"><h3>{option.title}</h3><p><b>潜在收益</b>{option.upside}</p></div>
            <div className="pdf-option-side"><p><b>主要风险</b>{option.risk}</p><p><b>第一步</b>{option.firstStep}</p></div>
          </article>
        ))}
      </div>
      <p className="pdf-note">选择路径时，优先比较可逆性、机会成本以及最坏结果是否可承受，而不是只比较想象中的最好结果。</p>
    </div>
  )
}

function ActionPage({ report, risks, number }: { report: AdviceReport; risks: string[]; number: string }) {
  return (
    <div>
      <SectionHeading number={number} eyebrow="落地执行" title="未来七天，把判断变成证据" />
      <div className="pdf-action-list">
        {report.actions.map((action, index) => <div key={action}><b>{index + 1}</b><p>{action}</p></div>)}
      </div>
      <ListPanel index="!" title="风险与复核" intro="执行过程中不要忽略的边界" items={risks} accent />
      <aside className="pdf-disclaimer"><b>使用说明</b><p>{report.disclaimer}</p></aside>
    </div>
  )
}

function ModelPage({ item }: { item: ModelAppendix }) {
  return (
    <div className="pdf-model-page">
      <SectionHeading number="附" eyebrow="思维模型图谱" title={`${item.advisorName} · ${item.model.name}`} />
      <div className="pdf-model-image"><img src={item.model.strategy_card_image} alt={`${item.advisorName}的${item.model.name}完整思维模型卡片`} /></div>
    </div>
  )
}

function PdfHeader() {
  return <header className="pdf-page-header"><span>军师天团 · 完整锦囊</span><b>集古今智慧 解眼前难题</b></header>
}

function PdfFooter({ page, total, reportId }: { page: number; total: number; reportId: string }) {
  return <footer className="pdf-page-footer"><span>本方案用于辅助思考，不替代独立判断</span><b>{String(page).padStart(2, '0')} / {String(total).padStart(2, '0')}</b><small>{reportId.slice(0, 8).toUpperCase()}</small></footer>
}

function SectionHeading({ number, eyebrow, title }: { number: string; eyebrow: string; title: string }) {
  return <header className="pdf-section-heading"><span>{number}</span><div><small>{eyebrow}</small><h1>{title}</h1></div></header>
}

function ContentLabel({ children }: { children: string }) {
  return <div className="pdf-content-label">{children}</div>
}

function InfoCard({ title, text, accent = false }: { title: string; text: string; accent?: boolean }) {
  return <article className={`pdf-info-card ${accent ? 'is-accent' : ''}`}><small>{title}</small><p>{text}</p></article>
}

function ListPanel({ index, title, intro, items, compact = false, accent = false }: {
  index: string; title: string; intro: string; items: string[]; compact?: boolean; accent?: boolean
}) {
  return (
    <article className={`pdf-list-panel ${compact ? 'is-compact' : ''} ${accent ? 'is-accent' : ''}`}>
      <span>{index}</span>
      <div><h2>{title}</h2><small>{intro}</small><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>
    </article>
  )
}

function shorten(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-').slice(0, 48) || '决策方案'
}

async function nextPaint() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve()
    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }))
}
