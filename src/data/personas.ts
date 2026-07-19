export interface Persona {
  id: string
  advisorId?: string
  name: string
  shortName: string
  era: string
  role: string
  domains: string[]
  lens: string
  challenge: string
  tone: string
}
export const personas: Persona[] = [
  {
    id: 'sunzi', advisorId: 'sunzi', name: '孙子', shortName: '孙', era: '先秦', role: '战略与竞争',
    domains: ['战略', '博弈', '资源配置'], lens: '先判断胜算、地形与代价，再决定是否出手。',
    challenge: '这场仗必须现在打吗？', tone: '审势、克制、重视全局',
  },
  {
    id: 'munger', advisorId: 'munger', name: '查理·芒格', shortName: '芒', era: '现代', role: '多元思维模型',
    domains: ['决策', '投资', '风险'], lens: '反过来想，识别激励、偏见与不可逆风险。',
    challenge: '怎样做会把事情彻底搞砸？', tone: '理性、直接、反直觉',
  },
  {
    id: 'drucker', name: '彼得·德鲁克', shortName: '德', era: '现代', role: '管理与组织',
    domains: ['管理', '组织', '职业'], lens: '先确认有效目标，再安排责任、反馈和资源。',
    challenge: '真正应该创造的成果是什么？', tone: '务实、清晰、以成果为中心',
  },
  {
    id: 'jobs', advisorId: 'jobs', name: '史蒂夫·乔布斯', shortName: '乔', era: '现代', role: '产品与创新',
    domains: ['产品', '品牌', '创新'], lens: '删掉噪音，聚焦真正重要且体验完整的少数事情。',
    challenge: '如果只能做好一件事，那是什么？', tone: '极简、聚焦、用户体验优先',
  },
  {
    id: 'bezos', advisorId: 'bezos', name: '杰夫·贝索斯', shortName: '贝', era: '现代', role: '长期主义与增长',
    domains: ['增长', '商业', '长期主义'], lens: '区分可逆与不可逆决策，从长期不变需求倒推。',
    challenge: '十年后仍然不会改变的是什么？', tone: '长期、实验、客户导向',
  },
  {
    id: 'zeng', advisorId: 'zengguofan', name: '曾国藩', shortName: '曾', era: '晚清', role: '组织与修身',
    domains: ['领导力', '团队', '自我管理'], lens: '结硬寨、打呆仗，用日拱一卒替代急功近利。',
    challenge: '哪一步笨功夫最不能省？', tone: '稳健、耐心、强调执行',
  },
  {
    id: 'wang', advisorId: 'wangyangming', name: '王阳明', shortName: '王', era: '明代', role: '知行合一',
    domains: ['行动', '心态', '人生选择'], lens: '觉察真实动机，让认知在当下行动中接受检验。',
    challenge: '你已经知道却迟迟没做的是什么？', tone: '内省、坚定、知行合一',
  },
  {
    id: 'socrates', advisorId: 'socrates', name: '苏格拉底', shortName: '苏', era: '古希腊', role: '追问与澄清',
    domains: ['思考', '沟通', '价值判断'], lens: '持续追问定义、证据和假设，暴露问题中的矛盾。',
    challenge: '你确信的这件事，证据是什么？', tone: '追问、澄清、开放',
  },
  {
    id: 'musk', name: '埃隆·马斯克', shortName: '马', era: '现代', role: '第一性原理',
    domains: ['工程', '创业', '效率'], lens: '拆到物理或事实底层，重算成本和可行边界。',
    challenge: '如果不接受行业惯例，最小真相是什么？', tone: '大胆、工程化、追求数量级改善',
  },
]

export const examples = [
  '要不要辞职创业？我该怎样验证风险？',
  '团队执行力下降，我应该先解决什么？',
  '新产品有三个方向，怎样做取舍？',
]

const matchingRules: Array<[RegExp, string[]]> = [
  [/创业|产品|用户|创新|品牌/, ['jobs', 'musk', 'bezos']],
  [/团队|管理|组织|员工|领导/, ['drucker', 'zeng', 'socrates']],
  [/竞争|战略|谈判|对手|资源/, ['sunzi', 'munger', 'bezos']],
  [/职业|辞职|选择|焦虑|人生/, ['wang', 'munger', 'socrates']],
  [/投资|风险|金钱|商业|增长/, ['munger', 'bezos', 'sunzi']],
]

export function recommendPersonaIds(question: string): string[] {
  for (const [pattern, ids] of matchingRules) {
    if (pattern.test(question)) return ids
  }
  return ['munger', 'socrates', 'drucker']
}
