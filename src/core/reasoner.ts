import { nowIso, stableId } from './id'
import { transition } from './stateMachine'
import type {
  AcceptanceCriterion,
  ClarificationQuestion,
  EvidenceFragment,
  ImpactFinding,
  Priority,
  ProductDecision,
  RequirementIssue,
  RequirementItem,
  Severity,
  SourceMaterial,
  SpecProject,
  TraceEdge,
  UserProblem,
} from './types'

const MAX_QUESTIONS = 5

const assumptionPattern = /应该|大概|可能|也许|暂定|先假设|估计|最好|probably|maybe|assum/iu

const conflictRules = [
  {
    key: 'file-upload',
    title: '材料导入范围冲突',
    positive: /上传|文件|pdf|docx/iu,
    negative: /只支持粘贴|上传.{0,12}(下个|以后|暂不|不做)/iu,
  },
  {
    key: 'github-export',
    title: '导出范围冲突',
    positive: /github\s*issue|导出.{0,12}issue/iu,
    negative: /issue.{0,12}(暂时不做|不做)|只.{0,8}prd/iu,
  },
  {
    key: 'authentication',
    title: '访问控制冲突',
    positive: /登录|鉴权|账号|sign[ -]?in|auth/iu,
    negative: /无需登录|不.{0,4}登录|匿名|no auth/iu,
  },
  {
    key: 'realtime',
    title: '实时性要求冲突',
    positive: /实时|即时|real[ -]?time/iu,
    negative: /非实时|批量|定时|not real[ -]?time/iu,
  },
]

const missingDefinitions = [
  {
    key: 'failure-behavior',
    title: '失败处理未定义',
    description: '材料解析失败、内容为空或格式不支持时的可见行为尚未定义。',
    trigger: /上传|导入|材料|文件|paste|upload|import/iu,
    covered: /失败|错误|重试|不支持|为空|error|retry|unsupported|empty/iu,
    severity: 'high' as Severity,
  },
  {
    key: 'review-authority',
    title: '决策权限未定义',
    description: '尚未明确谁有权接受、修改或推翻 Agent 生成的产品决策。',
    trigger: /接受|修改|决策|需求|approve|decision|requirement/iu,
    covered: /产品经理.{0,10}(接受|批准|确认)|负责人|owner|approver/iu,
    severity: 'high' as Severity,
  },
  {
    key: 'data-retention',
    title: '数据保留边界未定义',
    description: '材料和项目记忆的保留周期、删除方式或数据边界尚未定义。',
    trigger: /保存|记忆|存储|浏览器本地|memory|storage|persist/iu,
    covered: /删除|清除|保留.{0,6}(天|周|月)|retention|delete/iu,
    severity: 'medium' as Severity,
  },
]

const questionByMissingKey: Record<string, Omit<ClarificationQuestion, 'id' | 'issueIds' | 'informationGain'>> = {
  'failure-behavior': {
    prompt: '材料无法解析时，首版应如何处理？',
    why: '这个选择会直接改变错误状态、重试流程和验收用例。',
    options: [
      { id: 'A', label: '保留材料并允许修正', value: '保留原始材料，标记失败原因，并允许用户修正或重试。' },
      { id: 'B', label: '阻止进入澄清流程', value: '解析成功前阻止进入澄清流程。' },
      { id: 'C', label: '跳过失败片段', value: '跳过失败片段并继续处理其余材料。' },
    ],
    recommendationId: 'A',
  },
  'review-authority': {
    prompt: '谁对需求和产品决策拥有最终接受权？',
    why: '这决定了状态模型、审计记录和哪些操作需要审批。',
    options: [
      { id: 'A', label: '单一项目负责人', value: '仅项目负责人可以最终接受或推翻决策。' },
      { id: 'B', label: '任意项目成员', value: '任意项目成员均可接受或修改决策。' },
      { id: 'C', label: 'Agent 自动接受', value: '低风险条目由 Agent 自动接受，高风险条目人工确认。' },
    ],
    recommendationId: 'A',
  },
  'data-retention': {
    prompt: '首版本地项目数据应如何删除？',
    why: '明确删除边界才能验收本地存储和隐私行为。',
    options: [
      { id: 'A', label: '显式整项目删除', value: '提供整项目删除操作，删除后不可在应用内恢复。' },
      { id: 'B', label: '关闭页面即删除', value: '关闭页面后自动删除全部项目数据。' },
      { id: 'C', label: '暂不提供删除', value: '首版不提供项目数据删除能力。' },
    ],
    recommendationId: 'A',
  },
}

