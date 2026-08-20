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

## Domain graph

核心节点为 `EvidenceFragment`、`UserProblem`、`ProductDecision`、`RequirementItem` 和 `AcceptanceCriterion`。关系包括 `reveals`、`supports`、`defines`、`verifies` 和 `challenges`。

## Reasoner boundary

- `src/core/reasoner.ts` 提供确定性 Demo Reasoner，保证无密钥演示和回归可复现。
- `server/agent-server.mjs` 调用 Responses API，并使用 JSON Schema 限制模型输出形状。
- `src/core/modelReasoner.ts` 再次执行 Zod 校验、证据 ID 白名单和问题数量截断。
- 模型不能直接写 UI、需求或状态机；它只能替换分析 findings 和澄清问题候选。
- 模型服务失败时，确定性结果保留，并记录 `model.analysis.fallback` 审计事件。

```text
material -> deterministic baseline -> optional model proposal
                                  -> schema + evidence validation
                                  -> state machine -> human decision
```

## Persistence and privacy

- 本地项目存储键：`specloop.project.v1`。
- 默认不向网络发送材料。
- 只有用户显式选择 Model 模式时，材料证据才发送到本地 `/api/reason` 服务。
- `OPENAI_API_KEY` 仅由 Node 进程读取，不写入浏览器存储或前端构建。
- PDF 与 DOCX 解析器按需加载，不增加首屏主包负担。
- 新建项目需要用户确认才会删除当前本地项目。
