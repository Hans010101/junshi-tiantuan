export interface AdvisorRosterEntry {
  id: string
  cardId?: string
  personId?: string
  name: string
  insight: string
  domainId: string
  domainName: string
  avatar?: string
  sourceStatus?: string
  knowledgeQcStatus?: string
}

export interface AdvisorApiItem {
  cardId: string
  personId: string
  name: string
  domainId: string
  domainName: string
  insight: string
  avatarUrl: string
  portraitUrl: string
  sourceStatus: string
  knowledgeQcStatus: string
}

export interface AdvisorApiResponse {
  data: AdvisorApiItem[]
  stats: {
    advisors: number
    portraits: number
    knowledgeQcPassed: number
    knowledgeQcPending: number
    strategyCardsMissing: number
  }
}

export interface AdvisorDomain {
  id: string
  seq: string
  name: string
  advisors: AdvisorRosterEntry[]
}

const avatarByName: Record<string, string> = {
  稻盛和夫: '/advisors/avatars/inamori.png',
  曾国藩: '/advisors/avatars/zengguofan.png',
  诸葛亮: '/advisors/avatars/zhugeliang.png',
  王阳明: '/advisors/avatars/wangyangming.png',
  苏格拉底: '/advisors/avatars/socrates.png',
  孙子: '/advisors/avatars/sunzi.png',
  居里夫人: '/advisors/avatars/curie.png',
  爱因斯坦: '/advisors/avatars/einstein.png',
  莎士比亚: '/advisors/avatars/shakespeare.png',
}

type RawAdvisor = readonly [name: string, insight: string]

