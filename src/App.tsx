import { useEffect, useMemo, useState } from 'react'
import { AdvisorAvatar } from './components/AdvisorAvatar'
import { advisorDomains, allAdvisors, availableAvatarCount } from './data/advisorRoster'
import type { AdvisorApiResponse, AdvisorDetail, AdvisorDetailResponse, AdvisorRosterEntry } from './data/advisorRoster'
import { examples, personas, recommendPersonaIds } from './data/personas'
import type { AdviceReport } from './types'

type View = 'home' | 'council' | 'report' | 'roster' | 'history' | 'about'

const HISTORY_KEY = 'junshi-tiantuan-history-v1'

function readHistory(): AdviceReport[] {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    return Array.isArray(value) ? value.slice(0, 10) : []
  } catch {
    return []
  }
}

function App() {
  const [view, setView] = useState<View>('home')
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [report, setReport] = useState<AdviceReport | null>(null)
  const [history, setHistory] = useState<AdviceReport[]>(readHistory)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [view])

  function begin(nextQuestion = question) {
    const clean = nextQuestion.trim()
    if (!clean) {
      setError('先写下你真正想解决的问题。')
      return
    }
    setQuestion(clean)
    setSelected(recommendPersonaIds(clean))
    setError('')
    setView('council')
  }

  function togglePersona(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      if (current.length >= 3) return current
      return [...current, id]
    })
  }

  async function generateAdvice() {
    if (selected.length === 0) {
      setError('至少选择一位军师。')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, context, personaIds: selected }),
      })
      const data = (await response.json()) as AdviceReport & { error?: string }
      if (!response.ok) throw new Error(data.error || '生成失败，请稍后重试。')
      setReport(data)
      const nextHistory = [data, ...history.filter((item) => item.id !== data.id)].slice(0, 10)
      setHistory(nextHistory)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory))
      setView('report')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '网络开小差了，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  function openReport(item: AdviceReport) {
    setReport(item)
    setQuestion(item.question)
    setView('report')
  }

  function reset() {
    setQuestion('')
    setContext('')
    setSelected([])
    setReport(null)
    setError('')
    setView('home')
  }

  return (
    <div className="app-shell">
      <Header view={view} navigate={setView} reset={reset} />
      <main>
        {view === 'home' && (
          <Home
            question={question}
            setQuestion={setQuestion}
            begin={begin}
            error={error}
          />
        )}
        {view === 'council' && (
          <Council
            question={question}
            context={context}
            setContext={setContext}
            selected={selected}
            toggle={togglePersona}
            submit={generateAdvice}
            loading={loading}
            error={error}
          />
        )}
        {view === 'report' && report && <Report report={report} onAgain={reset} />}
        {view === 'roster' && <Roster />}
        {view === 'history' && (
          <History history={history} openReport={openReport} clear={() => {
            localStorage.removeItem(HISTORY_KEY)
            setHistory([])
          }} />
        )}
        {view === 'about' && <About />}
      </main>
      <MobileNav view={view} navigate={setView} />
      <footer>军师天团 · 多元思维辅助决策工具 · 内容仅供参考</footer>
    </div>
  )
}

function Header({ view, navigate, reset }: { view: View; navigate: (view: View) => void; reset: () => void }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={reset} aria-label="返回首页">
        <img className="brand-mark" src="/brand/logo.png" alt="" />
        <span><strong>军师天团</strong><small>你的多元思维决策室</small></span>
      </button>
      <nav aria-label="主导航">
        <button className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')}>首页</button>
        <button className={view === 'roster' ? 'active' : ''} onClick={() => navigate('roster')}>军师名录</button>
        <button className={view === 'history' ? 'active' : ''} onClick={() => navigate('history')}>我的报告</button>
        <button className={view === 'about' ? 'active' : ''} onClick={() => navigate('about')}>方法说明</button>
      </nav>
    </header>
  )
}

