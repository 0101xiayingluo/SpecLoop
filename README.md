# SpecLoop

SpecLoop 是一个证据驱动的需求澄清与验收 Agent。它把会议记录、聊天摘录、用户反馈和项目文档转成一条可审计链路：

`原始证据 -> 用户问题 -> 产品决策 -> 需求条目 -> 验收标准`

当前版本是无需 API Key 的可复现 MVP，使用单 Agent 状态机完成材料导入、冲突检测、逐题澄清、需求生成、追踪图、人工评审、变更影响和 Markdown 导出。

## Demo workflow

1. 粘贴或上传 TXT、Markdown、JSON、PDF、DOCX。
2. Agent 识别冲突、缺失条件和未经验证的假设。
3. 只保留信息增益最高的 5 个问题，并且每次只显示一个。
4. 生成带原文引用的需求和 Given / When / Then 验收标准。
5. 查看追踪图，接受或修改需求。
6. 添加新反馈，查看可能失效的旧决策。
7. 导出 PRD、用户故事或 GitHub Issue Markdown。

## Run locally

```bash
npm install
npm run build
npm run preview
```

打开 `http://127.0.0.1:4173/`。开发环境也可以使用 `npm run dev`。

## Quality checks

```bash
npm run lint
npm run test
npm run build
```

## Project map

- `src/core/`：领域模型、状态机、确定性 Reasoner、影响分析、导出与本地持久化。
- `src/components/`：材料、澄清、需求、追踪、评审和评测界面。
- `evals/`：行为评测样例。
- `docs/`：PRD、架构、开源调研、评测与简历材料。

## MVP boundaries

首版不包含实时会议转写、团队协作、第三方项目管理同步、多 Agent 编排或云端账号系统。浏览器本地存储是演示默认值；真实 LLM Provider 将作为后续可替换 Reasoner 接口接入。

## Documentation

- [PRD](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Open-source research](docs/OPEN_SOURCE_RESEARCH.md)
- [Evaluation](docs/EVALUATION.md)
- [Resume notes](docs/RESUME.md)

## License

MIT

