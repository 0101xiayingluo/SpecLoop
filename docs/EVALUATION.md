# Evaluation

## What is measured

- Conflict precision / recall：是否找出明确相反的范围描述，同时控制误报。
- Grounding integrity：模型是否只引用 evidence allowlist 中的原文片段。
- Trace faithfulness：每个生成的需求和验收标准是否至少链接一个当前项目中真实存在的 evidence ID，且所有引用均属于该项目；仅数组非空不计为覆盖。
- Question efficiency：`Σ informationGain(answered) / answeredCount`，同时报告已用预算与早停数；1 / 3 / 5 是上限而非固定轮数。
- Change selectivity：标注集用 precision `TP/(TP+FP)`、recall `TP/(TP+FN)` 和 collateral rate `FP/(FP+TN)`；实时项目没有 ground truth 时只展示影响范围，不冒充准确率。
- Latency / cost telemetry：Provider usage、成本估算、延迟、失败状态和 request ID 是否完整进入项目记录。

导出完整性继续作为产品契约测试，不与模型质量指标混成一个总分。界面将合成 fixture 结果、当前项目质量门和真实 Provider telemetry 分开呈现；没有真实调用时显示 `waiting`，不使用占位数值。

## Evidence and failure-case pipeline

材料进入系统时记录业务来源（用户访谈、会议、聊天、产品反馈、GitHub Issue、项目文档或行为日志）和采集方式（粘贴、上传、反馈流）。pipeline 统一完成文本清洗、句子切分、内容指纹去重和 source/line 绑定，重复材料保留登记但不重复进入推理。

Provider 失败、grounding/schema 拒绝和用户对生成需求的实质改写会成为 `pending-review` 样本。只有人工接受后才进入 regression asset 池；原始反馈不会自动训练或修改线上策略，避免把噪声、恶意输入和错误修订变成训练资产。

## Current deterministic suite

`npm test` 覆盖证据归一化/去重、来源元数据、冲突识别、复杂度路由、自适应问题预算、确定性排序、100% 来源覆盖、变更选择性、人工失败样本复核和三种导出格式。

`evals/cases.json` 包含 8 条正负 smoke fixtures：4 条明确冲突和 4 条同范围一致表达。当前规则在这个小型合成集上的 binary precision / recall 均为 100%。测试会直接计算这两个指标，防止修改规则后只报命中率而掩盖误报。

`evals/routing-cases.json` 包含 12 条人工标注的 simple / complex / high-risk 合成样本，每类 4 条。Evaluation 显示 3 × 3 混淆矩阵、总体 accuracy 和 per-class recall。`upload-failure-risk-floor-regression` 固化了一个可复现误判：旧阈值 replay 将 high-severity 上传失败缺失条件以 score 2 送入 simple，整组为 11/12；`risk-floor-v2` 增加 high-severity complex floor 后为 12/12。该数字不代表开放域路由准确率。

当前仓库共有 14 个测试文件、48 项自动化测试。2026-08-22 对同一提交执行 5 次独立本地回归运行，即 48 项测试 × 5 次，共 240/240 次测试执行通过，未观察到 flaky case；这不是 240 条独立样本，也不是长期 CI flake rate。语言评测数据合计 20 条合成 fixtures，不是线上样本规模。

`evals/repository-baseline.json` 将每个指标拆成 `baseline / current / releaseGate / evidence / status`。当前有数据的路由、冲突、追踪和回归稳定性显示实测结果；模型自评 recall 与实时经济性保持 `waiting`，直到有人工标注模型运行和已部署后端。没有等价任务与协议时，不引用行业 benchmark 做伪对标。

模型边界测试另外验证：

- 超过 5 个模型问题时只保留信息增益最高的 5 个。
- 模型引用不存在的 evidence ID 时拒绝整个模型结果。
- Provider 不可用时保留确定性 baseline，并留下 fallback 审计事件。
- Responses usage 能正确区分未缓存输入、缓存输入、输出和推理 Token，并按配置价格估算成本。
- 未配置价格时成本为 unknown，而不是误报为 0；上游失败 telemetry 可以进入 fallback 记录。

## Limits

这些测试验证产品契约和小型合成 smoke set，不代表自然语言理解的通用准确率。下一阶段需要扩展脱敏课程材料、公开 GitHub Issue 讨论和人工标注冲突集，并分别报告多标签 precision/recall、question utility、trace faithfulness 和人类修改率。CI 不调用付费模型，因此真实 Provider 的上游可用性、成本和模型质量需要带 API Key 的受控评测；界面只展示实际 Agent Run，不填充虚构数据。

PR CI 执行 lint、测试与生产构建；Pages workflow 在上传部署产物前再次运行 `npm run check`，因此检查失败会阻断本次线上发布。仓库是否启用 required branch protection 不在代码中证明，不能表述为已配置。
