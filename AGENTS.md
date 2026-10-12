# Agent directives

These rules bind every agent and person working in this repo. This
project's own rules go here, outside temple-bar's block below.

<!-- BEGIN:temple-bar: setup rewrites this block; edit outside it -->

## Start here

For a new project, or a request whose goal isn't clear: ask the user what
we're building and who it is for, before anything else. Then plan.

Stack conventions live in [docs/conventions.md](docs/conventions.md): read
them before writing code. The reasons behind these rules are in
[docs/agents-rationale.md](docs/agents-rationale.md).

## Plans

Non-trivial work starts with a written plan the user has approved, scaled to
the change: a one-line fix needs a branch, not a plan. Break the work into
verifiable phases, say which can run in parallel, and rate each one
**routine**, **involved** or **delicate** so the user can choose models.
Never pick or switch models yourself. Ask questions before the work, not
during it.

The user sets scope by placing issues in a milestone. Its plan is a short
file, `docs/plans/<milestone>.md`, approved through a pull request: you
group the issues into phases by the files each touches, and give each phase
that closes several issues its `One concern:` reason. Progress goes on
the issues, never in the plan.

Decisions agreed in discussion become ADRs in `docs/adr/`, from
[the template](docs/adr/0000-template.md), which the user approves. Briefs,
summaries and every issue's premise are checked against the ADRs and git
history, not memory; a new issue cites what set the current state (an ADR,
commit or pull request).

## Tracking and sessions

GitHub issues are the tracker: update the issue you work on **at every
subtask**, not at phase end. Drafts go in `.temple-bar/`, this checkout's
gitignored working folder.

**Before work stops** (a compact, a pause, a usage limit, a switch of tool;
judge it from what the user says), write the state on the issue: the base
commit (SHA) and the branch; the exact command that reproduces the problem
or proves the work is done; what has been ruled out, with the reason for
each; the next action. No private details. Show the user the exact text and
post it only after their yes (this update only, not routine ones).

Clear or compact only at a phase boundary, and ask first. On resume, read
git, open pull requests and the issue; don't ask the user to remember. How:
[docs/phase-boundaries.md](docs/phase-boundaries.md).

## Branches and commits

The default branch changes only through merged pull requests, each squashed:
one branch, one pull request, one commit. Never commit to it directly, even
a one-line fix. Every branch gets its own worktree.

- **Commit at every point where the checks pass.** Never hold a large
  uncommitted change; commit a clean baseline before debugging, so going
  back is safe.
- **Read history before changing code** (`git log -S`, `git blame`).
- **Commit messages** and pull request titles: a conventional prefix
  (`feat`, `fix`, `docs` or `chore`), proportional to the change, and a
  subject that names the change, never the trigger ("address feedback").

## Pull requests and merges

- **Push once, when finished.** Every push runs the full CI. Push when the
  work is final, and for anything that needs the user's yes, once they have
  agreed it. `pnpm exec temple-bar ready` runs the gate and marks the
  commit; the `pre-push` hook refuses an unmarked one.
- **One concern per pull request.** One closing two or more issues needs a
  `One concern:` line giving a reason that counts (see the rationale doc).
- **Merge with `pnpm exec temple-bar merge <N>`** once CI and code scanning
  are green. A change to AGENTS.md or to the checks, or one that tags or
  publishes, needs the user's yes first. The judge refuses a change to the
  checks it guards: the user merges that one as admin. Never rewrite a
  pushed branch.
- **One bullet per distinct change** in the pull request description, as a
  top-level list: merge turns the title and those bullets into the squash
  commit.

## Checks and verification

CI runs `pnpm gate`: the project's checks and temple-bar's own.

- **The gate's scripts are real.** `typecheck`, `lint`, `format:check` and
  `test` run the right commands for this stack, never no-ops.
- The full suite runs whatever changed. Never weaken a check, suppress a
  rule or skip a test to make it pass: fix the cause, or change the check
  deliberately in its own reviewed change. With no clean fix, stop and
  report.
- **A refusal is a stop, not a detour.** When a sandbox, permission check or
  hook refuses something, stop and report. Never install anything globally.
- **Break-it evidence for every new check:** disable the fix, show the check
  fail with its own message, then restore it.
- **Diagnose before working around.** "Flaky" is not a diagnosis.
- **Two strikes, then stop.** After two failed attempts at the same fix, or
  the user saying twice that it's still broken: go back to the last clean
  commit, search upstream issues and changelogs, and report. You may
  suggest a fresh subagent. The user saying it twice is also a moment to
  propose an incident.
- **Verified means exercised through the real delivery path** (the built
  app, the packed package), not only the source tree. Say "passes locally;
  CI not yet seen" until a CI run is green.
- Write tests that assert behaviour worth protecting. Do not pad the count.

## Security

Review every change that touches authentication, user input, secrets, file
or network access, or dependencies before its pull request: injection,
secrets in code or logs, unsafe defaults, where a new dependency comes from.
Say what you checked. Never commit secrets or private details (customer
data, internal hostnames) in code, issues or commit messages.

## Delegation

Delegate to keep the reviewer's context clean, not only to go faster.
Justify parallel work, and never split it across overlapping files. Don't
edit a file you delegated until its subagent reports back. Shared files
(root package.json, the lockfile, tsconfig, lint config) are the
orchestrator's. Subagents commit only; every merge and push is the
orchestrator's. A handoff report has three parts: _resolved_, _deliberately
deferred_, _needs a decision_, with break-it evidence for each new check, and
says whether anything ran outside the sandbox.

**Review bar.** The orchestrator reads every line of a subagent's change,
lists what it must defend against, and checks each item. Rerunning the
checks is not a review.

## Code

- **File length** is capped by the gate. Split along seams; never raise the
  cap to fit.
- **Deep modules**, and **seams** around the filesystem, network, clock and
  prompts so tests can fake them.
- **Comments explain why, in plain words.** No task IDs; history belongs in
  git and ADRs.
- **Wide changes:** when a change touches many files, ask out loud whether
  one change is spread across them or they duplicate each other. If they
  duplicate, fix that instead, and record the replaced choice as an ADR in
  `docs/adr/`, from [the template](docs/adr/0000-template.md).

## Incidents

When something goes wrong (rework, confusion, a rule that got in the way or
was broken), propose an incident to the user there and then. On a yes,
comment on a similar one in
[temple-bar's issues](https://github.com/londontypescript/temple-bar/issues)
or open one titled `incident: <what went wrong>`; never in this repo, never
with private details. temple-bar's maintainers curate them.

Keep this file within 200 lines and 32 KiB (the gate checks). When it grows
past them, move this project's own text to docs, never this block.

<!-- END:temple-bar -->