function splitMaterial(source: SourceMaterial): EvidenceFragment[] {
  const fragments: EvidenceFragment[] = []
  const lines = source.content.replace(/\r\n/g, '\n').split('\n')
  lines.forEach((line, lineIndex) => {
    const trimmed = line.replace(/^\s*[-*#>]+\s*/, '').trim()
    if (!trimmed) return
    const sentences = trimmed.split(/(?<=[。！？!?；;])\s*/u).filter(Boolean)
    for (const sentence of sentences) {
      const quote = sentence.trim()
      if (quote.length < 4) continue
      fragments.push({
        id: stableId('ev', `${source.id}:${lineIndex + 1}:${quote}`),
        sourceId: source.id,
        quote,
        lineStart: lineIndex + 1,
        lineEnd: lineIndex + 1,
        signal: assumptionPattern.test(quote) ? 'assumption' : 'fact',
      })
    }
  })
  return fragments
}

function severityWeight(severity: Severity): number {
  return severity === 'high' ? 3 : severity === 'medium' ? 2 : 1
}

function detectIssues(evidence: EvidenceFragment[]): RequirementIssue[] {
  const issues: RequirementIssue[] = []
  const allText = evidence.map((item) => item.quote).join('\n')

  for (const rule of conflictRules) {
    const positive = evidence.find((item) => rule.positive.test(item.quote) && !rule.negative.test(item.quote))
    const negative = evidence.find((item) => rule.negative.test(item.quote))
    if (!positive || !negative || positive.id === negative.id) continue
    positive.signal = 'conflict'
    negative.signal = 'conflict'
    issues.push({
      id: stableId('issue', `${rule.key}:${positive.id}:${negative.id}`),
      kind: 'conflict',
      title: rule.title,
      description: `“${positive.quote}”与“${negative.quote}”不能同时作为首版约束。`,
      severity: 'high',
      evidenceIds: [positive.id, negative.id],
      resolved: false,
    })
  }

  for (const fragment of evidence.filter((item) => item.signal === 'assumption').slice(0, 3)) {
    issues.push({
      id: stableId('issue', `assumption:${fragment.id}`),
      kind: 'assumption',
      title: '未经验证的假设',
      description: `材料使用了不确定表达：“${fragment.quote}”`,
      severity: 'medium',
      evidenceIds: [fragment.id],
      resolved: false,
    })
  }

  for (const definition of missingDefinitions) {
    if (!definition.trigger.test(allText) || definition.covered.test(allText)) continue
    issues.push({
      id: stableId('issue', `missing:${definition.key}`),
      kind: 'missing',
      title: definition.title,
      description: definition.description,
      severity: definition.severity,
      evidenceIds: evidence.filter((item) => definition.trigger.test(item.quote)).slice(0, 2).map((item) => item.id),
      resolved: false,
    })
  }

  return issues
}

function trimQuote(value: string, max = 44): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

function buildQuestions(issues: RequirementIssue[], evidence: EvidenceFragment[]): ClarificationQuestion[] {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]))
  const candidates = issues.map((issue): ClarificationQuestion => {
    const informationGain = severityWeight(issue.severity) * (issue.kind === 'conflict' ? 4 : issue.kind === 'missing' ? 3 : 2)
    if (issue.kind === 'conflict') {
      const quotes = issue.evidenceIds.map((id) => evidenceById.get(id)?.quote).filter((quote): quote is string => Boolean(quote))
      return {
        id: stableId('question', issue.id),
        prompt: `${issue.title}应以哪项为准？`,
        why: '两项会导向不同的工作量和验收范围，必须先形成明确决策。',
        informationGain,
        issueIds: [issue.id],
        options: [
          { id: 'A', label: trimQuote(quotes[0] ?? '采用第一项'), value: quotes[0] ?? '采用第一项材料作为约束。' },
          { id: 'B', label: trimQuote(quotes[1] ?? '采用第二项'), value: quotes[1] ?? '采用第二项材料作为约束。' },
          { id: 'C', label: '拆分为分阶段交付', value: '首版采用较窄范围，并把另一项记录为下一阶段需求。' },
        ],
        recommendationId: 'C',
      }
    }

    if (issue.kind === 'missing') {
      const key = Object.keys(questionByMissingKey).find((candidate) => issue.id.includes(candidate))
      const template = key ? questionByMissingKey[key] : questionByMissingKey['review-authority']
      return {
        ...template,
        id: stableId('question', issue.id),
        issueIds: [issue.id],
        informationGain,
      }
    }

    const quote = evidenceById.get(issue.evidenceIds[0])?.quote ?? issue.description
    return {
      id: stableId('question', issue.id),
      prompt: `“${trimQuote(quote)}”是否应成为首版的约束？`,
      why: '把暂定想法当成已确认需求会造成错误承诺和无效验收。',
      informationGain,
      issueIds: [issue.id],
      options: [
        { id: 'A', label: '是，作为硬约束', value: '将该项作为首版必须满足的硬约束。' },
        { id: 'B', label: '否，仅记录为假设', value: '保留为待验证假设，不进入首版验收。' },
        { id: 'C', label: '移至后续版本', value: '从首版移除，记录为后续版本候选。' },
      ],
      recommendationId: 'B',
    }
  })

  return candidates
    .sort((left, right) => right.informationGain - left.informationGain || left.id.localeCompare(right.id))
    .slice(0, MAX_QUESTIONS)
}

