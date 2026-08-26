# EARS and scenarios — the wording pass of I3/I3b

Two automatic rewrites phase I applies to the acceptance criteria. Neither is ever
asked or escalated: they change wording, not behavior.

---

### I3 — EARS rephrasing (automatic, never asked)

When an AC fails testability, rewrite it in **EARS** notation — without asking. It's
a wording reformulation: it doesn't change behavior, there's no decision to delegate.

| Pattern | Form | Use |
|---|---|---|
| Ubiquitous | `THE SYSTEM SHALL <response>` | Always-active rule |
| Event-driven | `WHEN <trigger>, THE SYSTEM SHALL <response>` | Fired by an event |
| State-driven | `WHILE <state>, THE SYSTEM SHALL <response>` | Behavior during a state |
| Unwanted | `IF <error condition>, THEN THE SYSTEM SHALL <response>` | Error/edge-case handling |
| Optional | `WHERE <feature present>, THE SYSTEM SHALL <response>` | Conditional on a feature |

- **Preserve the original text** as a `> Original: "<text>"` line underneath.
- Use several EARS lines if the AC has both a happy path and an error case.
- **Never** reformulate an AC that is already clear and testable.

### I3b — Concrete scenarios (automatic, never asked)

EARS makes an AC unambiguous; a scenario makes it **executable**. Write one
`#### Scenario:` per branch under the AC it belongs to — with the real values the
decisions in I1 settled, never placeholders:

```markdown
### AC-2: An empty result is not an error
IF no zone matches the requested service type, THEN THE SYSTEM SHALL return 200 with
an empty array.

#### Scenario: No zone offers the requested service
- **WHEN** the client requests `GET /zones?serviceType=DRONE` and no zone offers it
- **THEN** the response is 200 with an empty `data` array
```

- **`**WHEN**` and `**THEN**` are both mandatory** when a scenario exists.
  `**GIVEN**` (precondition) and `**AND**` (extra step) are optional.
- **One per branch**: happy path, error, empty result, boundary. An AC that is a
  single unconditional rule (`THE SYSTEM SHALL ...`) needs no scenario — don't
  manufacture one.
- **Observable behavior only.** No class names, no framework decisions, no
  step-by-step execution. The test: if the implementation can change without
  changing what the scenario says, the scenario is right; if it can't, it's
  describing implementation and belongs in `design.md`.
- Every resolution recorded in `## Ambiguity Resolution` that changed a **value**
  (an HTTP code, a limit, a format) should be visible in a scenario. That's what
  makes a decision testable rather than merely written down.
- This is a wording task, like EARS: never asked, never escalated.
