# Open-source research

调研发生在编码之前，只借鉴信息架构和工程边界，没有复制实现。

## Fission-AI/OpenSpec

- Inspected commit: `2826b8889e5223a9a8095d4428b60b56597e1020`
- Relevant files: `schemas/spec-driven/schema.yaml`, `src/core/artifact-graph/types.ts`, `state.ts`, `graph.ts`
- Adopted: 显式产物依赖图、状态守卫、同分时使用声明顺序保证确定性。
- Rejected for MVP: 仓库内规格归档、CLI、插件配置和跨仓库 Store。

## github/spec-kit

- Inspected commit: `bf88c9f9a82fa370c7a7257aa2b3cf10b457b65c`
- Relevant files: `templates/commands/clarify.md`, `templates/spec-template.md`, `workflows/speckit/workflow.yml`
- Adopted: 覆盖分类扫描、自适应 1 / 3 / 5 个高影响问题、一次一题、人类审批门、验收标准先于实现。
- Changed: SpecLoop 的问题直接链接原始证据，并保留回答生成的产品决策节点。
- Rejected for MVP: 分支生成、代码计划、任务执行和多集成工作流。

## bytedance/deer-flow

- Inspected commit: `1dd6ba1acb03700589994b0366c5d1c7d05e2eff`
- Relevant files: `agents/thread_state.py`, `agents/memory/manager.py`, `agents/middlewares/memory_middleware.py`, `runtime/events/store/memory.py`, `runtime/context_compaction.py`
- Adopted: 项目状态和事件日志分离；偏好、决策和原始会话不是同一种“记忆”；事件使用稳定序列保留审计顺序。
- Rejected for MVP: 多 Agent、sandbox、动态工具、长上下文压缩和可插拔记忆后端。

## Product differentiation

OpenSpec 和 Spec Kit 主要从已经提出的功能或代码仓库开始组织规格。SpecLoop 解决更上游的问题：从混乱的真实讨论里找出不一致、只问值得问的问题，并让每个产品结论回到原话。
