# Resume material

## One-line Chinese

设计并实现需求澄清 Agent SpecLoop，将非结构化讨论转化为带来源追踪的需求、产品决策与验收标准，并支持高信息增益澄清和变更影响分析。

## Expanded Chinese

- 设计单 Agent 状态机，将会议、聊天和用户反馈转成 `证据 -> 问题 -> 决策 -> 需求 -> 验收标准` 可审计图谱。
- 实现冲突/缺失/假设检测和最多 5 个问题的信息增益排序，使用人工审批门防止模型在未确认假设上继续生成。
- 建立需求与 Given/When/Then 验收标准的 100% 来源覆盖校验，并支持新反馈对旧决策的 `at-risk` 影响分析。
- 构建无需 API Key 的确定性 Demo Reasoner、行为回归测试及 PRD/用户故事/GitHub Issue 导出。

## English

Designed and built SpecLoop, an evidence-driven requirements clarification agent that transforms unstructured discussions into traceable product decisions, requirements, and acceptance criteria, with high-information clarification and change-impact analysis.

