# 90-second portfolio demo

## 0:00-0:15 · Business problem

打开 `Case study`，用一句话说明：SpecLoop 不是自动写 PRD，而是把冲突讨论变成可追踪、可验收、可重审的产品决策。

## 0:15-0:30 · Reproducible scenario

进入 `Guided demo` 并点击 `Run scenario`。页面原地展示证据片段数、`high-risk` 路由和 5 问预算，所有产品页面立即可用。

## 0:30-0:50 · Evidence and human gate

打开 Requirements，选择一条需求，展示来源原文、行号、Given/When/Then 和人工修改入口；指出模型只提案，人类拥有最终写入权。

## 0:50-1:05 · Trace and change

返回 Guided Demo 点击 `Inject PDF requirement`，系统自动进入 Review；展示相关节点变为 `at-risk`，不相关决策保持原状态。然后打开 Trace 点击验收节点回溯原文。

## 1:05-1:30 · Agent control plane

打开 Evaluation，展示证据采集 pipeline、自适应路由、Grounding guard、人类门禁、失败样本池和六维评测，以及真实模型调用产生的 Token/成本/延迟。明确没有真实调用时显示 `waiting`，不展示虚构数字。

# Three-minute deep dive

## 0:00-0:30 · Material intake

打开应用并点击 `Load demo`。指出材料同时包含产品、开发、用户和助教的原话，而且范围描述并不一致。想快速展示后续页面时，点击 `Run full demo`，它会用推荐答案生成需求并直接进入需求页。

## 0:30-1:10 · Clarification

展示左侧 conflict / missing / assumption 分类，以及一次只出现一个问题。选择推荐选项并说明：系统按复杂度分配 1 / 3 / 5 问，优先解决会改变实现和验收的未知项。

## 1:10-1:45 · Requirements

生成需求后选择一条记录，修改优先级和 Given / When / Then。展示右侧原文引用和行号，保存后状态变为 `Modified`。

## 1:45-2:20 · Trace

打开 Trace，点击 Requirement 和 Acceptance 节点。用右上角检查器展示从输出回到 evidence 的路径和 100% coverage。

## 2:20-2:50 · Change impact

进入 Review，添加 demo feedback。指出相关旧决策和需求变成 `At risk`，不相关的审批决策不受影响；点击 `Confirm valid` 展示人工复核闭环。

## 2:50-3:00 · Evaluation and export

打开 Evaluation 展示六维质量门、失败样本审核和审计日志，最后导出 PRD。强调 8 条 fixture 只是可复现 smoke set，而非开放域准确率声明。

## Optional model mode

在 Preferences 中切换 Model。说明 API Key 只存在 Node 服务端；复杂 / 高风险材料可路由到不同模型，模型输出必须通过 JSON Schema、Zod、证据 ID 白名单和自适应问题预算，失败时自动回退到确定性 Reasoner。
