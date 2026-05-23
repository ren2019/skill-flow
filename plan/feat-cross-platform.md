# feat-cross-platform 分支计划

更新时间：2026-05-23

## 结论

`feat-cross-platform` 的目标是把 Skill Flow 的桌面端从 macOS 专用实现扩展为跨平台桌面实现。当前实现以 Tauri 2 + React/Vite 为新的跨平台桌面壳，复用现有 CLI / core engine / integration 能力，并补齐 macOS、Linux、Windows 的测试与发布路径。

当前分支已经完成主要功能迁移和发布链路搭建。最新本地验证显示跨平台桌面 renderer build、TypeScript 检查和桌面测试均已通过。后续重点从“能跑通”转为继续对齐 `main` 分支 mac 桌面端的功能、UI、逻辑细节。

## 分支基线

- 当前分支：`feat-cross-platform`
- 当前提交：`aaf1296`，另有本轮未提交的 Home / Detail 分组标签、菜单快速配置与 Settings 自定义 Agent 改动
- 远端分支：`origin/feat-cross-platform`，已与本地当前提交一致
- 对比基线：`origin/main` at `1b43c33`
- 分支差异：`94` 个提交，`147` 个新增文件，`12` 个修改文件
- 主要变更规模：约 `19718` 行新增、`547` 行删除

## 分支目标

1. 建立跨平台桌面应用入口。
   - 新增 `apps/desktop`，使用 Tauri 2 承载 React/Vite renderer。
   - 保留桌面端窗口、菜单栏 / tray、桥接调用、资源打包等基础能力。

2. 复刻现有桌面端核心工作流。
   - Home：技能组列表、筛选、项目范围、更新、固定、详情跳转。
   - Import：推荐源、导入预览、安装状态、导入结果刷新。
   - Detail：技能详情、选择状态、目标绑定、保存失败回滚。
   - Settings：语言、项目范围、缓存清理、设置持久化。
   - Tray：快速操作与本地化。

3. 统一跨平台路径策略。
   - 将 agent / tool 的写入路径、兼容读取路径、观察路径集中到共享定义。
   - 支持 macOS、Linux、Windows 的 home 路径解析和测试 home 覆盖。
   - 保持 Codex、Claude Code、Cursor、GitHub Copilot、Gemini CLI、OpenCode、Roo、Cline、Amp、Kiro 等目标的部署策略。

4. 复用 CLI 桥接能力。
   - 桌面端通过 helper 调用现有 CLI 能力。
   - 新增桌面 bridge protocol、bridge client、Tauri command facade。
   - 将 inventory、inspect、import、settings、cache maintenance 等能力投影到桌面状态。

5. 建立跨平台验证和发布链路。
   - 新增 `test-cross-platform` GitHub Actions workflow。
   - 新增 `release-desktop` GitHub Actions workflow。
   - 新增 `scripts/release/build-desktop.sh`、`package-desktop.sh`、`validate-desktop-artifacts.sh`。
   - 产物目标包括 `dist/cli/{macos,linux,windows}` 和 `dist/desktop/{macos,linux,windows}`。

## 当前进度

### 已完成

