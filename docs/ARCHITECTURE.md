# Architecture

## Runtime

SpecLoop MVP 是浏览器端 React/TypeScript 应用，所有项目数据保存在 `localStorage`。领域层不依赖 React，可以单独测试并在后续迁移到服务端。

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

`src/core/reasoner.ts` 当前实现确定性 Demo Reasoner。后续 LLM adapter 必须返回同一结构并通过相同守卫、追踪覆盖和评测，不允许模型直接写 UI 状态。

## Persistence and privacy

- 本地项目存储键：`specloop.project.v1`。
- 默认不向网络发送材料。
- PDF 与 DOCX 解析器按需加载，不增加首屏主包负担。
- 新建项目需要用户确认才会删除当前本地项目。

