# Resume material

## One-line Chinese

设计并实现需求澄清 Agent SpecLoop，将非结构化讨论转化为带来源追踪的需求、产品决策与验收标准，并支持高信息增益澄清和变更影响分析。

## Expanded Chinese

- 设计单 Agent 状态机，将会议、聊天和用户反馈转成 `证据 -> 问题 -> 决策 -> 需求 -> 验收标准` 可审计图谱。
- 实现冲突/缺失/假设检测和最多 5 个问题的信息增益排序，使用人工审批门防止模型在未确认假设上继续生成。
- 建立需求与 Given/When/Then 验收标准的 100% 来源覆盖校验，并支持新反馈对旧决策的 `at-risk` 影响分析。
- 设计确定性 Demo Reasoner 与可选 Responses API 双模式：使用 JSON Schema、Zod 和 evidence ID 白名单约束模型输出，Provider 故障时自动回退并保留审计事件。
- 为真实模型调用建立 Agent Run 观测：记录输入/缓存/输出/推理 Token、成本估算、服务端与端到端延迟、状态和 request ID。
- 为公共模型端点加入来源校验、每 IP 限流、并发上限和超时控制，并提供 Docker/Render 与 GitHub Pages 分离部署。
- 构建 8 条正负冲突 smoke fixtures、33 项自动化测试、GitHub Actions CI/Pages 部署，以及 PRD/用户故事/GitHub Issue 导出。

## Metrics that can be defended

- 任何分析最多 5 个正式澄清问题，由状态和模型边界双重限制。
- 需求与验收标准在演示数据上的来源覆盖率为 100%。
- 8 条仓库内合成 smoke fixtures 的 binary precision / recall 为 100%；不得描述为开放域准确率。
- 无 API Key 可完成端到端演示，模型密钥只存在服务端环境变量。
- 成本来自 Responses usage 与部署时配置价格的估算；没有真实调用数据时不填写虚构成本或延迟。

## English

Designed and built SpecLoop, an evidence-driven requirements clarification agent that transforms unstructured discussions into traceable product decisions, requirements, and acceptance criteria, with high-information clarification and change-impact analysis.
