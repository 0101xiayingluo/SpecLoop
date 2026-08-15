# Evaluation

## What is measured

- Conflict detection：是否找出明确相反的范围描述。
- Question efficiency：正式问题是否始终不超过 5。
- Trace coverage：需求与验收标准是否都链接原始证据。
- Change selectivity：新反馈是否挑战相关决策，同时不误伤无关决策。
- Export integrity：三种 Markdown 输出是否保留验收和证据引用。

## Current deterministic suite

`npm test` 覆盖冲突识别、缺失项问题模板、5 问上限、确定性排序、100% 来源覆盖、变更选择性和三种导出格式。

## Limits

这些测试验证产品契约和确定性 Demo Reasoner，不代表自然语言理解的通用准确率。接入 LLM 前需要扩展脱敏课程材料、公开 GitHub Issue 讨论和人工标注冲突集，并分别报告 precision、recall、question utility 与 trace faithfulness。

