# feat-cross-platform 分支计划

更新时间：2026-05-23

## 结论

`feat-cross-platform` 的目标是把 Skill Flow 的桌面端从 macOS 专用实现扩展为跨平台桌面实现。当前实现以 Tauri 2 + React/Vite 为新的跨平台桌面壳，复用现有 CLI / core engine / integration 能力，并补齐 macOS、Linux、Windows 的测试与发布路径。

当前分支已经完成主要功能迁移和发布链路搭建。最新本地验证显示跨平台桌面 renderer build、TypeScript 检查、桌面测试、CLI bridge build / test 和 Tauri Rust 测试均已通过。后续重点从“能跑通”转为继续对齐 `main` 分支 mac 桌面端的功能、UI、逻辑细节。

## 分支基线

- 当前分支：`feat-cross-platform`
- 本轮提交前基线：`7b43a36`
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
- 已开始补齐 `GroupCardDisplayMode` 对齐：Home / Menu 按卡片密度传入 display mode，卡片按 mode 控制 meta 行、section 标题、header / summary divider、最小高度，以及菜单折叠状态下的技能区渲染。
- 已将 Home / Menu 的 `SharedGroupCard` 主要操作从底部按钮迁移到右上角 action menu，对齐 mac 端 `more/pin` 菜单交互；分组标签编辑与删除模式也改为从该菜单进入。
- 已补齐 Home / Menu source 级更新中状态：`HomeViewModel` 记录正在更新的 source，卡片显示 busy overlay 并在更新期间禁用卡片内容交互，贴近 mac 端卡片 busy 状态。
- 已进一步对齐 mac 端 `EditableGroupTagSection`：标签区支持空标签 / hover 标签时显示 inline plus 进入编辑，编辑态显示输入框和建议，创建后退出编辑；Detail 页标签编辑也复用同一交互。
- 已开始对齐 mac 端全局顶栏结构：Import 页搜索迁入共享 `DesktopTopBar`，非 Home 顶栏显示返回按钮和页面标题，Import 页面内部 header 去除并收敛背景。
- 已将 Detail / Settings 也接入共享 `DesktopTopBar`，非 Home 页面统一显示返回按钮和页面标题，返回操作回到 Home。
- 已将 Import 推荐 / 搜索结果卡片从旧 `GroupCard` 迁移到 `SharedGroupCard`，按 mac 端区分 `importRecommendation` / `importSearch` display mode。
- 已补齐 Import 卡片主操作按钮、导入中 busy overlay、已安装禁用态，以及导入 draft 的技能 / 目标切换和全选逻辑。
- 已补齐 Import 推荐说明和推荐标签在共享卡片 summary 区的展示，并从 bundled recommendation metadata 生成本地化 badge。
- 已移除 Import 内容区旧标题面板，搜索结果和推荐列表更接近 mac 端由顶栏和分区 badge 承载上下文的布局。
- 已对齐 `SharedGroupCard` header stats 规则：meta 行只展示 downloads / stars / GitHub / 本地路径，移除 skill count / active targets / warning / error 的 header pill；Import loading 时保留 mac 端同类占位。
- 已补齐 Import preview loading 的技能区 loading pill，占位展示复用共享卡片模型的 `skillsLoading` 状态。
- 已贯通 Import search bridge 返回的 `canonicalRepo`、`repoUrl`、`starCount`、`totalInstalls`、`skillCount` 到 renderer `ImportGroupState`，Import 卡片可展示 mac 端同类下载、星标和 GitHub meta。
- 已补齐 Import 预览未返回 targets 时的 mac 端 fallback 逻辑：按设置中的 Agent 显示顺序和可见性过滤当前工作区已检测 targets，卡片渲染、全选和导入 draft 共用同一组有效 targets。
- 已对齐 Settings Agent Display 的 target 范围：App 通过 `MainViewModel.detectedTargetIdsForSettings` 将当前工作区检测到的 targets 传入 Settings，Settings 只展示对应 agent 行，排序沿用 Agent catalog 顺序。
- 已对齐 Settings 的 Application Update / Maintenance 区块结构：当前版本、检查更新、打开 Releases、清理缓存、重置配置均使用 mac 端同类设置行标题、描述和短操作按钮；更新状态进入检查更新行描述，检查中显示 loading indicator。
- 已对齐 Detail 顶栏和组 header 的分工：全局顶栏保持 `Source Detail` 页面标题，详情 header 改为 mac 端同类标题 + byline + stats 行，移除 React 早期的 `Current route` 和 meta card 展示。
- 已补齐 Detail inspect enrichment 中 `downloadCount`、`repoUrl` 到 `DetailRecord` 的投影，详情 header 可展示 skills / downloads / stars / GitHub / local path stats。
- 已补齐 Detail agents / skills 的三态全选入口和持久化逻辑，选择汇总、enabled count、toast 回滚路径复用现有 `apply` mutation。
- 已对齐 Detail 主体结构：移除常驻文件树侧栏和 Source / Deployment Facts 卡片，组概览按 mac 端顺序渲染标签、Agent 开关、文档区。
- 已将 Detail 文件树改为组文档区的首个 `File Tree` 文档卡片，并让 runtime `groupDocuments` 首项生成 `File Tree` 描述符，README 等内容文档位于后续标签。
- 已将 Detail 技能开关迁入左侧列表：分组行承载技能三态全选，技能行承载单技能 ON/OFF，主体区域只渲染当前视图的文档内容。
- 已补齐 bridge inspect 的 Detail 文档投影：CLI bridge 会读取 checkout 根目录 markdown、技能 `SKILL.md`、技能 `references/*.md`，解析基础 frontmatter，生成真实文件树、组文档和技能文档内容；React renderer 优先消费 bridge 返回的文档 / 文件树结构。
- 已将 Detail `MarkdownDocument` 从原文 `<pre>` 展示改为基础 markdown 渲染，支持标题、段落、列表、代码块，文档卡片圆角同步收敛到 mac 端尺度。
- 已对齐 Detail 文件树交互：普通目录默认展开且点击可折叠 / 展开，点击技能根目录或技能文档会切换到对应技能并展开其路径，删除 source 时同步清理折叠状态。
- 已补齐 Detail 文档 metadata 展示：`MarkdownDocument` 渲染 mac 端同类 metadata 表格，bridge frontmatter 解析支持多行 `|` / `>` block 和简单数组 / 列表值，避免把多行 description 显示成 `|`。
- 已补齐 Detail 组 header 的更新按钮：仅组概览显示，复用 HomeViewModel 的当前 source 更新路径、更新中状态和 toast 汇总逻辑，对齐 mac 端在详情页直接更新当前分组的入口。
- 已补齐 Detail 组 header 的 GitHub / 本地路径入口：stats 图标可点击打开仓库 URL 或本地目录，renderer 通过 Tauri command 分别接入 macOS `open`、Windows `explorer` / `cmd start`、Linux `xdg-open`。
- 已补齐 Settings Agent Display 的拖拽列表底部 drop target 和插入指示状态，拖到列表末尾时按 mac 端同类交互重排当前检测范围内的 agent。
- 已对齐 Settings 控件形态：主题 / 卡片密度从原生 select 改为 segmented control，强调色 / 语言 / 日志级别从原生 select 改为带 swatch、菜单和选中态的自定义 dropdown。
- 已对齐 Settings 更新状态流：检查更新行在发现新版本后切换为打开 Releases，`runningNewerBuild` 使用 mac 端 `newer_local` 文案并补齐三语本地化。
- 已扩展 Detail Markdown 渲染能力，补齐链接、粗体、斜体、inline code、有序列表、引用、分隔线和 1-6 级标题，减少与 mac 端 GitHub 风格 StructuredText 的差距。
- 已继续补齐 Detail Markdown 表格和图片渲染，支持 GFM 风格表格、图片 alt / src、表格单元格内 inline markdown。
- 已补齐 Detail Markdown 任务列表和删除线渲染，进一步对齐 GitHub 风格 README 常见内容。
- 已将 Detail Markdown 链接点击接入桌面外链打开通道，点击文档链接会阻止 webview 默认导航并复用 Tauri opener，贴近 mac 端 `NSWorkspace.shared.open` 行为。
- 已补齐 Detail Markdown 相对资源路径：图片和本地文档链接会基于当前文档路径解析，图片走 Tauri asset protocol，本地文档链接走 path opener；Tauri 配置同步开启 `assetProtocol` 并添加 `protocol-asset` feature。
- 已将 Home / Menu / Import 的 `SharedGroupCard` GitHub 和本地路径 meta 图标接入桌面 opener，不再依赖 webview 默认链接跳转；Home 本地路径入口走 path opener，GitHub 入口走 external URL opener。
- 已对齐 Detail 文档内容分流：`.md` 文档继续走 Markdown 渲染，非 Markdown 文档按纯文本显示；文档 tab 的 `externalUrl` 增加独立外链按钮并复用桌面 opener。
- 已对齐 Detail 标题清洗规则：bridge inspect 中脏的 `displayName` / leaf `name` 会被过滤，组标题优先使用 snapshot title，缺失时从 locator 推导；技能标题优先使用 payload / snapshot title，缺失时回退到 linkName。
- 已补齐 Detail 技能 header info：bridge 投影保留 skill `version` / `documentContent`，技能详情 header 按 mac 端规则显示标准化版本号和文档词数。
- 已对齐 Detail 技能切换 pending 状态：点击技能或文件树技能节点时先进入 pending selection，侧栏 / header 立即偏向目标技能，文档区显示 loading，占位约 `40ms` 后提交选择；返回组概览会取消 pending 并清理树选中。
- 已对齐 Detail 文档 tab pending 状态：组文档与技能文档切换先进入 pending selection，tab 立即高亮目标文档并显示 loading，占位约 `40ms` 后提交选择。
- 已对齐 Detail 侧栏技能信息行：技能行不再显示 raw skill id，改为复用 mac 端同类 version / word count 信息行，并在 pending skill 行降低透明度。
- 已对齐 Detail 文件树行布局：文件树从简单缩进按钮改为 mac 端同类引导列、节点 lead、目录 / 文档图标、技能节点强调和选中指示条布局，同时保留目录折叠和技能节点切换行为。
- 已对齐 Detail 技能无文档内容展示：技能详情不再显示额外 Documents 标题或 README 占位 tab；当技能没有文档 tab 时，按 mac 端逻辑直接显示 `documentContent` 原文。
- 已对齐 Detail 未加载文档状态：组文档和技能文档已选中但 `isLoaded=false` 时显示本地化 loading 占位，不再把空内容误渲染成文档正文。
- 已对齐 Detail 文件树卡片标题层级：文件树名称只由文档 tab 承载，卡片内部不再重复显示 `File Tree` 标题，贴近 mac 端 `detailFileTreeCard` 结构。
- 已对齐 Detail Agent rail 图标：Agent toggle chip 左侧复用 Agent 图标资源，未知 Agent 回退到 shortLabel，贴近 mac 端 `AgentIconLibrary` 展示规则。
- 已对齐 Detail 侧栏技能分区和切换节奏：侧栏分组行与技能列表之间改为 mac 端同类分隔线；技能切换 pending 延迟从 `40ms` 调整为 mac 端的 `80ms`，文档 tab pending 仍保持 `40ms`。
- 已对齐 Detail 侧栏选中指示：分组行和技能行增加 mac 端同类左侧品牌色选中指示条，并将侧栏分组 / 技能行高度调整到 `64px` / `60px`。
- 已对齐 Detail inspect 加载期布局：source 已选中但详情尚未返回时，使用 inventory summary 构造只读 presentation detail，保留侧栏、header、Agent rail 和文档 loading skeleton，不再退回整页 `Loading source detail` 文本。
- 已对齐 Detail 技能空状态：进入技能视图但没有可显示技能时，显示 mac 端同类 `No skill selected` 空状态和三语文案，不再误显示普通 no_content 文档内容。
- 已对齐 Home 空态 / 加载态和页面标题文案：Home 空态改为 mac 端标题 + 副标题结构，加载文案使用 `common.loading.groups`；Home / Import / Detail 页面标题同步到 mac 端本地化文案。
- 已对齐 Home 空结果过滤栏规则：没有可见卡片时不再显示 project scope bar 或 tag filter bar，贴近 mac 端 `gridSection` 的空态结构。
- 已对齐 Home 项目范围路径入口：project scope pill 在存在 `projectPath` 时显示外链按钮，并通过桌面 path opener 打开项目路径，贴近 mac 端 `homeScopePill(projectPath:)` 行为。

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
- 最新测试汇总：`31` 个测试文件通过；`232` 个测试通过。
- Vitest `--localstorage-file was provided without a valid path` warning 已清理。
- 本轮补充验证：`npm run -w @skill-flow/desktop test -- src/tests/home-view-model.test.ts src/tests/home-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/detail-screen.test.tsx src/tests/group-tag-store.test.ts src/tests/localization.test.tsx` 通过，`6` 个测试文件、`74` 个测试通过。
- 菜单快速配置补充验证：`npm run -w @skill-flow/desktop test -- src/tests/menu-quick-config-screen.test.tsx src/tests/home-screen.test.tsx src/tests/tray.test.ts` 通过，`3` 个测试文件、`18` 个测试通过；此前 `src/tests/menu-quick-config-screen.test.tsx src/tests/tray.test.ts src/tests/home-view-model.test.ts src/tests/home-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/detail-screen.test.tsx` 通过，`6` 个测试文件、`75` 个测试通过。
- SharedGroupCard display mode / action menu / busy overlay 补充验证：`npm run -w @skill-flow/desktop test -- src/tests/home-screen.test.tsx src/tests/menu-quick-config-screen.test.tsx src/tests/home-view-model.test.ts src/tests/localization.test.tsx` 通过，`4` 个测试文件、`58` 个测试通过。
- 标签编辑交互补充验证：`npm run -w @skill-flow/desktop test -- src/tests/home-screen.test.tsx src/tests/detail-screen.test.tsx src/tests/home-view-model.test.ts src/tests/menu-quick-config-screen.test.tsx src/tests/localization.test.tsx` 通过，`5` 个测试文件、`67` 个测试通过。
- Import 顶栏补充验证：`npm run -w @skill-flow/desktop test -- src/tests/import-screen.test.tsx src/tests/import-view-model.test.ts src/tests/home-screen.test.tsx src/tests/localization.test.tsx` 通过，`4` 个测试文件、`45` 个测试通过。
- Detail / Settings 顶栏补充验证：`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/settings-screen.test.tsx src/tests/settings-view-model.test.ts src/tests/localization.test.tsx` 通过，`5` 个测试文件、`48` 个测试通过。
- Settings 补充验证：`npm run -w @skill-flow/desktop test -- src/tests/settings-screen.test.tsx src/tests/settings-view-model.test.ts src/tests/localization.test.tsx` 通过，`3` 个测试文件、`25` 个测试通过。
- Tauri Rust 验证：`cargo test` 在 `apps/desktop/src-tauri` 通过，`4` 个单元测试通过。
- Import 共享卡片补充验证：`npm run -w @skill-flow/desktop test -- src/tests/import-screen.test.tsx src/tests/import-view-model.test.ts src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`4` 个测试文件、`42` 个测试通过。
- SharedGroupCard header stats / Import loading 补充验证：`npm run -w @skill-flow/desktop test -- src/tests/home-screen.test.tsx src/tests/menu-quick-config-screen.test.tsx src/tests/import-screen.test.tsx src/tests/import-view-model.test.ts src/tests/localization.test.tsx` 通过，`5` 个测试文件、`49` 个测试通过。
- Import stats 数据链补充验证：`npm run -w @skill-flow/desktop test -- src/tests/import-screen.test.tsx src/tests/import-view-model.test.ts src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`4` 个测试文件、`42` 个测试通过。
- Import fallback targets 补充验证：`npm run -w @skill-flow/desktop test -- src/tests/import-screen.test.tsx src/tests/import-view-model.test.ts` 通过，`2` 个测试文件、`29` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`193` 个测试通过。
- Settings detected targets 补充验证：`npm run -w @skill-flow/desktop test -- src/tests/main-view-model.test.ts src/tests/app.test.tsx src/tests/settings-screen.test.tsx src/tests/settings-view-model.test.ts` 通过，`4` 个测试文件、`33` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`195` 个测试通过。
- Settings update / maintenance 行结构补充验证：`npm run -w @skill-flow/desktop test -- src/tests/main-view-model.test.ts src/tests/app.test.tsx src/tests/settings-screen.test.tsx src/tests/settings-view-model.test.ts src/tests/localization.test.tsx` 通过，`5` 个测试文件、`38` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`195` 个测试通过。
- Detail header / stats 补充验证：`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`3` 个测试文件、`23` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`195` 个测试通过。
- Detail selection 全选补充验证：`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`4` 个测试文件、`38` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`197` 个测试通过。
- Detail body / sidebar 补充验证：`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/desktop-integration-runtime.test.ts src/tests/detail-view-model.test.ts src/tests/localization.test.tsx` 通过，`4` 个测试文件、`38` 个测试通过；随后 `npx tsc -p apps/desktop/tsconfig.json --noEmit`、`npm run desktop:test:cross-platform`、`git diff --check` 均通过，完整测试仍为 `31` 个测试文件、`197` 个测试通过。
- Detail 文档投影补充验证：`npm run -w skill-flow build` 通过；`npm run -w skill-flow test -- src/tests/bridge-command.test.ts` 通过，`17` 个测试通过；`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/desktop-integration-runtime.test.ts src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/localization.test.tsx` 通过，`4` 个测试文件、`38` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`197` 个测试通过。
- Detail markdown 渲染补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`3` 个测试文件、`25` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`198` 个测试通过；`npm run -w skill-flow build`、`npm run -w skill-flow test -- src/tests/bridge-command.test.ts`、`git diff --check` 通过。
- Detail 文件树 / metadata 补充验证：`npm run -w skill-flow build` 通过；`npm run -w skill-flow test -- src/tests/bridge-command.test.ts` 通过，`17` 个测试通过；`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-view-model.test.ts src/tests/detail-screen.test.tsx src/tests/desktop-integration-runtime.test.ts` 通过，`3` 个测试文件、`35` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`199` 个测试通过；`git diff --check` 通过。
- Detail header 更新入口补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/app.test.tsx src/tests/detail-view-model.test.ts src/tests/home-view-model.test.ts` 通过，`4` 个测试文件、`74` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`201` 个测试通过；`npm run -w skill-flow build`、`npm run -w skill-flow test -- src/tests/bridge-command.test.ts`、`git diff --check` 通过。
- Detail header 打开入口补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-view-model.test.ts src/tests/detail-screen.test.tsx src/tests/app.test.tsx src/tests/desktop-integration-runtime.test.ts` 通过，`4` 个测试文件、`47` 个测试通过；`npm run -w skill-flow test -- src/tests/bridge-command.test.ts` 通过，`17` 个测试通过；`cargo test` 在 `apps/desktop/src-tauri` 通过，`4` 个单元测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`203` 个测试通过；`npm run -w skill-flow build`、`git diff --check` 通过。
- Settings Agent 拖拽底部 drop 补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/settings-screen.test.tsx src/tests/settings-view-model.test.ts src/tests/localization.test.tsx` 通过，`3` 个测试文件、`27` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`204` 个测试通过；`git diff --check` 通过。
- Settings 控件形态补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/settings-screen.test.tsx src/tests/settings-view-model.test.ts src/tests/localization.test.tsx` 通过，`3` 个测试文件、`28` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`205` 个测试通过；`git diff --check` 通过。
- Settings 更新状态流补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/settings-screen.test.tsx src/tests/settings-view-model.test.ts src/tests/localization.test.tsx` 通过，`3` 个测试文件、`30` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`207` 个测试通过；`git diff --check` 通过。
- Detail Markdown 富文本补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`3` 个测试文件、`29` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`209` 个测试通过；`git diff --check` 通过。
- Detail Markdown 表格 / 图片补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`3` 个测试文件、`30` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`210` 个测试通过；`git diff --check` 通过。
- Detail Markdown 任务列表 / 删除线补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`3` 个测试文件、`31` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`211` 个测试通过；`git diff --check` 通过。
- Detail Markdown 外链打开补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`4` 个测试文件、`49` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`213` 个测试通过；`git diff --check` 通过。
- Detail Markdown 相对资源路径补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts src/tests/shell-config.test.ts` 通过，`4` 个测试文件、`50` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`216` 个测试通过；`cargo test` 在 `apps/desktop/src-tauri` 通过，`4` 个单元测试通过；`git diff --check` 通过。
- SharedGroupCard meta opener 补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/home-screen.test.tsx src/tests/home-view-model.test.ts src/tests/import-view-model.test.ts src/tests/import-screen.test.tsx src/tests/menu-quick-config-screen.test.tsx` 通过，`5` 个测试文件、`87` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`220` 个测试通过；`git diff --check` 通过。
- Detail 文档内容分流补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/app.test.tsx src/tests/desktop-integration-runtime.test.ts` 通过，`4` 个测试文件、`56` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`221` 个测试通过；`git diff --check` 通过。
- Detail 标题清洗补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/desktop-integration-runtime.test.ts src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts` 通过，`3` 个测试文件、`48` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`222` 个测试通过；`git diff --check` 通过。
- Detail 技能 header info 补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/desktop-integration-runtime.test.ts src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts` 通过，`3` 个测试文件、`48` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`222` 个测试通过；`git diff --check` 通过。
- Detail pending skill selection 补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-view-model.test.ts src/tests/detail-screen.test.tsx src/tests/desktop-integration-runtime.test.ts` 通过，`3` 个测试文件、`50` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`224` 个测试通过；`git diff --check` 通过。
- Detail pending document selection 补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-view-model.test.ts src/tests/detail-screen.test.tsx src/tests/desktop-integration-runtime.test.ts` 通过，`3` 个测试文件、`53` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`227` 个测试通过；`git diff --check` 通过。
- Detail 侧栏技能信息行补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts` 通过，`3` 个测试文件、`53` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`227` 个测试通过；`git diff --check` 通过。
- Detail 文件树行布局补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts` 通过，`3` 个测试文件、`53` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`227` 个测试通过；`git diff --check` 通过。
- Detail 技能无文档内容补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts` 通过，`3` 个测试文件、`54` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`228` 个测试通过；`git diff --check` 通过。
- Detail 未加载文档状态补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`4` 个测试文件、`60` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`229` 个测试通过；`git diff --check` 通过。
- Detail 文件树卡片标题层级补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`4` 个测试文件、`60` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`229` 个测试通过；`git diff --check` 通过。
- Detail Agent rail 图标补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts src/tests/agent-icon-rendering.test.tsx` 通过，`4` 个测试文件、`57` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`229` 个测试通过；`git diff --check` 通过。
- Detail 侧栏分区 / 技能切换延迟补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts src/tests/agent-icon-rendering.test.tsx` 通过，`4` 个测试文件、`57` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`229` 个测试通过；`git diff --check` 通过。
- Detail 侧栏选中指示补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/desktop-integration-runtime.test.ts src/tests/agent-icon-rendering.test.tsx` 通过，`4` 个测试文件、`57` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`229` 个测试通过；`git diff --check` 通过。
- Detail inspect 加载期布局补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/app.test.tsx src/tests/desktop-integration-runtime.test.ts src/tests/agent-icon-rendering.test.tsx` 通过，`5` 个测试文件、`67` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`230` 个测试通过；`git diff --check` 通过。
- Detail 技能空状态补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/detail-screen.test.tsx src/tests/detail-view-model.test.ts src/tests/app.test.tsx src/tests/desktop-integration-runtime.test.ts src/tests/localization.test.tsx` 通过，`5` 个测试文件、`71` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`231` 个测试通过；`git diff --check` 通过。
- Home 空态 / 标题文案补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/home-screen.test.tsx src/tests/home-view-model.test.ts src/tests/import-screen.test.tsx src/tests/app.test.tsx src/tests/localization.test.tsx` 通过，`5` 个测试文件、`83` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`232` 个测试通过；`git diff --check` 通过。
- Home 项目范围路径入口补充验证：`npx tsc -p apps/desktop/tsconfig.json --noEmit` 通过；`npm run -w @skill-flow/desktop test -- src/tests/home-screen.test.tsx src/tests/home-view-model.test.ts src/tests/localization.test.tsx src/tests/app.test.tsx` 通过，`4` 个测试文件、`69` 个测试通过；随后 `npm run desktop:test:cross-platform` 通过，`31` 个测试文件、`232` 个测试通过；`git diff --check` 通过。

## 下一步

1. 继续对照 `origin/main` 的 mac 桌面端，按 Home、Import、Detail、Settings、Tray / Menu、runtime bridge 分区列出未复刻项。
2. 优先补齐会影响真实使用闭环的差距：Home / Detail 视觉交互差异、菜单快速配置卡片 display mode 细节、Markdown renderer 与 mac StructuredText 的剩余边缘差异。
3. 触发或等待 GitHub Actions 的 `test-cross-platform`，确认 macOS、Linux、Windows 三平台通过。
4. 在 release workflow 中完成一次 `macos`、`linux`、`windows` 产物构建与 `validate-desktop-artifacts.sh` 校验。