function Home({ question, setQuestion, begin, error }: {
  question: string; setQuestion: (value: string) => void; begin: (value?: string) => void; error: string
}) {
  function startConsultation() {
    if (question.trim()) {
      begin()
      return
    }
    const field = document.getElementById('question')
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => field?.focus(), 450)
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">不是替你决定，而是帮你想得更清楚</span>
          <h1>集古今智慧<em>解眼前难题</em></h1>
          <p>把一个难题交给不同思维模型：看战略、找盲点、拆假设，最后汇成一份可以马上行动的决策简报。</p>
          <div className="ask-card">
            <label htmlFor="question">此刻最困扰你的问题是什么？</label>
            <textarea
              id="question"
              value={question}
              maxLength={800}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="例如：我是否应该离开稳定工作，开始自己的项目？"
            />
            <div className="ask-actions">
              <span>{question.length}/800</span>
              <button className="primary" onClick={() => begin()}>召集军师 <span>→</span></button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>
          <div className="example-row">
            <span>试试：</span>
            {examples.map((example) => <button key={example} onClick={() => begin(example)}>{example}</button>)}
          </div>
        </div>
        <div className="council-visual" aria-label="九位思维模型顾问">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="center-seal" aria-label="棋局推演中">
            <img className="center-board-logo" src="/brand/logo.png" alt="" />
          </div>
          {personas.map((persona, index) => (
            <div className={`persona-dot dot-${index + 1}`} key={persona.id} title={persona.name}>
              <AdvisorAvatar personaId={persona.id} name={persona.name} size="sm" /><small>{persona.name}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><span>01</span><div><h2>一间真正有分歧的决策室</h2><p>不是九次相同回答，而是九种互相挑战的思考路径。</p></div></div>
        <div className="feature-grid">
          <article><b>审势</b><h3>先看局，再行动</h3><p>识别目标、约束、筹码和时机，避免用战术勤奋掩盖战略问题。</p></article>
          <article><b>破题</b><h3>拆开隐藏假设</h3><p>从反向思考、第一性原理和追问中，找到你尚未说出口的前提。</p></article>
          <article><b>落子</b><h3>形成下一步</h3><p>不止分析利弊，把结论压缩为可验证、可复盘的七日行动。</p></article>
        </div>
      </section>

      <section className="section-block process-block">
        <div className="section-heading"><span>02</span><div><h2>三步，把模糊困惑变成清晰判断</h2><p>你只负责讲清问题，军师天团负责组织视角、暴露分歧并收束结论。</p></div></div>
        <div className="process-grid">
          <article>
            <span className="process-index">01</span>
            <div className="process-mark" aria-hidden="true">问</div>
            <small>说清问题</small>
            <h3>写下真正的决策冲突</h3>
            <p>不需要整理成专业方案，只需说明你在犹豫什么、受什么限制、希望得到什么结果。</p>
            <strong>输入：问题与必要背景</strong>
          </article>
          <article>
            <span className="process-index">02</span>
            <div className="process-mark" aria-hidden="true">议</div>
            <small>组建军师团</small>
            <h3>匹配三位互补的军师</h3>
            <p>系统推荐不同立场的思维模型，你也可以亲自换人，避免所有观点都在迎合你的预设。</p>
            <strong>过程：独立判断与交叉质询</strong>
          </article>
          <article>
            <span className="process-index">03</span>
            <div className="process-mark" aria-hidden="true">策</div>
            <small>形成决策简报</small>
            <h3>把洞察压缩为下一步</h3>
            <p>保留共识，也保留分歧，最后整理成选项比较、风险盲区和可以立即执行的行动计划。</p>
            <strong>输出：一份结构化决策报告</strong>
          </article>
        </div>
        <div className="process-proof" aria-label="产品工作方式摘要">
          <div><b>109</b><span>位古今军师的方法论</span></div>
          <i aria-hidden="true">×</i>
          <div><b>3</b><span>位互补军师参与会诊</span></div>
          <i aria-hidden="true">→</i>
          <div><b>1</b><span>份可执行决策简报</span></div>
        </div>
      </section>

      <section className="section-block outcome-block">
        <div className="section-heading outcome-heading"><span>03</span><div><h2>得到方案，而不是一段聊天记录</h2><p>每次会诊都会沉淀为结构化简报，让你看见依据、分歧、风险与行动路径。</p></div></div>
        <div className="outcome-grid">
          <article className="report-demo" aria-label="决策简报示例">
            <header>
              <div><small>军师天团 · 决策简报</small><strong>示例报告</strong></div>
              <span>已生成</span>
            </header>
            <section className="report-demo-question">
              <small>问题焦点</small>
              <p>“我是否应该离开稳定工作，开始自己的项目？”</p>
            </section>
            <section className="report-demo-insight">
              <small>关键判断</small>
              <p>现在不必急着辞职。先用 30 天验证真实需求、付费意愿与自己的持续投入能力，再决定是否跨出单向门。</p>
            </section>
            <div className="report-demo-views">
              <div><b>势</b><span>保留现金流，先建立安全边际</span></div>
              <div><b>破</b><span>验证你追求的是机会，而非逃离现状</span></div>
              <div><b>策</b><span>用一次可收费的小实验代替空想</span></div>
            </div>
            <section className="report-demo-plan">
              <small>未来七日行动</small>
              <ol>
                <li>访谈 10 位目标用户</li>
                <li>做出一个可收费的最小方案</li>
                <li>设定继续、调整与停止的阈值</li>
              </ol>
            </section>
            <footer><span>三位军师共同会诊</span><b>审势 · 破题 · 落子</b></footer>
          </article>

          <div className="outcome-copy">
            <span className="eyebrow">一份报告，六层判断</span>
            <h3>让决定有据可循</h3>
            <p>好的决策工具不替你选择，而是把混乱拆成可以检查的部分。你可以保存报告、回看当时的判断，也可以在行动后重新复盘。</p>
            <ul>
              <li><b>关键洞察</b><span>先看清真正需要决定的是什么</span></li>
              <li><b>军师分歧</b><span>同时呈现支持、反对与条件性意见</span></li>
              <li><b>选项比较</b><span>比较收益、代价、可逆性与机会成本</span></li>
              <li><b>行动计划</b><span>把结论转化为未来七日的验证动作</span></li>
              <li><b>风险盲区</b><span>明确哪些判断仍需专业人士确认</span></li>
              <li><b>追问清单</b><span>留下下一轮思考最值得回答的问题</span></li>
            </ul>
            <button className="primary outcome-cta" onClick={startConsultation}>开始我的决策会诊 <span>→</span></button>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div><strong>隐私优先</strong><span>报告默认只保存在你的浏览器</span></div>
        <div><strong>观点透明</strong><span>人物仅代表公开方法论，不模拟本人</span></div>
        <div><strong>安全边界</strong><span>医疗、法律、金融等问题会明确提示风险</span></div>
      </section>
    </>
  )
}

function Council({ question, context, setContext, selected, toggle, submit, loading, error }: {
  question: string; context: string; setContext: (value: string) => void; selected: string[]
  toggle: (id: string) => void; submit: () => void; loading: boolean; error: string
}) {
  return (
    <section className="workspace">
      <div className="workspace-intro">
        <span className="eyebrow">第二步 · 组成你的智囊团</span>
        <h1>为这个问题选择 1–3 位军师</h1>
        <blockquote>“{question}”</blockquote>
        <label htmlFor="context">补充背景 <small>可选，不要填写姓名、电话等敏感信息</small></label>
        <textarea id="context" value={context} maxLength={1200} onChange={(event) => setContext(event.target.value)} placeholder="目标、时间、资源、已经尝试过什么……" />
      </div>
      <div className="persona-grid">
        {personas.map((persona) => {
          const checked = selected.includes(persona.id)
          return (
            <button key={persona.id} className={`persona-card ${checked ? 'selected' : ''}`} onClick={() => toggle(persona.id)} aria-pressed={checked}>
              <AdvisorAvatar personaId={persona.id} name={persona.name} size="md" />
              <span className="persona-content"><small>{persona.era} · {persona.role}</small><strong>{persona.name}</strong><p>{persona.lens}</p><i>{persona.challenge}</i></span>
              <span className="check">{checked ? '✓' : '+'}</span>
            </button>
          )
        })}
      </div>
      <div className="submit-bar">
        <div className="selected-stack">
          {selectedPersonasFallback(selected).map((persona) => <AdvisorAvatar key={persona.id} personaId={persona.id} name={persona.name} size="xs" decorative />)}
          <small>已选 {selected.length}/3 位</small>
        </div>
        <button className="primary" disabled={loading || selected.length === 0} onClick={submit}>{loading ? '军师正在会商…' : '开始会商 →'}</button>
      </div>
      {error && <p className="form-error centered" role="alert">{error}</p>}
    </section>
  )
}

function selectedPersonasFallback(selected: string[]) {
  return personas.filter((persona) => selected.includes(persona.id))
}

function Report({ report, onAgain }: { report: AdviceReport; onAgain: () => void }) {
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'working' | 'error'>('idle')
  const [pdfLabel, setPdfLabel] = useState('下载完整 PDF 锦囊')
  const copy = async () => {
    const text = [report.title, report.diagnosis, report.synthesis, ...report.actions.map((item, i) => `${i + 1}. ${item}`), report.disclaimer].join('\n\n')
    await navigator.clipboard.writeText(text)
  }
  const downloadPdf = async () => {
    if (pdfStatus === 'working') return
    setPdfStatus('working')
    setPdfLabel('正在整理完整锦囊…')
    try {
      const { downloadReportPdf } = await import('./pdf/createReportPdf')
      await downloadReportPdf(report, ({ stage, current, total }) => {
        if (stage === 'preparing') setPdfLabel('正在调取思维模型…')
        if (stage === 'rendering') setPdfLabel(`正在排版 ${current}/${total}`)
        if (stage === 'saving') setPdfLabel('正在生成下载文件…')
      })
      setPdfStatus('idle')
      setPdfLabel('再次下载完整 PDF')
    } catch (reason) {
      console.error('PDF export failed', reason)
      setPdfStatus('error')
      setPdfLabel('下载失败，点击重试')
    }
  }
  return (
    <article className="report-page">
      <header className="report-cover">
        <span className="eyebrow">军师会商 · 决策简报</span>
        <h1>{report.title}</h1>
        <p>{new Date(report.createdAt).toLocaleString('zh-CN')} · {report.mode === 'ai' ? 'AI 综合生成' : report.mode === 'safety' ? '安全提示' : '基础分析模式'}</p>
        <div className="report-actions">
          <button onClick={copy}>复制摘要</button>
          <button onClick={onAgain}>再问一题</button>
          <button className={`primary pdf-download ${pdfStatus === 'error' ? 'has-error' : ''}`} onClick={downloadPdf} disabled={pdfStatus === 'working'}>
            <span aria-hidden="true">↓</span>{pdfLabel}
          </button>
        </div>
      </header>
      <section className="report-section lead"><span>核心诊断</span><p>{report.diagnosis}</p></section>
      <section className="report-section">
        <div className="report-title"><span>01</span><h2>军师观点</h2></div>
        <div className="perspective-list">
          {report.perspectives.map((item) => (
            <div className="perspective" key={`${item.personaId}-${item.headline}`}>
              <AdvisorAvatar personaId={item.personaId} name={item.personaName} size="md" />
              <div><small>{item.personaName}</small><h3>{item.headline}</h3><p>{item.analysis}</p><blockquote>{item.question}</blockquote></div>
            </div>
          ))}
        </div>
      </section>
      <section className="report-section synthesis"><div className="report-title"><span>02</span><h2>综合判断</h2></div><p>{report.synthesis}</p></section>
      <section className="report-section">
        <div className="report-title"><span>03</span><h2>可选路径</h2></div>
        <div className="option-grid">{report.options.map((option) => <div key={option.title}><h3>{option.title}</h3><p><b>收益</b>{option.upside}</p><p><b>风险</b>{option.risk}</p><p><b>第一步</b>{option.firstStep}</p></div>)}</div>
      </section>
      <section className="report-section action-plan"><div className="report-title"><span>04</span><h2>未来 7 天行动</h2></div><ol>{report.actions.map((action) => <li key={action}>{action}</li>)}</ol></section>
      <aside className="disclaimer">{report.disclaimer}</aside>
    </article>
  )
}

function History({ history, openReport, clear }: { history: AdviceReport[]; openReport: (item: AdviceReport) => void; clear: () => void }) {
  return (
    <section className="simple-page">
      <span className="eyebrow">本机记录</span><h1>我的决策简报</h1><p>最多保留最近 10 份，仅存于当前浏览器。清除网站数据后无法恢复。</p>
      {history.length === 0 ? <div className="empty"><strong>还没有报告</strong><span>从一个真实问题开始，答案会保存在这里。</span></div> : (
        <><div className="history-list">{history.map((item) => <button key={item.id} onClick={() => openReport(item)}><small>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</small><strong>{item.title}</strong><span>{item.question}</span></button>)}</div><button className="text-button danger" onClick={clear}>清除本机记录</button></>
      )}
    </section>
  )
}

function formatAdvisorTitle(name: string, title: string) {
  let value = title.trim()
  if (value.startsWith(name)) value = value.slice(name.length).replace(/^[·・:：\s-]+/, '')
  return value.replace(/(?:思维)?框架卡\s*$/, '').trim()
}

function Roster() {
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState('all')
  const [advisors, setAdvisors] = useState<AdvisorRosterEntry[]>(allAdvisors)
  const [stats, setStats] = useState<AdvisorApiResponse['stats']>({
    advisors: allAdvisors.length,
    avatars: availableAvatarCount,
    portraits: availableAvatarCount,
    knowledgeQcPassed: 0,
    knowledgeQcPending: allAdvisors.length,
    strategyCardsAvailable: 545,
    strategyCardsMissing: 0,
  })
  const [detail, setDetail] = useState<AdvisorDetail | null>(null)
  const [detailState, setDetailState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [detailError, setDetailError] = useState('')
  const [previewModel, setPreviewModel] = useState<{ advisorName: string; name: string; image: string; originalImage: string } | null>(null)
  const [modelZoomed, setModelZoomed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/advisors', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('ADVISOR_API_FAILED')
        return response.json() as Promise<AdvisorApiResponse>
      })
      .then((payload) => {
        setAdvisors(payload.data.map((item) => ({
          id: item.cardId,
          cardId: item.cardId,
          personId: item.personId,
          name: item.name,
          insight: item.insight,
          domainId: item.domainId,
          domainName: item.domainName,
          avatar: item.avatarUrl,
          sourceStatus: item.sourceStatus,
          knowledgeQcStatus: item.knowledgeQcStatus,
        })))
        setStats(payload.stats)
      })
      .catch((reason) => {
        if ((reason as Error).name === 'AbortError') return
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!detail && detailState === 'idle' && !previewModel) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (previewModel) {
        setPreviewModel(null)
        setModelZoomed(false)
      }
      else closeDetail()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [detail, detailState, previewModel])

  function closeDetail() {
    setPreviewModel(null)
    setModelZoomed(false)
    setDetail(null)
    setDetailState('idle')
    setDetailError('')
  }

  async function openDetail(advisor: AdvisorRosterEntry) {
    const cardId = advisor.cardId ?? advisor.id
    setDetail(null)
    setDetailState('loading')
    setDetailError('')
    try {
      const response = await fetch(`/api/advisors/${encodeURIComponent(cardId)}`)
      const payload = await response.json() as AdvisorDetailResponse & { error?: string }
      if (!response.ok) throw new Error(payload.error || '军师详情暂时无法读取。')
      setDetail(payload.data)
      setDetailState('idle')
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : '军师详情暂时无法读取。')
      setDetailState('error')
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const visibleAdvisors = useMemo(() => advisors.filter((advisor) => {
    const matchesDomain = domain === 'all' || advisor.domainId === domain
    const matchesQuery = !normalizedQuery || advisor.name.toLowerCase().includes(normalizedQuery)
    return matchesDomain && matchesQuery
  }), [advisors, domain, normalizedQuery])

  return (
    <section className="roster-page">
      <header className="roster-hero">
        <span className="eyebrow">跨越古今 · 汇聚十大智慧领域</span>
        <h1>{stats.advisors} 位军师，<em>汇聚跨越古今的决策智慧</em></h1>
        <p>从孙子、亚里士多德到巴菲特、乔布斯，涵盖战略、商业、治理、哲学与科学等十大领域。把前人的洞见转化为今天可用的判断框架，帮你看清局势、校准选择、找到行动路径。</p>
        <div className="roster-stats">
          <div><strong>{stats.advisors}</strong><span>位古今中外军师</span></div>
          <div><strong>{advisorDomains.length}</strong><span>大核心智慧领域</span></div>
          <div><strong>{stats.strategyCardsAvailable}</strong><span>个实战思维模型</span></div>
        </div>
      </header>

      <div className="roster-tools">
        <label><span>搜索军师</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入军师姓名" /></label>
        <div className="domain-tabs" role="group" aria-label="按领域筛选">
          <button className={domain === 'all' ? 'active' : ''} onClick={() => setDomain('all')}>全部</button>
          {advisorDomains.map((item) => <button key={item.id} className={domain === item.id ? 'active' : ''} onClick={() => setDomain(item.id)}>{item.name}<small>{item.advisors.length}</small></button>)}
        </div>
      </div>

      <div className="advisor-roster-grid">
        {visibleAdvisors.map((advisor) => (
          <article className={`advisor-roster-card ${advisor.avatar ? 'has-asset' : 'missing-asset'}`} key={advisor.id}>
            <AdvisorAvatar name={advisor.name} src={advisor.avatar} size="lg" showMissingBadge />
            <div><h2>{advisor.name}</h2><p>{advisor.insight}</p><button className="advisor-detail-trigger" onClick={() => openDetail(advisor)}>查看思维模型</button></div>
          </article>
        ))}
      </div>

      {(detailState !== 'idle' || detail) && (
        <div className="advisor-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail() }}>
          <section className="advisor-detail-panel" role="dialog" aria-modal="true" aria-label={detail ? `${detail.name}军师详情` : '军师详情'}>
            <button className="advisor-detail-close" onClick={closeDetail} aria-label="关闭详情">×</button>
            {detailState === 'loading' && <div className="advisor-detail-message"><strong>正在调取军师档案</strong><span>同步读取思维模型与谋略图…</span></div>}
            {detailState === 'error' && <div className="advisor-detail-message"><strong>暂时无法打开</strong><span>{detailError}</span></div>}
            {detail && (
              <>
                <header className="advisor-detail-header">
                  <AdvisorAvatar name={detail.name} src={detail.avatar} size="lg" />
                  <div className="advisor-detail-copy"><span>{detail.domain} · {detail.era}</span><div className="advisor-detail-name-row"><h2>{detail.name}</h2><p>{formatAdvisorTitle(detail.name, detail.title)}</p></div></div>
                </header>
                <div className="advisor-model-heading"><span>核心方法</span><h3>思维模型与谋略图</h3></div>
                <div className="advisor-model-grid">
                  {detail.core_models.map((model, index) => (
                    <article key={`${model.name}-${index}`}>
                      <div className="advisor-model-copy"><small>{String(index + 1).padStart(2, '0')}</small><h4>{model.name}</h4><p>{model.definition}</p>{model.modern_transfer && <blockquote>{model.modern_transfer}</blockquote>}</div>
                      <button type="button" className="advisor-model-preview-trigger" onClick={() => { setPreviewModel({ advisorName: detail.name, name: model.name, image: model.strategy_card_core_image, originalImage: model.strategy_card_image }); setModelZoomed(false) }} aria-label={`查看${model.name}模型大图`}>
                        <img src={model.strategy_card_core_image} alt={`${detail.name}思维模型：${model.name}`} loading="lazy" />
                        <span>点击查看大图</span>
                      </button>
                    </article>
                  ))}
                </div>
                <div className="advisor-detail-columns">
                  <section><h3>决策原则</h3><ul>{detail.decision_principles.map((item) => <li key={item}>{item}</li>)}</ul></section>
                  <section><h3>使用盲区</h3><ul>{detail.blind_spots.map((item) => <li key={item}>{item}</li>)}</ul></section>
                </div>
                {detail.cases.length > 0 && <section className="advisor-case-list"><h3>相关案例</h3>{detail.cases.map((item) => <article key={item.case_id}><h4>{item.title_period}</h4><p>{item.key_judgment}</p><blockquote>{item.transferable_lesson}</blockquote></article>)}</section>}
              </>
            )}
          </section>
        </div>
      )}

      {previewModel && (
        <div className="model-lightbox" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setPreviewModel(null); setModelZoomed(false) } }}>
          <section role="dialog" aria-modal="true" aria-label={`${previewModel.name}模型大图`}>
            <header><div><small>{previewModel.advisorName} · 思维模型</small><h3>{previewModel.name}</h3></div><div className="model-lightbox-actions"><button type="button" className="model-lightbox-zoom" onClick={() => setModelZoomed((current) => !current)} aria-pressed={modelZoomed}>{modelZoomed ? '适合屏幕' : '原始尺寸'}</button><button type="button" className="model-lightbox-close" onClick={() => { setPreviewModel(null); setModelZoomed(false) }} aria-label="关闭模型大图">×</button></div></header>
            <div className={`model-lightbox-stage ${modelZoomed ? 'is-zoomed' : ''}`}><img src={previewModel.image} alt={`${previewModel.advisorName}思维模型大图：${previewModel.name}`} /></div>
            <div className="model-lightbox-footer"><p>{modelZoomed ? '当前为核心内容原始尺寸，可滑动查看细节' : '已隐藏模板信息，可切换原始尺寸查看细节'}</p><a href={previewModel.originalImage} download={`${previewModel.advisorName}-${previewModel.name}-思维模型卡.png`}>下载完整卡片</a></div>
          </section>
        </div>
      )}
    </section>
  )
}

