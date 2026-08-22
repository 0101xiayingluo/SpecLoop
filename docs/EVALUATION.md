# Evaluation

## What is measured

- Conflict precision / recall：是否找出明确相反的范围描述，同时控制误报。
- Grounding integrity：模型是否只引用 evidence allowlist 中的原文片段。
- Trace faithfulness：需求与验收标准是否都链接真实原始证据。
- Question efficiency：正式问题是否服从按复杂度分配的 1 / 3 / 5 预算。
- Change selectivity：新反馈是否挑战相关决策，同时不误伤无关决策。
- Latency / cost telemetry：Provider usage、成本估算、延迟、失败状态和 request ID 是否完整进入项目记录。

导出完整性继续作为产品契约测试，不与模型质量指标混成一个总分。界面将合成 fixture 结果、当前项目质量门和真实 Provider telemetry 分开呈现；没有真实调用时显示 `waiting`，不使用占位数值。

## Evidence and failure-case pipeline

材料进入系统时记录业务来源（用户访谈、会议、聊天、产品反馈、GitHub Issue、项目文档或行为日志）和采集方式（粘贴、上传、反馈流）。pipeline 统一完成文本清洗、句子切分、内容指纹去重和 source/line 绑定，重复材料保留登记但不重复进入推理。

Provider 失败、grounding/schema 拒绝和用户对生成需求的实质改写会成为 `pending-review` 样本。只有人工接受后才进入 regression asset 池；原始反馈不会自动训练或修改线上策略，避免把噪声、恶意输入和错误修订变成训练资产。

## Current deterministic suite

`npm test` 覆盖证据归一化/去重、来源元数据、冲突识别、复杂度路由、自适应问题预算、确定性排序、100% 来源覆盖、变更选择性、人工失败样本复核和三种导出格式。

`evals/cases.json` 包含 8 条正负 smoke fixtures：4 条明确冲突和 4 条同范围一致表达。当前规则在这个小型合成集上的 binary precision / recall 均为 100%。测试会直接计算这两个指标，防止修改规则后只报命中率而掩盖误报。

模型边界测试另外验证：

- 超过 5 个模型问题时只保留信息增益最高的 5 个。
- 模型引用不存在的 evidence ID 时拒绝整个模型结果。
- Provider 不可用时保留确定性 baseline，并留下 fallback 审计事件。
- Responses usage 能正确区分未缓存输入、缓存输入、输出和推理 Token，并按配置价格估算成本。
- 未配置价格时成本为 unknown，而不是误报为 0；上游失败 telemetry 可以进入 fallback 记录。

## Limits

这些测试验证产品契约和小型合成 smoke set，不代表自然语言理解的通用准确率。下一阶段需要扩展脱敏课程材料、公开 GitHub Issue 讨论和人工标注冲突集，并分别报告多标签 precision/recall、question utility、trace faithfulness 和人类修改率。CI 不调用付费模型，因此真实 Provider 的上游可用性、成本和模型质量需要带 API Key 的受控评测；界面只展示实际 Agent Run，不填充虚构数据。
