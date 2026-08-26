# Reading the project profile

Every skill that runs against a project reads `.agents/profile.yaml` from the root of
the **current project** before anything else. This file says what that means, so each
skill only has to name the keys it reads.

## The file

Read it first, always. If it doesn't exist, tell the user to run `/sdd-bootstrap` and
**stop** — without a profile you don't know this project's conventions, and guessing
them writes artifacts that don't belong to this codebase.

The file is a YAML map of named blocks. A key holding `null` is **not configured**: use
the fallback the skill declares for that key, never a guessed value. A skill that
declares no fallback for a key it needs treats the `null` as a stop.

## Ports

Tools come from the profile's `ports` block. A skill names the **capability** it needs —
a port — and the block says which command, agent or MCP tool provides it in this
project. Run the first adapter that resolves. When an adapter resolves and then
*fails*, report that failure instead of falling through to the next one: a failing
adapter is a real result, not an absent one.

A port with no usable adapter is **unbound**. What the skill does then is its own
`Degrades` row — never silent, never a substitute tool picked on the spot.

A skill that binds no port says so in its own profile block.

## Examples are examples

Anything a skill document shows concretely — a path, an id, a branch name, a command, a
framework, a tool, a tracker, a diagram notation, a stack convention — is an **example
resolution**. The profile's value wins wherever the two disagree.

Each skill lists the keys it actually reads under **Profile keys** in its `Contract`.