- 已新增跨平台桌面应用骨架：`apps/desktop`。
- 已接入 Tauri 2 配置、Rust bridge、菜单 / tray、helper 资源打包。
- 已实现 React renderer 的主要页面、组件、主题、图标资源和本地化资源。
- 已迁移桌面端 state、view model、navigation、runtime integration。
- 已补充桌面端测试目录，共 `31` 个测试文件。
- 已补充跨平台路径策略测试、source service 相关测试、workspace bootstrap 相关测试。
- 已补充 renderer build + desktop test 的三平台 CI。
- 已补充桌面端 release workflow 和 release artifact 校验脚本。
- 已补齐 Home 标签从 bundled recommendations 派生 preset tags 的逻辑。
- 已移除 renderer 侧对 `node:os` / `node:path` 的静态导入，避免 Vite Node built-in 外部化提示影响运行时。
- 已补齐 Settings 中自定义 Agent、Hermes / Trae 识别、Agent 图标、更新检测状态的主要 parity。
- 已补齐 Import 自动预览、搜索结果导入入口、Detail 嵌套文件树和文件树点击同步技能选择的主要 parity。
- 已补齐 Home 单组更新、置顶持久化、删除 / 卸载工作流，并接入 bridge `update`、`toggle-pin`、`uninstall`。
- 已对齐 mac 端更新结果 toast 汇总规则，支持已更新、已最新、待复核三类明细。
- 已清理 Node 25 下访问 `globalThis.localStorage` 导致的 Vitest `--localstorage-file` warning。
- 已补齐 Detail 技能 / 目标选择的 `apply` bridge 持久化路径，并同步选择计数和三态状态，避免只改本地 UI。
- 已对齐 Home 项目范围选择的归一化与设置持久化逻辑，未知 project scope 会回到 Global，已选范围不会重复写入。
- 已补齐 Import 默认 bundled recommendations，并将 App 的 Import 搜索、预览、导入接到 bridge `search-import-groups`、`preview-import-source`、`import-source`。
- 已补齐 Home 卡片内技能 / 目标切换，`list` 响应会投影可操作的 skill / target id，卡片操作复用 `apply` 持久化路径并回滚失败。
- 已把较早本地提交推送到 `origin/feat-cross-platform`。
- 已补齐 Home 卡片内分组标签展示、添加、删除、建议选择和标签筛选联动。
- 已接入 `DesktopGroupTagStore`，Home 标签自定义结果会复用本地持久化路径。
- 已对齐 mac 端分组标签输入规则：中文 4 字、日文 7 字、英文最多 2 个词 / 20 字符，并支持跨语言识别 preset tag。
- 已抽出共享 `GroupTagController`，Home 与 Detail 共用同一套标签解析、建议、添加、删除、toast 和持久化逻辑。
- 已补齐 Detail 标签编辑入口，Detail 页可展示、添加、删除当前分组标签。
- 已补齐跨平台菜单快速配置视图：托盘左键进入 `menuQuickConfig` 路由，提供搜索、分组卡片、更新、置顶、删除、技能 / 目标切换，以及导入 / 设置入口。
- 已将托盘左键事件从直接打开主窗口改为发送 `open-quick-config` 路由事件，保留 Home / Import / Settings 原有菜单项。
- 已对齐 Settings 菜单栏分区、设置描述文案、主题 / 语言 / 强调色 / 日志级别 / 卡片密度选项本地化。
- 已将 Settings 的 Agent 显示列表从只读改为可切换可见性，并复用 `SettingsViewModel.setAgentVisibility` 持久化路径。
- 已收敛 Settings 页面视觉：移除渐变背景和大圆角，保持更接近 mac 端的克制设置表单。
- 已补齐 Settings 自定义 Agent 添加、编辑、删除入口，复用 `SettingsViewModel.customAgentDraft`、`upsertCustomAgent`、`deleteCustomAgent` 的校验与持久化逻辑。
- 已补齐 Settings Agent 排序入口，显式上移 / 下移和拖拽手柄都接入 `SettingsViewModel.moveAgents`。
- 已对齐菜单快速配置卡片的默认技能折叠行为，hover 到卡片后展开技能切换控件；Home 卡片仍保持完整展示。
- 已继续对齐菜单快速配置与 mac 端尺寸 / 交互：弹窗高度收敛到 `440px`，技能展开采用 `500ms` hover 延迟。

### 当前未完成 / 风险

- 仍需继续系统对照 `origin/main` 的 mac 桌面端，找出尚未复刻的交互细节和状态流。
- 尚未在真实 Linux / Windows 环境手动验证 Tauri 打包产物。
- 尚未确认 release workflow 在远端 GitHub Actions 上完成一次完整产物构建。

## 本地验证记录

命令：

```bash
npx tsc -p apps/desktop/tsconfig.json --noEmit
npm run desktop:test:cross-platform
```

结果：

- `npx tsc -p apps/desktop/tsconfig.json --noEmit`：通过。
- `npm run -w @skill-flow/desktop build:renderer`：通过。
- `npm run -w @skill-flow/desktop test`：通过。
- 最新测试汇总：`31` 个测试文件通过；`182` 个测试通过。
- Vitest `--localstorage-file was provided without a valid path` warning 已清理。
- 本轮补充验证：`npm run -w @skill-flow/desktop test -- src/tests/home-view-model.test.ts src/tests/home-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/detail-screen.test.tsx src/tests/group-tag-store.test.ts src/tests/localization.test.tsx` 通过，`6` 个测试文件、`74` 个测试通过。
- 菜单快速配置补充验证：`npm run -w @skill-flow/desktop test -- src/tests/menu-quick-config-screen.test.tsx src/tests/home-screen.test.tsx src/tests/tray.test.ts` 通过，`3` 个测试文件、`18` 个测试通过；此前 `src/tests/menu-quick-config-screen.test.tsx src/tests/tray.test.ts src/tests/home-view-model.test.ts src/tests/home-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/detail-screen.test.tsx` 通过，`6` 个测试文件、`75` 个测试通过。
- Settings 补充验证：`npm run -w @skill-flow/desktop test -- src/tests/settings-screen.test.tsx src/tests/settings-view-model.test.ts src/tests/localization.test.tsx` 通过，`3` 个测试文件、`25` 个测试通过。
- Tauri Rust 验证：`cargo test` 在 `apps/desktop/src-tauri` 通过，`4` 个单元测试通过。

## 下一步

1. 继续对照 `origin/main` 的 mac 桌面端，按 Home、Import、Detail、Settings、Tray / Menu、runtime bridge 分区列出未复刻项。
2. 优先补齐会影响真实使用闭环的差距：Home / Detail 视觉交互差异、菜单快速配置卡片 display mode 细节、Settings Agent 拖拽细节 polish。
3. 触发或等待 GitHub Actions 的 `test-cross-platform`，确认 macOS、Linux、Windows 三平台通过。
4. 在 release workflow 中完成一次 `macos`、`linux`、`windows` 产物构建与 `validate-desktop-artifacts.sh` 校验。