function createSource(title: string, content: string, kind: SourceMaterial['kind']): SourceMaterial {
  const createdAt = nowIso()
  return {
    id: stableId('source', `${title}:${content}`),
    title,
    content,
    kind,
    createdAt,
  }
}

export function analyzeMaterial(project: SpecProject, title: string, content: string, kind: SourceMaterial['kind'] = 'paste'): SpecProject {
  const source = createSource(title, content, kind)
  const sources = [...project.sources, source]
  const evidence = sources.flatMap(splitMaterial)
  const issues = detectIssues(evidence)
  const questions = buildQuestions(issues, evidence)
  const at = nowIso()
  const analyzed: SpecProject = {
    ...project,
    name: project.name === 'Untitled specification' ? title : project.name,
    sources,
    evidence,
    issues,
    questions,
    currentQuestionIndex: 0,
    stage: 'intake',
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `analyze:${source.id}:${at}`),
        at,
        action: 'material.analyzed',
        detail: `${evidence.length} evidence fragments, ${issues.length} issues, ${questions.length} questions`,
      },
    ],
  }
  return transition(analyzed, 'clarify')
}

export function answerQuestion(project: SpecProject, questionId: string, optionId: string, customAnswer?: string): SpecProject {
  const question = project.questions.find((item) => item.id === questionId)
  if (!question) throw new Error(`Unknown question: ${questionId}`)
  const option = question.options.find((item) => item.id === optionId)
  const answer = customAnswer?.trim() || option?.value
  const answerLabel = customAnswer?.trim() || option?.label
  if (!answer || !answerLabel) throw new Error('A valid clarification answer is required')
  const answeredAt = nowIso()
  const affectedIssueIds = new Set(question.issueIds)
  const evidenceIds = project.issues.filter((issue) => affectedIssueIds.has(issue.id)).flatMap((issue) => issue.evidenceIds)
  const decision: ProductDecision = {
    id: stableId('decision', `${question.id}:${answer}`),
    statement: answer,
    rationale: `回答澄清问题：${question.prompt}`,
    evidenceIds: [...new Set(evidenceIds)],
    questionId: question.id,
    status: 'accepted',
    revision: 1,
  }
  const questions = project.questions.map((item) =>
    item.id === questionId ? { ...item, answer, answerLabel, answeredAt } : item,
  )
  const firstUnanswered = questions.findIndex((item) => !item.answer)
  return {
    ...project,
    questions,
    issues: project.issues.map((issue) => affectedIssueIds.has(issue.id) ? { ...issue, resolved: true } : issue),
    decisions: [...project.decisions.filter((item) => item.questionId !== question.id), decision],
    currentQuestionIndex: firstUnanswered === -1 ? questions.length : firstUnanswered,
    updatedAt: answeredAt,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `answer:${question.id}:${answeredAt}`),
        at: answeredAt,
        action: 'clarification.answered',
        detail: `${question.prompt} -> ${answerLabel}`,
      },
    ],
  }
}

