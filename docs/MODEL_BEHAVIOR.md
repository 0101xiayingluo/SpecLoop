# Model behavior, failure case, and degradation strategy

## Observed failure: a plausible answer with an invented citation

### What happened

早期模型边界只校验 JSON 结构。模型可以返回语言合理的冲突结论，却引用一个输入中不存在的 evidence ID。结果“读起来像对的”，但追踪图无法回到原文，这是比格式错误更危险的静默失败。

### Why prompt-only control was insufficient

系统 Prompt 已要求“不得编造 evidence ID”，但这不是可执行保证。长材料和多项任务会让模型更容易违反局部约束；继续微调措辞只能降低概率，不能把错误变成不可进入领域状态的结果。

### Product and engineering response

1. 服务端用 strict JSON Schema 限制输出形状。
2. 客户端用 Zod 再次验证，并用当前项目 evidence allowlist 校验每个引用。
3. 任一未知 ID 会拒绝整个模型提案，保留确定性 baseline，并记录失败运行。
4. 该失败进入 `pending-review` 池；人工确认后才变成回归样本。

仓库测试 `rejects model output that invents evidence ids` 固化了这个案例。这里没有声称一个尚未通过开放数据集测量的“幻觉率降幅”。

## Counter-intuitive product hypothesis

当前可证实的是：固定 5 问会让低复杂度材料承受与高风险冲突相同的交互成本。它并不能证明真实用户满意度下降，但足以形成需要验证的产品假设：少问不总是信息损失，低歧义材料的一问预算可能比“问得完整”更有效。

因此系统按冲突数、高严重度问题、假设数和材料长度计算复杂度：简单 / 复杂 / 高风险分别分配 1 / 3 / 5 问上限。每轮回答后若没有阻断问题且剩余最高 `informationGain < 7`，系统会记录早停。下一轮应记录问题接受、跳过和人工改写行为，再判断这项策略是否改善完成率；在真实数据出现前不填写满意度提升。

## Observed routing failure: one severe omission looked simple

输入“用户需要上传 PDF 文档”会触发一个 high-severity 的“失败行为未定义”。旧策略只按总分判断，score 2 低于 complex 阈值，错误路由到 simple/deterministic。对 12 条路由标注集 replay 旧阈值会得到 11/12，混淆矩阵出现 simple 预测、complex 真值。

`risk-floor-v2` 保留原公式，同时增加 `highSeverity >= 1 -> at least complex`。修正后该集合为 12/12，`upload-failure-risk-floor-regression` 在 CI 中防止复发。这是合成样本上的可复现工程结果，不被描述为线上准确率提升。

## If the model is replaced by Doubao or a local 7B model

产品不会维持“能力不变”的假象，而会主动降级：

- 将长材料先按来源和主题切成短证据块，冲突候选主要由确定性规则提取。
- 7B 只负责在候选范围内改写澄清问题，不直接生成最终决策或跨长文档追踪。
- 高风险和低置信度结果强制人工复核；全自动生成降级为半自动建议。
- 高频场景采用版本化模板和已审核示例检索，补偿长上下文与多轮推理弱点。
- 保持 schema、evidence allowlist、失败回退和评测接口不变，让模型替换不破坏产品权责边界。

豆包 1.6 Pro 不会因为品牌名称直接进入 large tier。先跑同一组 routing/grounding/long-input gates，再根据真实 usage、成本和延迟决定映射到 `OPENAI_MODEL_SMALL`、`OPENAI_MODEL_LARGE` 或不进入生产路由。若长输入 recall 下降但 grounding 稳定，则按来源/主题切片并检索已审核示例；若引用可靠性不达标，则只允许改写确定性候选问题。

这说明模型能力会改变产品形态：能力更弱时减少自由生成、缩短上下文、增加人工权限，而不是只申请更多算力。当前没有豆包或本地 7B 的实测结果，因此不声称能力高低。
