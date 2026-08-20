# SpecLoop MVP PRD

## Problem

软件项目的原始需求通常散落在会议、群聊、反馈和课程文档中。普通总结会压平冲突与不确定性，也无法解释一条验收标准来自哪句话。团队因此容易在错误假设上实现功能，并在反馈变化后继续沿用已经失效的决策。

## Target user

- 需要把访谈和讨论转成可执行需求的产品经理或学生项目负责人。
- 需要明确验收边界和原始依据的软件工程成员。
- 需要检查项目推理过程而不只看最终文档的评审者。

## Product principles

1. Evidence before synthesis：不生成没有来源的需求。
2. Information gain before question count：问题数量不是质量，优先解决会改变实现和验收的未知项。
3. Human authority：Agent 提案，人类接受或修改。
4. Change is first-class：新反馈必须挑战旧结论，而不是覆盖历史。
5. Reproducible demo：无 API Key 也能完整演示。

## MVP requirements

| ID | Requirement | Acceptance signal |
| --- | --- | --- |
| R1 | 支持粘贴和上传常见文档 | 原文与行号被保存为 evidence fragments |
| R2 | 检测冲突、缺失条件和假设 | Findings 按类型和风险展示 |
| R3 | 最多提出 5 个高信息增益问题 | 一次显示一题，未回答不能生成需求 |
| R4 | 生成需求和 Given/When/Then | 每条需求至少一条验收标准 |
| R5 | 端到端追踪 | 每条需求和验收标准至少链接一个证据片段 |
| R6 | 人工接受、修改和优先级调整 | 修改被写入 audit log，本地恢复偏好 |
| R7 | 新反馈影响分析 | 相关节点变成 `at-risk` 并生成 `challenges` 边 |
| R8 | 导出三种需求包 | PRD、用户故事、GitHub Issue Markdown 均包含证据引用 |
| R9 | 可选真实模型 Reasoner | 模型输出通过 schema 和证据白名单验证；服务不可用时回退并审计 |
| R10 | 模型运行可观测 | 每次真实调用记录 Token、估算成本、服务端/端到端延迟、状态、模型和 request ID |
| R11 | 静态前端连接独立模型后端 | API Key 只在 Node 服务端；前端通过可配置地址和受限 CORS 调用 |

## Non-goals

- 不做会议音视频转写。
- 不做 Jira、Linear、GitHub API 双向同步。
- 不做多人实时编辑和权限系统。
- 不做多 Agent 调度或自主执行代码。
- 不把 smoke fixtures 或 Demo Reasoner 的结果描述成开放域语义理解准确率。

## Success metrics

- 追踪覆盖率：需求与验收标准的来源覆盖率为 100%。
- 问题效率：任何项目最多 5 个正式澄清问题。
- 状态完整性：未回答问题时无法进入需求生成。
- 变更敏感性：范围冲突反馈能标出对应旧决策和需求，且不误伤无关的审批决策。
- 可复现性：同一材料与答案产生相同的问题顺序和产物结构。

## Model launch metrics

下列是接入真实后端后的发布目标，不是当前静态 Demo 的已测结果：

- Telemetry completeness：100% Provider 调用有状态、模型、Token、延迟和 request ID；价格配置后 100% 成功调用有成本估算。
- Latency：课程项目规模材料的端到端 P95 小于 15 秒。
- Cost：单次澄清分析的平均估算成本不高于 0.02 美元，超出时优先缩短证据上下文而非降低追踪约束。
- Reliability：排除密钥未配置后，Provider fallback 率低于 5%。
- Human utility：至少 70% 的模型澄清问题被用户直接接受或仅轻微修改。