interface CapabilityTemplate {
  key: string
  title: string
  pattern: RegExp
  priority: Priority
  statement: string
  criterion: Omit<AcceptanceCriterion, 'id' | 'evidenceIds' | 'status'>
}

const capabilityTemplates: CapabilityTemplate[] = [
  {
    key: 'source-intake',
    title: '导入需求材料',
    pattern: /粘贴|上传|导入|材料|会议记录|聊天|反馈|pdf|docx|upload|import/iu,
    priority: 'P0',
    statement: '系统必须允许用户将非结构化讨论材料添加到一个需求项目，并保留材料原文。',
    criterion: { given: '用户位于材料导入页', when: '用户提交一份受支持的材料', then: '系统保存原文并展示已提取的证据片段' },
  },
  {
    key: 'clarification',
    title: '高信息增益澄清',
    pattern: /矛盾|冲突|澄清|问题|假设|缺失|只问|最多问|clarif|conflict|assumption/iu,
    priority: 'P0',
    statement: '系统必须优先识别会改变实现或验收的矛盾、缺失条件和假设，并一次只提出一个澄清问题。',
    criterion: { given: '材料包含至少一个高影响歧义', when: 'Agent 完成分析', then: '系统按信息增益排序问题，最多保留 5 个且当前只显示 1 个' },
  },
  {
    key: 'traceability',
    title: '端到端来源追踪',
    pattern: /追踪|回溯|原话|来源|证据|trace|source|evidence/iu,
    priority: 'P0',
    statement: '每条需求和验收标准必须能沿追踪关系回溯到至少一个原始证据片段。',
    criterion: { given: '系统已生成需求包', when: '用户打开任一需求或验收标准的来源', then: '系统展示对应原文、材料名称和行号' },
  },
  {
    key: 'acceptance',
    title: '可测试验收标准',
    pattern: /验收|given|when|then|可测试|acceptance|testable/iu,
    priority: 'P1',
    statement: '系统必须为每条需求生成至少一条可测试的 Given / When / Then 验收标准。',
    criterion: { given: '一条需求已生成', when: '系统检查需求完整性', then: '该需求至少包含一条非空的 Given、When 和 Then' },
  },
  {
    key: 'export',
    title: '导出可执行需求包',
    pattern: /导出|prd|用户故事|github\s*issue|export|user stor/iu,
    priority: 'P1',
    statement: '用户必须能够将已审核的需求导出为 PRD、用户故事或 GitHub Issue Markdown。',
    criterion: { given: '项目包含至少一条需求', when: '用户选择一种导出格式', then: '系统下载包含需求、验收标准和证据引用的 Markdown 文件' },
  },
  {
    key: 'change-impact',
    title: '反馈变更影响分析',
    pattern: /新增反馈|修改意见|失效|变更影响|旧决策|feedback|impact|invalidate/iu,
    priority: 'P1',
    statement: '新增反馈进入后，系统必须指出可能失效的既有决策和需求，并保留受影响关系。',
    criterion: { given: '项目已有已接受决策', when: '用户添加与既有范围相关的新反馈', then: '系统将相关决策标为 at-risk 并解释影响原因' },
  },
  {
    key: 'local-memory',
    title: '记住工作偏好',
    pattern: /记住|优先级|表达方式|风险|浏览器本地|偏好|memory|preference|local/iu,
    priority: 'P2',
    statement: '系统必须在本地项目中保存用户对优先级、表达方式和风险容忍度的修改。',
    criterion: { given: '用户修改了工作偏好', when: '用户重新打开该浏览器中的项目', then: '系统恢复最后保存的优先级、表达方式和风险容忍度' },
  },
]

