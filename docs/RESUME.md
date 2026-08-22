# Resume material

## One-line Chinese

设计并实现需求澄清 Agent SpecLoop，将非结构化讨论转化为带来源追踪的需求、产品决策与验收标准，并支持高信息增益澄清和变更影响分析。

## Expanded Chinese

- 设计证据驱动的需求澄清 Agent，将访谈、会议、聊天、反馈和 GitHub Issue 经清洗/切分/去重 pipeline 转成 `证据 -> 问题 -> 决策 -> 需求 -> 验收标准` 可审计图谱。
- 建立复杂度路由和自适应 1 / 3 / 5 问策略，按简单/复杂/高风险场景选择确定性、小/大模型路径；结合 JSON Schema、Zod、evidence allowlist、人工审批和确定性回退控制幻觉与越权。
- 构建覆盖冲突 precision/recall、grounding、trace faithfulness、问题效率、变更选择性及 Token/成本/延迟的六维评测；失败与人工修订经审核回流为回归样本，并交付 PRD/用户故事/GitHub Issue 导出及 CI/Pages/Render 链路。

## Metrics that can be defended

- 任何分析最多 5 个正式澄清问题，由状态和模型边界双重限制。
- 需求与验收标准在演示数据上的来源覆盖率为 100%。
- 8 条仓库内合成 smoke fixtures 的 binary precision / recall 为 100%；不得描述为开放域准确率。
- 无 API Key 可完成端到端演示，模型密钥只存在服务端环境变量。
- 成本来自 Responses usage 与部署时配置价格的估算；没有真实调用数据时不填写虚构成本或延迟。

## English

Designed and built SpecLoop, an evidence-driven requirements clarification agent that transforms unstructured discussions into traceable product decisions, requirements, and acceptance criteria, with high-information clarification and change-impact analysis.
