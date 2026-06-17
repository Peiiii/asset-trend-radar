# `pnpm dev` 一键启动验证报告

## 范围

- 根目录 `pnpm dev` 同时启动本地 runtime API 和 Vite web。
- 默认端口保持不变：
  - Web: `http://127.0.0.1:5193`
  - Runtime API: `http://127.0.0.1:3193`
- 支持通过环境变量开备用端口：
  - `GOLD_INSIGHTS_WEB_PORT`
  - `GOLD_INSIGHTS_PORT`
- Vite `/api` proxy 会跟随 `GOLD_INSIGHTS_PORT` 指向对应 runtime。

## 启动验证

备用端口验证命令：

```bash
GOLD_INSIGHTS_DATA_DIR=.tmp/dev-command-smoke GOLD_INSIGHTS_PORT=3393 GOLD_INSIGHTS_WEB_PORT=5393 GOLD_INSIGHTS_REFRESH_ON_START=false pnpm dev
```

验证结果：

- Web 启动: `http://127.0.0.1:5393/`
- Runtime 启动: `http://127.0.0.1:3393`
- `GET http://127.0.0.1:5393/overview` 返回 `200`
- `GET http://127.0.0.1:5393/api/data-health` 通过 Vite proxy 命中备用 runtime
- `GET http://127.0.0.1:3393/api/data-health` 直接命中 runtime

默认端口验证：

- `pnpm dev` 启动成功
- Web: `http://127.0.0.1:5193/`
- Runtime: `http://127.0.0.1:3193`
- `GET http://127.0.0.1:5193/overview` 返回 `200`
- `GET http://127.0.0.1:5193/api/data-health` 返回：
  - `assetCount`: 162
  - `barCount`: 226521
  - `latestBarAt`: `2026-06-17T14:51:56.000Z`

## 命令验证

- `pnpm typecheck`
- `pnpm lint`
- `pnpm lint:maintainability:guard`
- `pnpm build`
- `git diff --check`

## 维护性说明

- `scripts/dev/start-local-dev.mjs` 是根目录开发启动编排脚本，只负责本地开发进程管理。
- `apps/local-shell` 仍是 runtime 的薄入口。
- `vite.config.ts` 只负责 web dev server 和 API proxy 配置。
- 没有新增 package 深导入。
- 没有新增 runtime 或 domain 业务逻辑。
