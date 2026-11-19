# Growth 模式（@local/dsh-growth-preset）

> 设计文档见 [DESIGN.md](DESIGN.md)（架构、机制合同、决策与否决记录、验证证据）。
> 本文件是操作入口。

创造模式（cordis preset）之上叠加**教学双循环**的自定义 agent preset。
设计动机：任务循环之外要有一个机制化的循环，持续把进展翻译成用户侧的理解——
"尾部拼接"是 prompt 约定，忙起来就丢；挂进 ReAct 管道才是机制，机制在日志里留痕。

## 安装（link 方式，桌面 / 共享 Host profile 通用）

1. 把本仓库放到约定位置——`cordis.patch.yml` 按它解析 skills 目录：
   Linux/macOS `~/dsh-modes/growth-preset`，Windows `~/Documents/dsh-modes/growth-preset`；
2. 编辑 profile 的 `package.json`（如 `~/.dsh/profiles/desktop/` 或共享 Host 的
   `~/.dsh-shared/profiles/web/`）：`dsh.profile.bundles` 追加 `@local/dsh-growth-preset`，
   `dependencies` 加 `"@local/dsh-growth-preset": "link:<绝对路径>"`；
3. 重启 Host——它会用自带 pnpm 完成 link 安装并重建 preset revision；
4. 想让新会话默认坐 Growth，在 profile 的 `cordis.patch.yml` 追加：

   ```yaml
   - id: agent-preset-registry
     name: "@deepseek-ai/dsh-agent-preset-registry"
     config:
       default: standard
       selectedDefault: growth
   ```

已装机器（2026-11-20）：本机 Windows desktop、roglinux / asus-tr / ms33-ar1 的共享 web profile。

## 三层结构

| 层 | 载体 | 职责 |
|---|---|---|
| 机制 | `index.js`（`growth-teacher` 插件，挂在 preset 的 plugins 里） | 观察循环、检测教学候选、注入提示 |
| 心法 | `skills/teaching-loop/SKILL.md` | "怎么讲得更好"的原则与研究议程；改进写在这里，不散落在对话里 |
| 身份 | `cordis.patch.yml` 里 persona 的 suffix | 一句话立场：两个循环，发现处即讲 |

## 机制细节

插件挂在 `tools/post-execute` waterfall 上，用 DSH 官方的循环内提示通道
`additionalContexts`（先例：`@deepseek-ai/dsh-repeat-tool-reminder`）：
带来源标签（`kind: growth-teacher`）的合成 user 消息，插在工具结果之后、下一步之前，
模型可见、日志可重建、append-only 不破坏 KV 缓存。

三类候选（每个用户消息区间最多 `maxNudgesPerInterval` 条，默认 5；v2.1 起
提示文案要求课程进收尾回复，防被 wrap-up 稀释）：

1. **恢复**：同一工具先失败后成功——修复本身就是一课，最高价值信号；
2. **新地点**：某路径本区间首次被**修改**（`touchTools`，默认 write/edit；只读不算，防噪音）；
3. **编排里程碑**：区间内动用的不同工具数达到 `effortToolDiversity`（默认 3）
   的整数倍（3/6/9…）时各触发一次。

状态按 agent 存于 WeakMap，新用户消息进入（`agent/pre-step`）时清账。
调参直接在 profile 的 patch 层覆盖 `growth-teacher` 行的 `config`。

## 验证状态（2026-11-17）

- bundle 2.0.0 已安装于 desktop profile，`preset-growth` 行挂载正常；
- `agent-preset-registry.selectedDefault` 已改为 `growth`（volatile 字段，热重载生效）：
  **之后在 GUI 点"+"开的新会话默认坐 Growth**；
- 实测发现：**定时任务开的"新会话"捕获的是创建者会话的座位**（schedule 记录的
  `create.agentPreset`），不读 selectedDefault——所以由 cordis 会话 schedule 出的
  验收会话仍是 cordis，用于确认捕获语义本身；
- `growth-teacher` 是 preset 插件，**被选中才激活**：已实证——GUI Growth 座位会话
  （session-2e2176ad）中注入提示（标注 `growth-teacher`）出现并被就地教学
  （diversity 候选，seq 42/52/62）；座位层通过，证据见 DESIGN.md「验证」节；
- 本仓库目录是 pnpm **link** 安装，移动目录需重装（`plugin_manager` remove → install）。

## v3 升级路径（等证据，不预做）

若实测发现模型经常无视提示：把建议升格为义务——在 `agent/turn-stopping`
检查"本回合有候选未讲"，追加一次 steering。先不做的理由：repeat-reminder 的经验
是 advisory 足够且不伤任务节奏。

## 故障排查记录

- **`YAMLException: unknown tag !!js`**（2026-11-20，roglinux 共享 Host 0.2.2-alpha.3）：
  js-yaml 的 `!!js` 只注册在**标量**节点上；值若以 `[` 开头会被解析成 flow sequence，
  标签匹配失败抛错，`loadProfileDirectory` 把整个 bundle 记入 `skippedBundles` **静默跳过**
  ——症状是点 "+" 报 `agent-preset/not-found: Unknown agent preset: growth`，而 journal 一片干净。
  修法：表达式加外层括号保持标量形态。定位手段：直接 `import` app-boot 调
  `loadProfileDirectory`，打印 `skippedBundles` 的 reason。
- **`agent-preset/invalid: growth-teacher: never started`**（2026-11-17，GUI 新建会话）根因链：
  1. profile 的 node_modules 里**没有任何 `@deepseek-ai/*` 包**（实测计数 0，`.pnpm` 空），
     而 pnpm 对目录 bundle 是 **link**——包的 realpath 在 `Documents\dsh-modes\`，
     Node 从 realpath 逐级上溯找不到依赖；
  2. 宿主 CLI 进程唯一的模块解析钩子只做 **Office 引擎重定向**（`dsh-desktop-host/lib/cli.js`），
     不负责 `@deepseek-ai/*`——技能文档那句"shipped packages resolve from the dsh installation"
     说的是安装器不用拉取依赖，**不是**运行时能从安装树解析，链接形态下两者不等价；
  3. 所以 v1 的 `import z from "@deepseek-ai/schemastery"` 在两个 realm 都会失败
     （headless 实测 `ERR_MODULE_NOT_FOUND`）；
  4. preset 的 revision 在**安装/调和时**建立，磁盘上改文件不会重建 revision——
     第一次点 "+"（10:50）命中的仍是旧 revision 的失败状态。
  **修法**：插件零依赖化（DEFAULTS 合并代替 schemastery Config）+ preset 子行改用
  绝对 index.js 路径（本安装唯一实证可加载的形态）+ remove/install 重建 revision。
- **plain-JS 插件必须零依赖**：路径行按裸 file URL 导入，不走 package.json `exports`
  （目录名报 `ERR_UNSUPPORTED_DIR_IMPORT`），裸说明符也不解析。
- **preset 子行的 `!!js` 里 `createRequire(baseUrl)` 解析不了 `@local/*`**：
  skill 目录改用字面量绝对路径。

## 循环钩子地图（DSH 实测目录摘录，供后续扩展参考）

`agent/pre-step`（waterfall，换步入消息）· `tools/pre-execute`（allow/deny/ask）·
`tools/execute`（超时/重试/计量）· `tools/post-execute`（结果富化 + additionalContexts）·
`tools/result`（终态观察）· `agent/turn-stopping`（回合关闭前义务点）·
`llm/stream`（模型调用包裹）· `session/event`（提交后事件流水）·
`approval/request` / `user-questions/request`（决策 waterfall）。
