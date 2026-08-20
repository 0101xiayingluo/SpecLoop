# Three-minute demo

## 0:00-0:30 · Material intake

打开应用并点击 `Load demo`。指出材料同时包含产品、开发、用户和助教的原话，而且范围描述并不一致。

## 0:30-1:10 · Clarification

展示左侧 conflict / missing / assumption 分类，以及一次只出现一个问题。选择推荐选项并说明：问题数量被限制为 5，优先解决会改变实现和验收的未知项。

## 1:10-1:45 · Requirements

生成需求后选择一条记录，修改优先级和 Given / When / Then。展示右侧原文引用和行号，保存后状态变为 `Modified`。

## 1:45-2:20 · Trace

打开 Trace，点击 Requirement 和 Acceptance 节点。用右上角检查器展示从输出回到 evidence 的路径和 100% coverage。

## 2:20-2:50 · Change impact

进入 Review，添加 demo feedback。指出相关旧决策和需求变成 `At risk`，不相关的审批决策不受影响；点击 `Confirm valid` 展示人工复核闭环。

## 2:50-3:00 · Evaluation and export

打开 Evaluation 展示质量门和审计日志，最后导出 PRD。强调 8 条 fixture 只是可复现 smoke set，而非开放域准确率声明。

## Optional model mode

在 Preferences 中切换 Model。说明 API Key 只存在 Node 服务端，模型输出必须通过 JSON Schema、Zod、证据 ID 白名单和 5 问上限，失败时自动回退到确定性 Reasoner。