function buildProblems(issues: RequirementIssue[], evidence: EvidenceFragment[]): UserProblem[] {
  const fromIssues = issues.map((issue) => ({
    id: stableId('problem', issue.id),
    statement: issue.kind === 'conflict' ? `团队对“${issue.title}”存在冲突，继续实现会造成范围错配。` : issue.description,
    evidenceIds: issue.evidenceIds,
    status: issue.resolved ? 'accepted' as const : 'proposed' as const,
  }))
  if (fromIssues.length > 0) return fromIssues
  const first = evidence[0]
  return first ? [{
    id: stableId('problem', first.id),
    statement: '零散讨论尚未形成可执行且可追溯的需求。',
    evidenceIds: [first.id],
    status: 'proposed',
  }] : []
}

function makeEdge(from: string, to: string, relation: TraceEdge['relation']): TraceEdge {
  return { id: stableId('edge', `${from}:${relation}:${to}`), from, to, relation }
}

export function synthesizeProject(project: SpecProject): SpecProject {
  if (project.stage !== 'clarify') throw new Error('Requirements can only be synthesized after clarification')
  if (project.questions.some((question) => !question.answer)) throw new Error('All queued clarification questions must be answered')

  const allText = project.evidence.map((item) => item.quote).join('\n')
  const problems = buildProblems(project.issues, project.evidence)
  const requirements: RequirementItem[] = []

  for (const template of capabilityTemplates) {
    const supporting = project.evidence.filter((fragment) => template.pattern.test(fragment.quote)).slice(0, 4)
    if (supporting.length === 0) continue
    const relatedProblems = problems.filter((problem) => problem.evidenceIds.some((id) => supporting.some((item) => item.id === id)))
    const relatedDecisions = project.decisions.filter((decision) => decision.evidenceIds.some((id) => supporting.some((item) => item.id === id)))
    const requirementId = stableId('req', `${project.id}:${template.key}`)
    const evidenceIds = supporting.map((item) => item.id)
    requirements.push({
      id: requirementId,
      title: template.title,
      statement: template.statement,
      priority: template.priority,
      status: 'proposed',
      problemIds: relatedProblems.map((item) => item.id),
      decisionIds: relatedDecisions.map((item) => item.id),
      evidenceIds,
      criteria: [{
        id: stableId('ac', `${requirementId}:1`),
        ...template.criterion,
        evidenceIds,
        status: 'proposed',
      }],
    })
  }

  if (requirements.length === 0 && allText.trim()) {
    project.evidence.slice(0, 3).forEach((fragment, index) => {
      const requirementId = stableId('req', `${project.id}:generic:${fragment.id}`)
      requirements.push({
        id: requirementId,
        title: `材料需求 ${index + 1}`,
        statement: `系统必须满足以下已记录约束：${fragment.quote}`,
        priority: index === 0 ? 'P1' : 'P2',
        status: 'proposed',
        problemIds: problems.filter((problem) => problem.evidenceIds.includes(fragment.id)).map((item) => item.id),
        decisionIds: project.decisions.filter((decision) => decision.evidenceIds.includes(fragment.id)).map((item) => item.id),
        evidenceIds: [fragment.id],
        criteria: [{
          id: stableId('ac', `${requirementId}:1`),
          given: '该需求已进入待验收状态',
          when: '用户执行对应核心流程',
          then: `系统产生可观察结果并满足“${fragment.quote}”`,
          evidenceIds: [fragment.id],
          status: 'proposed',
        }],
      })
    })
  }

  const edges: TraceEdge[] = []
  for (const problem of problems) {
    problem.evidenceIds.forEach((evidenceId) => edges.push(makeEdge(evidenceId, problem.id, 'reveals')))
  }
  for (const decision of project.decisions) {
    decision.evidenceIds.forEach((evidenceId) => edges.push(makeEdge(evidenceId, decision.id, 'supports')))
  }
  for (const requirement of requirements) {
    requirement.evidenceIds.forEach((evidenceId) => edges.push(makeEdge(evidenceId, requirement.id, 'supports')))
    requirement.problemIds.forEach((problemId) => edges.push(makeEdge(problemId, requirement.id, 'defines')))
    requirement.decisionIds.forEach((decisionId) => edges.push(makeEdge(decisionId, requirement.id, 'defines')))
    requirement.criteria.forEach((criterion) => edges.push(makeEdge(requirement.id, criterion.id, 'verifies')))
  }

  const at = nowIso()
  const synthesized = {
    ...project,
    problems,
    requirements,
    edges,
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `synthesize:${project.id}:${at}`),
        at,
        action: 'requirements.synthesized',
        detail: `${requirements.length} requirements with ${requirements.reduce((sum, item) => sum + item.criteria.length, 0)} acceptance criteria`,
      },
    ],
  }
  return transition(synthesized, 'draft')
}

