# SpecLoop product demo script

## Demo goal

在 3 分钟内证明四件事：SpecLoop 能从零散材料中保留冲突，只问高价值问题，生成带真实来源的需求，并在新反馈进入后精确标记需要重审的旧结论。

线上地址：<https://0101xiayingluo.github.io/SpecLoop/>

## Before recording

- 使用桌面浏览器，窗口宽度建议不低于 1280px。
- 刷新页面后从 `Guided demo` 开始，使用默认 `Demo Reasoner`。
- 不需要 API Key；本次演示重点是可复现的产品工作流和质量门。
- 如果页面保留了旧项目，点击 `Guided demo -> Reset demo` 即可恢复标准场景。

## Three-minute script

| Time | Screen action | Narration | Visible proof |
| --- | --- | --- | --- |
| 0:00–0:20 | 打开 `Case study`，停留在首屏 | “SpecLoop 不是会议纪要总结器。它解决的是更上游的问题：当会议、聊天和反馈互相矛盾时，先澄清什么、凭什么做决定，以及需求变化后哪些旧结论需要重审。” | `Evidence -> decision -> acceptance`、100% demo trace coverage、48 automated tests |
| 0:20–0:40 | 点击左侧 `Guided demo`，再点击 `Run scenario` | “这个场景里，产品、开发和课程验收方对上传范围、导出格式和决策权有冲突。系统先切分并保留原文，再用 `risk-floor-v2` 判断业务风险。” | `high-risk -> large`、证据片段数、5 问预算 |
| 0:40–1:05 | 点击 `Inspect outputs` 进入 `Requirements`，选择“导入需求材料” | “Agent 不直接给一份看起来完整的 PRD。它先按风险分配 1、3、5 个问题上限，只保留会改变实现或验收的问题。人类确认后，需求才进入正式状态。” | 需求优先级、状态、Given/When/Then、右侧来源引用 |
| 1:05–1:30 | 点击 `Open trace`，选择一个 Acceptance 节点 | “这里的 100% 覆盖不是说系统支持了多少种文件，而是每个需求和验收标准至少链接一个当前项目中真实存在的 evidence ID，而且不能包含项目外引用。” | Trace 五列、coverage、原文、材料名和行号 |
| 1:30–1:55 | 返回 `Guided demo`，点击 `Inject PDF requirement`，随后打开 `Review` | “现在加入一条新反馈：课程验收必须现场上传 PDF。SpecLoop 不覆盖历史，而是建立 `challenges` 关系，只把相关决策和需求标为 `at-risk`。” | 受影响节点数、`at-risk` 状态、未受影响的其他决策 |
| 1:55–2:30 | 打开 `Evaluation`，展开 Routing evaluation | “最反直觉的 bad case 是：‘用户需要上传 PDF’看起来很简单，但失败行为未定义是一个高严重度缺失条件。旧策略只看加权总分，把它误送 simple；v2 增加风险下限后，路由标注集从 11/12 修正为 12/12。” | 3 x 3 混淆矩阵、`upload-failure-risk-floor-regression`、policy version |
| 2:30–2:50 | 向下展示 Agent control plane 与 LLM Agent observability | “模型只能提出结构化候选，JSON Schema、Zod、evidence allowlist 和人工门禁拥有最终控制权。真实模型运行时，这里记录 Token、成本、延迟和 request ID；没有调用就明确显示 waiting，不填假数据。” | Proposal -> guardrails -> human authority、真实运行空状态或真实 telemetry |
| 2:50–3:00 | 返回 `Review`，停在导出区 | “最终产物可以导出 PRD、用户故事或 GitHub Issue，并继续保留证据引用。SpecLoop 的核心不是生成更多文字，而是让产品决策可解释、可验收、可重审。” | 三种导出入口和审核状态 |

## Presenter wording

### Opening

> 需求失败通常不是因为缺少一份文档，而是因为团队把冲突和假设写成了确定事实。SpecLoop 把原始材料变成一条可审计的决策链，同时保留人类的最终接受权。

### Routing transition

> 1、3、5 是问题上限，不是固定轮数。阻断风险解决后，如果剩余问题的信息增益低于阈值，系统会提前停止，避免用追问数量制造“智能感”。

### Trace transition

> 来源覆盖证明的是可追溯，不是真实性。相互矛盾的两段证据仍会同时保留，直到产品决策明确解决它们。

### Evaluation transition

> 这里把合成 fixture、当前项目质量门和真实 Provider telemetry 分开显示。12/12 只代表仓库内的小型路由标注集，不代表开放域准确率。

### Closing

> SpecLoop 把 AI 放在最适合的位置：整理证据、发现风险、提出候选；把产品责任留给人，把每次修改留在可回放的状态和审计记录里。

## Failure-safe branches

### Model backend unavailable

不要临时配置密钥，继续使用 `Demo Reasoner`：

> 公开 Demo 默认走确定性路径，保证没有 API Key 也能复现完整工作流。生产模型不可用时，complex 场景保留 baseline 并进入 `deterministic-review`，high-risk 场景直接进入 `manual-review`。

### No live Token data

> 当前项目没有真实 Provider run，所以这里显示 `No data` 或 `Not priced`。系统只展示实际 usage，不用示例数字冒充线上测量。

### Page state is not clean

进入 `Guided demo` 并点击 `Reset demo`。不要逐页手动清理，避免演示状态与标准场景不一致。

### Time is limited to 90 seconds

只保留四个动作：`Run scenario -> Requirements -> Inject PDF requirement -> Evaluation`。Trace 的来源覆盖在 Requirements 右侧引用中口头说明，最后用混淆矩阵结束。

## Claims to avoid

- 不把 12 条路由 fixtures 或 8 条冲突 fixtures 描述为真实用户数据。
- 不把 48 项测试 x 5 次执行说成 240 条独立样本。
- 不宣称已降低返工率、成本或人工审核时间；这些仍属于 pilot 指标。
- 不宣称某个模型天然更适合中文、长上下文或工具调用；模型替换必须跑相同评测门槛。
- 不把 provenance 类型直接当作可信度排序；证据质量按可验证性、直接性、时效性和交叉佐证评审。
