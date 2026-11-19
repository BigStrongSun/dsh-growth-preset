/**
 * Growth teaching loop: watches the ReAct cycle on `tools/post-execute` and
 * attaches advisory teaching cues through the decision's `additionalContexts`,
 * so the model teaches at the moment of discovery instead of appending a tail
 * section. Pattern follows @deepseek-ai/dsh-repeat-tool-reminder: per-agent
 * state in a WeakMap, cleared when a new user prompt enters at `agent/pre-step`
 * (one teaching interval = one user-prompt-to-user-prompt span).
 * Dependency-free by design: path-named rows import as raw file URLs where
 * bare specifiers like @deepseek-ai/schemastery do not resolve.
 */

export const name = "growth-teacher";

const DEFAULTS = {
  /** Advisory cues per teaching interval; noise guard. */
  maxNudgesPerInterval: 5,
  /** Distinct tools reached in one interval that triggers an orchestration beat. */
  effortToolDiversity: 3,
  /** Bookkeeping tools that never produce candidates or counts. */
  exclude: ["todo_write"],
  /** Tool names whose first touched path is worth teaching (mutations only). */
  touchTools: ["write", "edit"],
};

function notice(text, summary) {
  return {
    id: globalThis.crypto.randomUUID(),
    role: "user",
    content: [{ type: "text", text }],
    source: { kind: "growth-teacher", form: "notice", summary },
  };
}

function pathOf(args) {
  for (const key of ["file_path", "path", "dir", "root"]) {
    const value = args?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function apply(ctx, config) {
  const cfg = { ...DEFAULTS, ...(config ?? {}) };
  const ledgers = /* @__PURE__ */ new WeakMap();
  function ledger(agent) {
    let state = ledgers.get(agent);
    if (state === undefined) {
      state = {
        nudges: 0,
        seenPaths: /* @__PURE__ */ new Set(),
        failedTools: /* @__PURE__ */ new Set(),
        toolKinds: /* @__PURE__ */ new Set(),
      };
      ledgers.set(agent, state);
    }
    return state;
  }
  function candidate(state, text, summary) {
    if (state.nudges >= cfg.maxNudgesPerInterval) return undefined;
    state.nudges += 1;
    return notice(
      `Growth teaching cue: ${text} If the user does not know this yet, teach it in one sentence, anchored to the evidence — in your next output, and if you keep working after that, carry it into your closing reply so the wrap-up does not drop it (mid-turn narration gets skimmed). Skip it when already covered.`,
      summary,
    );
  }
  ctx.on("tools/post-execute", async (exec, result, next) => {
    const downstream = await next();
    if (!exec.agent || cfg.exclude.includes(exec.name)) return downstream;
    const state = ledger(exec.agent);
    const contexts = [];
    const failed = Boolean(result?.error) || downstream?.kind === "block";
    if (failed) {
      state.failedTools.add(exec.name);
    } else if (state.failedTools.has(exec.name)) {
      state.failedTools.delete(exec.name);
      const cue = candidate(
        state,
        `${exec.name} failed earlier in this interval and now succeeded — the fix is a lesson.`,
        `${exec.name} recovery`,
      );
      if (cue !== undefined) contexts.push(cue);
    }
    const path = pathOf(exec.arguments);
    if (path !== undefined) {
      const firstSeen = !state.seenPaths.has(path);
      state.seenPaths.add(path);
      if (firstSeen && cfg.touchTools.includes(exec.name) && state.seenPaths.size > 1) {
        const cue = candidate(state, `a new place was changed: ${path}`, path);
        if (cue !== undefined) contexts.push(cue);
      }
    }
    state.toolKinds.add(exec.name);
    if (
      state.toolKinds.size >= cfg.effortToolDiversity &&
      state.toolKinds.size % cfg.effortToolDiversity === 0
    ) {
      const cue = candidate(
        state,
        `this interval now orchestrates ${state.toolKinds.size} different tools.`,
        "tool diversity",
      );
      if (cue !== undefined) contexts.push(cue);
    }
    if (contexts.length === 0) return downstream;
    return {
      ...downstream,
      additionalContexts: [...contexts, ...(downstream.additionalContexts ?? [])],
    };
  });
  ctx.on("agent/pre-step", ({ agent, messages }, next) => {
    if (messages.some((message) => message.source?.kind === "user")) {
      ledgers.delete(agent);
    }
    return next();
  });
}

export { apply };
