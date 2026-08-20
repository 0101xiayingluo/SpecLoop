# Evaluation

## What is measured

- Conflict detection：是否找出明确相反的范围描述。
- Question efficiency：正式问题是否始终不超过 5。
- Trace coverage：需求与验收标准是否都链接原始证据。
- Change selectivity：新反馈是否挑战相关决策，同时不误伤无关决策。
- Export integrity：三种 Markdown 输出是否保留验收和证据引用。

## Current deterministic suite

`npm test` 覆盖冲突识别、缺失项问题模板、5 问上限、确定性排序、100% 来源覆盖、变更选择性、人工影响复核和三种导出格式。

`evals/cases.json` 包含 8 条正负 smoke fixtures：4 条明确冲突和 4 条同范围一致表达。当前规则在这个小型合成集上的 binary precision / recall 均为 100%。测试会直接计算这两个指标，防止修改规则后只报命中率而掩盖误报。

模型边界测试另外验证：

- 超过 5 个模型问题时只保留信息增益最高的 5 个。
- 模型引用不存在的 evidence ID 时拒绝整个模型结果。
- Provider 不可用时保留确定性 baseline，并留下 fallback 审计事件。

## Limits

这些测试验证产品契约和小型合成 smoke set，不代表自然语言理解的通用准确率。下一阶段需要扩展脱敏课程材料、公开 GitHub Issue 讨论和人工标注冲突集，并分别报告多标签 precision/recall、question utility、trace faithfulness 和人类修改率。CI 不调用付费模型，因此真实 Provider 的上游可用性和模型质量需要单独的受控评测。
