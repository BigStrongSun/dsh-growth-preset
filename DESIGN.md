# Growth 模式设计文档

> DSH 平台机制的实证知识（seam 目录、行名解析、座位语义、日志取证）已归入
> ACPs 仓库 [design/dsh-adapter.md](<file:///C:/Users/sunda/Documents/ACPs%202/ACPs%20Adapters%20Delivery/design/dsh-adapter.md>)
> 的「DSH 扩展面实证」一节；本文只讲 Growth 自身。

## 目的与状态

Growth 是 DeepSeek Harness（desktop profile）上的自定义 agent preset：在创造模式
（cordis）的能力组合之上，加一条**教学双循环**——任务循环推进请求，教学循环把进展
持续翻译成用户侧的理解（"我做了什么 / 我学了什么"）。

基线：DSH 应用 44.7.0、`dsh` CLI 0.2.2-rc.1；bundle `@local/dsh-growth-preset` 2.1.0；
本文日期 2026-11-17。状态：**机制层与座位层均已实证**——GUI Growth 座位会话
session-2e2176ad 挂载/激活/行为三层全过（见「验证」节），Growth 收官。

需求来源是协作约定："带着我一起成长，不允许出现你会了我不会"。用户的关键纠偏：
**尾部拼接是约定不是机制**——教学必须挂进 ReAct 循环的钩子，在发现处发生，
而不是在回复末尾补票。本文围绕这条纠偏展开。

## 架构：三层分离

| 层 | 载体 | 变更频率 | 验证方式 |
|---|---|---|---|
| 机制 | `index.js`（`growth-teacher` 插件，**host 级行**） | 低（合同稳定） | 会话日志留痕，可取证 |
| 心法 | `skills/teaching-loop/SKILL.md` | 高（研究议程在此演进） | 用户反馈 + 采纳统计 |
| 身份 | preset 里 persona 的 `suffix` | 极低（一句话立场） | 系统提示可见 |

机制层挂在 host 级意味着：**教学提示全 profile 生效**（每个 agent 独立账本），
Growth 座位承载的是立场（persona）与心法（skill）。这与"带着我成长"的原始需求一致——
教学不该挑座位。

设计原则：**prompt 里养约定，代码里养机制**；能落钩子的不落文字，能进技能的不进 persona。
心法层是活文档——"怎么讲能讲得更好"的探究结果写进 SKILL.md，不散落在对话里。

## 机制合同

监听 `tools/post-execute`（所有 dispatch 含被拒调用都经过它；一个监听器覆盖全部，
无跨事件状态——继承官方先例 `dsh-repeat-tool-reminder` 的选型理由）。
候选命中 → 挂进 decision 的 `additionalContexts` → 循环在本步工具结果之后、
下一步之前拼接注入，来源标签 `{kind: "growth-teacher", form: "notice", summary}`。

状态：`WeakMap<Agent, ledger>`；`agent/pre-step` 见新用户消息即清账。
**教学区间 = 用户消息到用户消息**；每区间提示上限 `maxNudgesPerInterval`（默认 5）。
提示文案要求课程进收尾回复（v2.1 反稀释，见决策 6）。

### 检测器

| 候选 | 触发 | 设计依据 | 已知语义 |
|---|---|---|---|
| recovery | 同名工具先失败后成功 | 修复本身就是一课，最高价值信号 | 失败=结果带 error 或 decision 为 block |
| new-place | 路径首次被**修改**（`touchTools`，默认 write/edit） | 改了才教，只读不教 | seenPaths 读写共享：先读后写的文件不再触发 |
| diversity | 区间内不同工具数达到阈值（默认 3）的整数倍（3/6/9…） | 多工具编排值得让用户知道；长回合要再触发 | v2.1 起按倍数复触发 |

## 关键决策与否决记录

1. **尾部拼接（v1）→ 钩子驱动（v2）**：v1 用 persona suffix 约定"每次回复末尾汇报"；
   否决理由即用户的纠偏——约定无留痕、时机错位。
2. **schemastery Config → 零依赖**：v2 初版导入 `@deepseek-ai/schemastery` 失败
   （根因链见 dsh-adapter 文档「扩展面实证」第 1 条）。Config 改为 DEFAULTS 合并。
3. **`@local` 包说明符子行 → 绝对路径 index.js**（后被 6 取代）：出厂 preset 子行全是
   `@deepseek-ai/*`，`@local` 子行无先例；绝对路径是本安装唯一实证可加载的形态。
4. **基座 = cordis 而非 standard**：心法层是 skill，standard 的 `skill-filesystem`
   行无 `customSkillDirs`，加载不了随包技能；且成长场景的工具台（inspect、plugin
   market）本就在 cordis。代价：preset 无继承机制，growth 拿的是 cordis 的快照拷贝，
   出厂组合升级需手动同步。
5. **advisory 而非 veto**：提示只建议不强制。升格路径预留：若模型经常无视，
   在 `agent/turn-stopping` 加义务检查 + steering。
6. **preset 子行 → host 级行**（2.1.0）：`@local` 包说明符作为 preset 子行在桌面 realm
   反复 `never started`（依赖修复后仍失败，14:39 绝对路径形态也失败）；改挂 host 级
   （decoration 模板的标准形态）后行即时激活——headless 与桌面 cordis 会话均实证收到注入。
   **注意模块代际**：行激活复用进程内已导入的 URL 缓存，12:19 导入的是当时磁盘上的
   v2.0；v2.1 的行为（上限 5、closing reply 文案、倍数复触发）要等应用重启才生效。
   preset realm 对 `@local` 子行的解析仍视为无先例形态，不再使用。
7. **v2.1 反稀释（首次真用反馈 2026-11-17）**：用户判词"讲解有点少，疑似被
   dsh react 结尾的 summary 稀释"。取证（session-2e2176ad turn 1，逐步重建）：
   3 条提示全部落在 step 3–5（上限 3 提前耗尽），中间步骤文本仅 30–65 字被扫读，
   教学只剩 951 字的收尾回复；宿主事件目录证实 **turn 结束没有独立 summary 进程**
   （`agent/turn-stopping` 为 serial 观察，"the model owes no response"）——
   稀释是注意力问题不是改写问题。修法三处：提示文案点名"closing reply"、
   上限 3→5、diversity 按阈值倍数复触发；心法层同步加"收尾回收"原则（SKILL v2）。
   仿真测试 12/12（`.tmp/test-teacher-v21.mjs`，无 LLM 确定性回放）。
   turn-stopping 义务检查继续等证据：若 v2.1 后仍常漏讲，再升格。

## 验证

### 机制层（已通过，headless 正向实验）

`dsh --profile headless --patch <model overlay> --patch growth-headless.patch.yml`，
任务=读不存在文件→读存在文件→写文件：

- stderr 无激活告警（插件启动）；
- 会话日志 `agent/inbox/spliced`（seq 21）+ `user/message`（seq 25，
  `source.kind = growth-teacher`，summary "read recovery"）；
- 最终回答含教学子句（对照组：插件未加载的前一轮，同任务只叙述不讲教训）；
- 新地点提示按设计**未**触发（文件先读后写），diversity 未达阈值——静默符合预期。

桌面 realm（host 级行激活后，2026-11-17 15:2x，cordis 座位的本会话实收三条）：
diversity（"orchestrates 3 different tools"）、recovery（edit 失败后成功）、
new-place（dsh-adapter.md 被修改）——三类检测器在真实工作负载下各命中一次，
无一空转。注意：当时运行的是 12:19 缓存的 v2.0 代际（提示文案为旧版），
v2.1 行为需重启后验证。

### 座位层（已通过，2026-11-17）

GUI "+" 首次报 `agent-preset/invalid: growth-teacher: never started`，根因见决策 2/3；
修复并 remove+install 重建 revision 后，GUI Growth 座位会话 session-2e2176ad 实证通过。
判定按三层：**挂载**（declaration 行 active）≠ **激活**（preset realm 子行 started）
≠ **行为**（注入出现且模型就地教学）——三层各有留痕：

- 挂载：`agent-preset/selected: growth`（该会话 seq 3，12:19，修复后首次 GUI 选座）；
  投影 `agentPreset.val = "growth"`；persona suffix 与随包技能 `teaching-loop`
  （经 `customSkillDirs`）出现在系统提示与技能目录；
- 激活：无 `agent-preset/invalid`，growth-teacher 在本会话 realm 内运行；
- 行为：`agent/inbox/spliced`（seq 38/48/58）→ 提交为 `user/message`
  （seq 42/52/62，`source.kind = "growth-teacher"`，diversity 摘要
  "this interval now orchestrates 3 different tools"），模型就地教学。

备注：本次座位经 GUI 选座器设定，"+" 继承走同一 revision 加载路径；
schedule 会话捕获创建者座位的语义已由 bf40eece 单独实证（见 README）。

## 已知限制与运维

- link 安装：移动 `dsh-modes/growth-preset/` 目录需 remove+install；
  改 `index.js` 后 revision 由 remove+install 重建，但**若模块曾被成功导入，
  需重启应用**才加载新 JS 代际。
- 两处硬编码本机绝对路径（子行 name、customSkillDirs）——个人 profile 资产，可接受。
- 学习账本是区间级内存；跨会话"用户已知什么"的持久账本在研究议程里，
  出现重复教学再做。
- 无 UI 面（成长面板）；产品明确要求时走毕业路径。