function normalizedTokens(value: string): Set<string> {
  const words = value.toLowerCase().match(/[a-z0-9]{3,}|[\p{Script=Han}]{2,4}/gu) ?? []
  return new Set(words.filter((word) => !['系统', '用户', '必须', '需求', '首版', '可以', '需要'].includes(word)))
}

function overlapScore(left: string, right: string): number {
  const leftTokens = normalizedTokens(left)
  const rightTokens = normalizedTokens(right)
  let overlap = 0
  for (const token of leftTokens) if (rightTokens.has(token)) overlap += 1
  return overlap
}

export function addFeedback(project: SpecProject, title: string, content: string): SpecProject {
  const source = createSource(title, content, 'feedback')
  const feedbackEvidence = splitMaterial(source).map((item) => ({ ...item, signal: 'feedback' as const }))
  const impacts: ImpactFinding[] = []
  const feedbackText = feedbackEvidence.map((item) => item.quote).join(' ')
  const mandate = /必须|不能|改为|取消|不再|required|must|cannot|instead/iu.test(feedbackText)

  for (const decision of project.decisions) {
    const score = overlapScore(feedbackText, `${decision.statement} ${decision.rationale}`)
    const evidenceOverlap = decision.evidenceIds.some((id) => {
      const oldEvidence = project.evidence.find((item) => item.id === id)
      return oldEvidence ? overlapScore(feedbackText, oldEvidence.quote) > 0 : false
    })
    if (score === 0 && !evidenceOverlap) continue
    impacts.push({
      id: stableId('impact', `${source.id}:${decision.id}`),
      severity: mandate ? 'high' : 'medium',
      feedbackEvidenceIds: feedbackEvidence.map((item) => item.id),
      affectedNodeIds: [decision.id],
      explanation: `新反馈与决策“${decision.statement}”共享关键范围词，需重新确认该决策是否仍成立。`,
    })
  }

  for (const requirement of project.requirements) {
    const score = overlapScore(feedbackText, `${requirement.title} ${requirement.statement}`)
    if (score === 0) continue
    impacts.push({
      id: stableId('impact', `${source.id}:${requirement.id}`),
      severity: mandate ? 'high' : 'medium',
      feedbackEvidenceIds: feedbackEvidence.map((item) => item.id),
      affectedNodeIds: [requirement.id],
      explanation: `新反馈可能改变“${requirement.title}”的范围或验收条件。`,
    })
  }

  if (impacts.length === 0 && project.requirements.length > 0) {
    const fallback = project.requirements[0]
    impacts.push({
      id: stableId('impact', `${source.id}:${fallback.id}:unmatched`),
      severity: 'low',
      feedbackEvidenceIds: feedbackEvidence.map((item) => item.id),
      affectedNodeIds: [fallback.id],
      explanation: '未发现强语义重叠；该反馈需要人工归类后再决定是否修改现有需求。',
    })
  }

  const affectedIds = new Set(impacts.flatMap((impact) => impact.affectedNodeIds))
  const at = nowIso()
  const challengeEdges = impacts.flatMap((impact) => impact.feedbackEvidenceIds.flatMap((evidenceId) =>
    impact.affectedNodeIds.map((nodeId) => makeEdge(evidenceId, nodeId, 'challenges')),
  ))
  return {
    ...project,
    sources: [...project.sources, source],
    evidence: [...project.evidence, ...feedbackEvidence],
    decisions: project.decisions.map((item) => affectedIds.has(item.id) ? { ...item, status: 'at-risk' as const } : item),
    requirements: project.requirements.map((item) => affectedIds.has(item.id) ? { ...item, status: 'at-risk' as const } : item),
    impacts: [...impacts, ...project.impacts],
    edges: [...project.edges, ...challengeEdges],
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `feedback:${source.id}:${at}`),
        at,
        action: 'feedback.analyzed',
        detail: `${impacts.length} potentially affected nodes`,
      },
    ],
  }
}

