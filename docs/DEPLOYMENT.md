# SpecLoop 部署手册

## 部署结构

```text
GitHub Pages frontend
        |
        | VITE_AGENT_API_URL
        v
Render Node service
        |
        | server-side OPENAI_API_KEY
        v
OpenAI Responses API
```

GitHub Pages 只包含静态前端。API Key 仅存在 Render Secret 中，不写入 GitHub 变量、前端构建、浏览器存储或 Git 历史。

## 1. 创建 Render 服务

仓库根目录包含 `render.yaml` 和 `Dockerfile`。在 Render 选择 **New Blueprint Instance** 并连接 `0101xiayingluo/SpecLoop`，服务会使用 Docker 构建生产前端和 Node 模型适配层。

Blueprint 默认配置：

- 健康检查：`/api/health`
- 模型：`gpt-5-mini`，可在平台环境变量中替换
- 每 IP 每分钟最多 12 次模型请求
- 全局最多 2 个并发模型请求
- 单次 Provider 调用 30 秒超时
- 允许来源：`https://0101xiayingluo.github.io`

## 2. 由仓库所有者填写 Secret

在 Render Environment 中填写：

- `OPENAI_API_KEY`：OpenAI 服务端 API Key
- `OPENAI_INPUT_USD_PER_1M`：部署时输入 Token 单价
- `OPENAI_CACHED_INPUT_USD_PER_1M`：部署时缓存输入 Token 单价
- `OPENAI_OUTPUT_USD_PER_1M`：部署时输出 Token 单价

价格不是 Secret，但仍由部署者按照部署时的官方报价配置，避免仓库中的价格随时间失真。

## 3. 连接 GitHub Pages

Render 部署完成后取得服务地址，例如 `https://specloop-agent.onrender.com`。

在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables** 中新增：

```text
VITE_AGENT_API_URL=https://your-render-service.example
```

重新运行 `Deploy GitHub Pages` workflow。前端启动时会访问远程 `/api/health`，成功后 Preferences 中可切换到 Model Reasoner。

## 4. 验收

1. `/api/health` 返回 `available: true`，并展示 guardrail 配置。
2. GitHub Pages 的 Preferences 显示 Model Reasoner 可用。
3. 使用 Model 模式分析一份材料。
4. Evaluation 出现模型、Token、成本、服务端/端到端延迟和 request ID。
5. 连续超限请求返回 `429`，并带 `Retry-After`。

## 安全边界

- `ALLOWED_ORIGIN` 限制浏览器来源；同源 Render 页面仍可访问。
- Origin 不是完整身份验证，因此服务同时使用速率限制、并发限制和超时控制成本风险。
- 公开生产服务仍应进一步增加用户身份、持久化配额和预算告警；当前配置适合作品集演示，不应作为无限额度公共 API。
