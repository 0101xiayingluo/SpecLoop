# Architecture

## Runtime

SpecLoop MVP 的产品界面是 React/TypeScript 应用，项目数据默认保存在 `localStorage`。领域层不依赖 React，可独立测试。可选 Node 服务将 OpenAI Responses API 隔离在服务端，浏览器从不接触 API Key。

## Single-agent state machine

```text
intake -> clarify -> draft -> trace -> review
            ^          |        |
            |----------|--------|
```

- `intake`：材料切片为带来源与行号的 evidence fragments。
- `clarify`：识别 findings，按 `severity × downstream impact` 排序问题。
- `draft`：基于证据和回答生成问题、决策、需求与验收标准。
- `trace`：验证来源覆盖率并可视化关系图。
- `review`：人工接受、修改、导出和添加新反馈。

状态守卫阻止没有证据进入澄清、未答完问题生成需求、以及没有来源的产物进入评审。

MVP 没有多 Agent 通信。所有可恢复状态都在 `SpecProject`：`stage` 控制流程，`analysisPlan` 保存路由信号和策略版本，`questions` 保存回答或早停结果，`failureCases` 保存待审核 bad case，`agentRuns` 保存真实模型运行指标，`audit` 保存状态变化。这样能直接回答每一步“谁写了什么”，而不是依赖不可回放的 Agent 对话。

## Domain graph

核心节点为 `EvidenceFragment`、`UserProblem`、`ProductDecision`、`RequirementItem` 和 `AcceptanceCriterion`。关系包括 `reveals`、`supports`、`defines`、`verifies` 和 `challenges`。

## Reasoner boundary

- `src/core/reasoner.ts` 提供确定性 Demo Reasoner，保证无密钥演示和回归可复现。
- `server/agent-server.mjs` 调用 Responses API，并使用 JSON Schema 限制模型输出形状。
- `src/core/modelReasoner.ts` 再次执行 Zod 校验、证据 ID 白名单和问题数量截断。
- 模型不能直接写 UI、需求或状态机；它只能替换分析 findings 和澄清问题候选。
- 模型服务失败时，确定性结果保留，并记录 `model.analysis.fallback` 审计事件。
- 每次 Provider 尝试生成 `AgentRun`：记录真实 usage、服务端与浏览器端延迟、模型、状态、request ID 和可配置价格下的成本估算。

## Routing, early stop, and review fields

`AnalysisPlan` 使用 `risk-floor-v2`，保存 `signals.{evidenceCount,conflicts,highSeverity,assumptions}`、`score`、`complexity`、`requestedTier`、`reviewTriggers` 和 `earlyStop`。

```text
score = 3 × conflicts + 2 × highSeverity + assumptions + 2(if evidenceCount >= 12)
high-risk = score >= 10 OR conflicts >= 2 OR highSeverity >= 3
complex   = score >= 5 OR highSeverity >= 1
simple    = otherwise
```

混淆矩阵、旧策略 replay 与发布门槛见 `docs/EVALUATION.md`。

- simple：`requestedTier=none`，1 问上限，走 deterministic baseline。
- complex：`requestedTier=small`，3 问上限；只要存在 high-severity finding 就触发人工复核。
- high-risk：`requestedTier=large`，5 问上限并强制人工复核。
- 每轮回答后，若已无未解决 conflict/high-severity finding，且剩余最高 `informationGain < 7`，记录 `skippedAt`、`skipReason` 和 `clarification.early-stopped`。

`ModelSelfAssessment.calibrationStatus` 固定为 `uncalibrated`，直到有 held-out 标注集验证校准度；模型自信度不能覆盖任何确定性 review trigger。

`src/core/modelPolicy.ts` 将模型能力边界编码为执行模式：simple 为 `deterministic`；complex 在 Provider、Schema 或 grounding/trace 硬门失败时为 `deterministic-review`；high-risk 在任一硬门失败时为 `manual-review`，全部通过时也只能是 `model-assisted-review`。模型降价只改变 `OPENAI_MODEL_SMALL/LARGE` 的映射，不自动改变权限边界。

```text
material -> deterministic baseline -> optional model proposal
                                  -> schema + evidence validation
                                  -> state machine -> human decision
```

## Agent observability

`server/agent-metrics.mjs` 将 Responses API 的 `input_tokens`、缓存输入、`output_tokens`、推理 Token 和总 Token 归一化。成本使用三项服务端环境变量计算，未配置价格时返回 `null`。浏览器只接收运行指标，不接收密钥或价格配置来源之外的服务端环境信息。

```text
browser request -> Node timer -> Responses API
                         |            |
                         |            +-> usage + request id
                         +-> server latency
browser response -> client latency -> AgentRun -> local project + Evaluation
```

`FailureCase` 通过 `workflowStage`、`rootCause`、`fingerprint`、`relatedRunId`、`evidenceIds`、`observed` 和 `expected` 定位 bad case。`relatedRunId` 可关联模型、request ID、Token、成本和延迟；人工接受前状态保持 `pending-review`。

`deterministic-review` 表示保留确定性 findings 供人确认，不把失败的模型提案写入项目；`manual-review` 表示高风险硬门失败后阻断自动推进，只向审核者展示证据索引和失败原因。两者都不是“静默 fallback”。

远程部署时，Node 服务使用 `HOST=0.0.0.0`，`VITE_AGENT_API_URL` 指向该服务，`ALLOWED_ORIGIN` 只允许指定前端源；本地同源运行不需要 CORS。

公共演示部署还在模型调用前执行四项服务端保护：Origin 校验、固定窗口每 IP 限流、全局并发上限和 Provider 超时。它们降低作品集演示的滥用和成本风险，但不替代生产系统的用户身份、持久化配额与预算告警。

## Product surfaces

- `Case study`：把问题、PM 决策、Agent 机制、已验证指标和下一轮验证放在同一作品集页面。
- `Guided demo`：一键生成可复现课程项目场景，并连接 Requirements、Trace、Review 和 Evaluation。
- `Agent control plane`：基于当前项目状态显示 Evidence index、Reasoner proposal、Grounding guard、Human gate 和 Change monitor。
- `LLM Agent observability`：只展示真实 Provider Agent Run；无调用时保持空状态，不注入演示 Token 或延迟。

## Persistence and privacy

- 本地项目存储键：`specloop.project.v1`。
- 默认不向网络发送材料。
- 只有用户显式选择 Model 模式时，材料证据才发送到本地 `/api/reason` 服务。
- `OPENAI_API_KEY` 仅由 Node 进程读取，不写入浏览器存储或前端构建。
- 模型请求使用 `store: false`；项目仍在本地持久化 Agent Run 指标和审计事件。
- PDF 与 DOCX 解析器按需加载，不增加首屏主包负担。
- 新建项目需要用户确认才会删除当前本地项目。
