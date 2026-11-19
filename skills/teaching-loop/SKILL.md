---
name: teaching-loop
description: Use in Growth sessions to teach the user what happened and what was learned at the moment of discovery, instead of appending a tail section. Owns the craft of "how to tell it well".
---

# Teaching loop

Growth sessions run two loops. The task loop advances the request. The teaching
loop converts progress into user-side understanding. The `growth-teacher` plugin
delivers advisory cues inside the ReAct cycle (as injected notices, source
`growth-teacher`); this skill owns what a good teaching beat looks like.

## Principles (v2 — 首次真用反馈 2026-11-17：讲得太少，且被收尾 summary 稀释)

1. **Teach at discovery, not at the end.** When a cue arrives, weave one sentence
   into the next output where the fact matters. A tail appendix after the user
   already read everything is the failure mode this mode exists to remove.
   Discovery beats are provisional — rule 8 recollects them at closing.
2. **One concept per beat.** Name it, anchor it (path, command, line, version,
   event name), stop. Two anchors are already too many.
3. **Lead with the change for the learner** ("this means you can…", "so the
   adapter no longer needs…"), not with a definition.
4. **Never re-teach what this interval already taught.** The cue summary names
   what fired; if you covered it, drop it silently — no meta-commentary about
   the cue itself. Re-collecting per rule 8 does not count as re-teaching.
5. **Separate 做了什么 from 学了什么.** 做了什么 is an action with a location;
   学了什么 is a fact or insight the user did not have before this session.
   Most replies have the first and mistake it for the second.
6. **待你确认 is reserved for decisions only the user owns.** Verification you can
   run yourself is never a 待你确认 item.
7. **Budget: teaching stays under ~30% of reply length.** The learner asked for
   more teaching, not less (2026-11-17); when in doubt, keep the beat and cut
   adjectives.
8. **The closing reply is what survives.** Users skim or collapse mid-turn
   narration; the wrap-up is the durable read. Evidence (session-2e2176ad
   turn 1): cues fired at steps 3–5, intermediate texts averaged ~50 chars,
   only the 951-char closing reply carried teaching. Before closing, re-collect
   every lesson seen only in narration as one compressed line — 学了什么 is
   that place.

## Responding to growth-teacher cues

Cues are advisory, like repeat-tool-reminder: fold the lesson into ongoing
output; never stop the task to lecture, never answer a cue with a sentence
about the cue. A denied or failed call that later recovers is the highest-value
cue type — the fix is a lesson the user will hit too.

## Research agenda (怎么讲能讲得更好)

- Track which cue types the user acts on versus ignores; demote noisy detectors
  (config `exclude`, thresholds) instead of raising their volume.
- Trial question-style beats ("why do you think the first call failed?") for
  retention — sparingly, max one per session, and only on real forks.
- When cross-session repetition shows up, graduate the learner ledger from
  per-interval memory to a durable store (storage domain or session projection).
- Review monthly: which three teachings actually changed how the user works?
  That is the only acceptance metric this skill recognizes.
