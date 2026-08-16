# 项目收口:skill-flow 迭代终止(2026-08-16)

## 背景

skill-flow(251★)所处的赛道在 2026 年出现 3.8k★ 的头部竞品 xingkongliang/skills-manager(Tauri 桌面应用,52 agent 预设,marketplace,软链/复制双模式)且 GitHub CLI 官方入场 agent skills 管理。从用户视角评估后决定:**停用 skill-flow,迁移到 skills-manager,项目迭代终止**。

## 迁移结果(2026-08-16 执行完毕)

- 6 目标 × 206 链(work 41 / clean 98 / aion 1 / genie 2 / codex 64 / claude-code 1)全部迁至 `~/.skills-manager`,零死链
- agent-reach 保持 pipx 自管,未纳入 manager(外部托管源语义在 manager 中无对应概念)
- 全过程记录:`~Documents/skill-flow-migration-record.md`(含回滚方法)

## 收口时的仓库状态

- `feat/externally-managed-sources` 分支 6 commits(ADR-0003 的 command/watch kind、Install 委托、桌面端 Install 队列),**功能已实现、未合并到 main**
- main 停在 `d32ee5e`(修复按项目 ID 与规范化路径合并重复项目)
- 该分支解决的是 skill-flow 独有的问题(外部托管源的版本漂移);迁移后此能力在 skills-manager 中不存在对应物——**这是已知的迁移代价**,记录于迁移记录文档
- issue #4(自定义全局目录)实际已由 customTargets 实现并投入使用;issue #8(资产路径映射)未做

## 后续处置

- 仓库不再迭代;`releases/`、CHANGELOG、文档保留现状作为存档
- 观察期(2-4 周)后删除本机 skillflow 归档与迁移备份(需本人确认,唯一不可逆步骤)
- 若未来需要 skill-flow 的差异化能力(外部托管源登记、doctor 版本漂移检测),以迁移记录中的"关键事实"节为恢复起点,不从本仓库续写

## 经验(给未来同类决策)

- 竞品出现后,"从用视角"的自检应早于"从开发视角"的投入:本次若在 externally-managed-sources 分支动工前做同一评估,可省一个分支的工作量
- 自定义目录分发是核心刚需,两工具都能满足;真正推动决策的是生态位差距,不是功能差距
