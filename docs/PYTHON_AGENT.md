# Python Agent runtime

SpecLoop 的前端产品和领域状态机保持 React/TypeScript 实现；Python 负责真实 Agent 的服务端执行边界。这样产品流程不被后端迁移打断，同时项目可以展示 Python Agent 开发能力。

## Execution graph

```text
ReasonRequest (Pydantic)
  -> validate-input
  -> plan-route (risk-floor-v2)
  -> model-proposal (OpenAI Responses + JSON Schema)
  -> grounding-guard (evidence IDs + issue links + question budget)
  -> review-gate (deterministic-review / manual-review)
  -> AgentRun (steps, guards, usage, cost, latency)
```

模型输出永远是 proposal。它不能直接写入 `SpecProject`；前端再次用 Zod 校验并由领域状态机决定是否写入。高风险场景即使模型成功，也只返回 `model-assisted-review`，不能绕过人工确认。

## State and bad-case location

- 请求结构：`specloop_agent/schemas.py` 的 `ReasonRequest`。
- 路由状态：`RoutePlan`，保存 complexity、tier、question budget 和风险信号。
- Agent 步骤：`AgentRun.steps`，每步有 `name/status/latencyMs/detail`。
- Guard 状态：`AgentRun.guards`，保存 schema、grounding、trace 与 review gate 结果。
- Provider 失败：`AgentRun.status=failed`，保留 request ID、usage、模型和错误原因。
- 证据越权：`grounding-guard` 失败，抛出 `GroundingError`，不会返回成功分析。
- 前端回归资产：失败请求进入现有 `FailureCase`，通过 `workflowStage/rootCause/fingerprint/relatedRunId/evidenceIds` 定位。

## Local verification

```powershell
python -m pip install -r requirements-dev.txt
python -m ruff check specloop_agent tests/python
python -m pytest
```

当前测试是协议和失败模式测试，不代表开放域语言质量；真实模型质量仍需使用脱敏材料建立 held-out 标注集后评估。