const rawDomains: Array<{ id: string; seq: string; name: string; advisors: RawAdvisor[] }> = [
  { id: 'business', seq: '壹', name: '商业', advisors: [
    ['乔布斯', '至简 · 产品直觉'], ['克洛克', '标准化 · 连锁复制'], ['卡内基', '规模效应 · 成本为王'],
    ['卢作孚', '实业救国 · 组织动员'], ['大野耐一', '精益 · 消除浪费'], ['巴菲特', '能力圈 · 长期复利'],
    ['摩根', '资本整合 · 信用至上'], ['本田宗一郎', '现场主义 · 技术执念'], ['松下幸之助', '自来水哲学 · 人才为本'],
    ['格雷厄姆', '安全边际 · 价值锚点'], ['沃尔顿', '天天低价 · 倒逼效率'], ['洛克菲勒', '垂直整合 · 规模制胜'],
    ['王永庆', '追根究底 · 点滴管理'], ['盛田昭夫', '创造市场 · 全球品牌'], ['福特', '流水线 · 量产降本'],
    ['稻盛和夫', '敬天爱人 · 阿米巴'], ['芒格', '多元思维 · 逆向'], ['贝索斯', '长期主义 · 飞轮'],
    ['陈嘉庚', '实业报国 · 信用立身'], ['香奈儿', '减法美学 · 自我定义'],
  ]},
  { id: 'history', seq: '贰', name: '历史', advisors: [
    ['史怀哲', '敬畏生命 · 行胜于言'], ['司马迁', '秉笔直书 · 通古今之变'], ['弗兰克尔', '意义疗法 · 态度自由'],
    ['张骞', '凿空西域 · 以通促变'], ['徐霞客', '实地求证 · 以足证书'], ['曼德拉', '和解大于复仇'],
    ['曾国藩', '结硬寨 · 打呆仗'], ['沙克尔顿', '绝境领导 · 全员生还'], ['海伦·凯勒', '局限之内 · 仍有天地'],
    ['玄奘', '孤旅求真 · 译经传灯'], ['苏轼', '进退自如 · 苦中作乐'], ['范蠡', '三聚三散 · 急流勇退'],
    ['郑和', '远航经略 · 和而不征'], ['鉴真', '六渡不悔 · 愿力成事'],
  ]},
  { id: 'governance', seq: '叁', name: '治理', advisors: [
    ['丘吉尔', '至暗时刻 · 绝不投降'], ['伯里克利', '公民政治 · 以言服众'], ['俾斯麦', '现实政治 · 铁血平衡'],
    ['华盛顿', '权力自限 · 急流勇退'], ['商鞅', '立木为信 · 制度变法'], ['奥古斯都', '守成有度 · 制度奠基'],
    ['张居正', '考成法 · 一条鞭'], ['戴高乐', '独立自主 · 国格至上'], ['李世民', '纳谏用人 · 以史为镜'],
    ['林肯', '联合对手 · 团队制衡'], ['王安石', '变法图强 · 理财为先'], ['管仲', '仓廪实 · 而知礼节'],
    ['萨拉丁', '宽容制胜 · 以德服敌'], ['诸葛亮', '隆中对 · 谋定后动'],
  ]},
  { id: 'philosophy', seq: '肆', name: '哲学', advisors: [
    ['亚里士多德', '第一性原理 · 中道'], ['墨子', '兼爱非攻 · 实用理性'], ['孔子', '仁恕之道 · 因材施教'],
    ['孟子', '性善 · 养浩然之气'], ['庄子', '齐物逍遥 · 无用之用'], ['康德', '道德律令 · 理性边界'],
    ['朱熹', '格物致知 · 循序渐进'], ['柏拉图', '洞穴之喻 · 理念先行'], ['王阳明', '知行合一 · 致良知'],
    ['老子', '无为而治 · 柔弱胜刚'], ['苏格拉底', '诘问求真 · 自知无知'], ['荀子', '性恶 · 化性起伪'],
    ['韩非子', '法术势 · 不恃人善'], ['马可·奥勒留', '控制二分 · 内在堡垒'],
  ]},
  { id: 'strategy', seq: '伍', name: '战略', advisors: [
    ['亚历山大大帝', '兵贵神速 · 正面击穿'], ['克劳塞维茨', '战争迷雾 · 重心打击'], ['凯撒', '果决渡河 · 造势于先'],
    ['吴起', '内修文德 · 外治武备'], ['孙子', '先胜后战 · 庙算'], ['岳飞', '运用之妙 · 存乎一心'],
    ['戚继光', '练兵实纪 · 体系制胜'], ['拿破仑', '集中兵力 · 各个击破'], ['曹操', '乱世用人 · 唯才是举'],
    ['李靖', '奇正相生 · 出其不意'], ['毛奇', '任务式指挥 · 保留弹性'], ['汉尼拔', '借势设伏 · 以弱围强'],
    ['韩信', '背水一战 · 多多益善'],
  ]},
  { id: 'science', seq: '陆', name: '科学', advisors: [
    ['冯·诺依曼', '跨域建模 · 博弈思维'], ['图灵', '可计算性 · 机器思维'], ['孟德尔', '控制变量 · 耐心实验'],
    ['居里夫人', '极致严谨 · 十年一事'], ['法拉第', '动手实验 · 直觉图像'], ['爱因斯坦', '思想实验 · 追问常识'],
    ['牛顿', '公理化 · 巨人肩上'], ['玻尔', '互补原理 · 拥抱悖论'], ['费曼', '费曼学习法 · 由浅入深'],
    ['达·芬奇', '跨界观察 · 笔记思维'], ['达尔文', '渐变积累 · 物竞天择'], ['麦克斯韦', '数学统一 · 方程之美'],
  ]},
  { id: 'investing', seq: '柒', name: '投资', advisors: [
    ['凯恩斯', '选美博弈 · 动物精神'], ['利弗莫尔', '顺势而为 · 止损第一'], ['博格', '指数化 · 成本致胜'],
    ['彼得林奇', '身边选股 · 常识投资'], ['索罗斯', '反身性 · 押注失衡'], ['费雪', '成长股 · 闲聊调研'],
    ['达里奥', '原则 · 极度透明'], ['邓普顿', '极度悲观处 · 买入'],
  ]},
  { id: 'writing', seq: '捌', name: '创作', advisors: [
    ['奥威尔', '凝视真相 · 语言即政治'], ['托尔斯泰', '道德追问 · 史诗视角'], ['曹雪芹', '草蛇灰线 · 世情洞察'],
    ['海明威', '冰山理论 · 删到只剩真'], ['狄更斯', '底层视角 · 连载节奏'], ['莎士比亚', '人性洞察 · 悲喜同源'],
    ['雨果', '宏大悲悯 · 明暗对照'], ['马克·吐温', '幽默解构 · 讽刺见真'],
  ]},
  { id: 'innovation', seq: '玖', name: '创新', advisors: [
    ['恩格尔巴特', '增强智能 · 演示未来'], ['戈达德', '先算后飞 · 迭代试错'], ['爱迪生', '千次试错 · 系统发明'],
    ['特斯拉', '想象预演 · 系统思维'], ['迪士尼', '造梦工程 · 体验闭环'],
  ]},
  { id: 'exploration', seq: '拾', name: '探索', advisors: [
    ['哥伦布', '向未知下注 · 启航即答案'],
  ]},
]

export const advisorDomains: AdvisorDomain[] = rawDomains.map((domain) => ({
  id: domain.id,
  seq: domain.seq,
  name: domain.name,
  advisors: domain.advisors.map(([name, insight], index) => ({
    id: `${domain.id}-${String(index + 1).padStart(2, '0')}`,
    name,
    insight,
    domainId: domain.id,
    domainName: domain.name,
    avatar: avatarByName[name],
  })),
}))

export const allAdvisors = advisorDomains.flatMap((domain) => domain.advisors)
export const availableAvatarCount = allAdvisors.filter((advisor) => advisor.avatar).length