function About() {
  return (
    <section className="simple-page prose">
      <span className="eyebrow">方法说明</span><h1>借方法，不扮演人物</h1>
      <p>“军师”是对公开思想、著作和管理方法的结构化引用。系统不会声称这些人物本人参与回答，也不追求模仿其私人身份。</p>
      <h2>它怎样工作</h2><p>你描述问题并选择视角；系统分别展开关键假设，再寻找观点之间的冲突与共识，最后给出路径、风险和短期行动。</p>
      <h2>它不适合什么</h2><p>它不是医疗诊断、法律意见、投资建议，也不能替代专业人士或紧急服务。遇到人身安全、急症或危机，请优先联系当地紧急服务和可信赖的人。</p>
      <h2>数据与开源</h2><p>当前版本不设账号，历史报告只存于本机浏览器；服务端不会建立用户档案。项目将以开源方式持续迭代。</p>
    </section>
  )
}

function MobileNav({ view, navigate }: { view: View; navigate: (view: View) => void }) {
  return <nav className="mobile-nav" aria-label="移动端导航"><button className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')}>问问题</button><button className={view === 'roster' ? 'active' : ''} onClick={() => navigate('roster')}>军师</button><button className={view === 'history' ? 'active' : ''} onClick={() => navigate('history')}>报告</button><button className={view === 'about' ? 'active' : ''} onClick={() => navigate('about')}>说明</button></nav>
}

export default App
