# Plan: adopt temple-bar 0.0.10 in tate-modern

Status: **approved 2026-10-12, in progress.** Written that day from the handover note, checked against
temple-bar's published 0.0.10 source (`git show v0.0.10:…` in the temple-bar repo), then revised after an
adversarial review by ChatGPT Sol 6.1 (effort medium, 12 findings, all accepted; see the end). Each step's
outcome, and progress, is logged on londontypescript/temple-bar#375.

Changes from the plan, made while carrying it out and reviewed:
`printWidth` 120 rather than 110 (fewest changed lines); no `.prettierignore` entries for setup's files,
which pass `prettier --check` as written; Knip's findings resolved by dropping `export` from module-local
declarations, deleting two dead functions and tagging the one documented website component `@public`,
rather than a `knip.json`; Vitest limited to `src/` and `scripts/`, since agents' worktrees hold copies of
the tests.

## Goal

Turn the local LTS Design Studio repo into the public `londontypescript/tate-modern`, running on the
published temple-bar 0.0.10 the way a real npm-era project would adopt it, and keep a record of every
rough edge as evidence for temple-bar.

## Where things stand

- Local repo only, no remote. Clean `main` at `b4d22b3`, 9 signed commits, author `nnsee.nain@gmail.com`
  (already public through temple-bar; publishing it is agreed).
- npm (`package-lock.json`), TypeScript 7.0.2, no ESLint or Prettier, 66 Vitest tests passing.
  Node 24.21.0 and pnpm 10.34.5 on this machine.
- `londontypescript/tate-modern` today is only GitHub's redirect to the renamed
  `londontypescript/tate-modern-prototype`.

## What 0.0.10 actually does, against the handover outline

1. **Setup refuses this repo as it is,** before writing anything: the folder has a `package-lock.json`
   (`create-temple-bar/src/main.ts`, `notPnpmReason`). Its advice (install pnpm, rerun) loops for someone
   who already has pnpm. So the npm → pnpm switch comes first, in its own pull request.
2. **`--create-repo` would make the wrong repository:** `gh repo create <main checkout's folder name>`
   with no owner, so `nnseenain/tate-modern` under the personal account. `gh`'s `git_protocol` here is
   `https` (gh's behaviour, not temple-bar's), and git only has SSH. So the repo is created by hand.
3. **Without a terminal, setup never asks the ruleset question.** It prints the manual steps, exits
   non-zero, and has still written its files and installed the hooks. By then the launcher has also added
   the dev dependency, updated the lockfile and run a frozen install. The approved continuation is
   `pnpm exec temple-bar init --create-ruleset`, not the launcher again. With an existing origin and
   history, `init` neither commits nor pushes.
4. **Setup writes more than `AGENTS.md` and the workflows:** also `CLAUDE.md`, `docs/agents-rationale.md`,
   `docs/phase-boundaries.md`, `docs/conventions.md` and `docs/adr/0000-template.md`. Hooks and
   `pull.ff=only` are local git state, not files.
5. **`pnpm gate` passing doesn't allow a push.** The pre-push hook needs the branch tip to carry the
   worktree's ready mark: commit everything, run `pnpm exec temple-bar ready` (clean checkout; it runs
   the gate), then push.
6. **The setup pull request can't merge through `temple-bar merge`.** New workflows, the `gate` and
   `lint` scripts, the temple-bar pin and its lockfile entries are all judge-guarded; `merge` refuses them
   whatever the flags. On this first pull request the judge isn't on `main` yet, so there's no judge run
   at all. It's merged by you, as a repository admin.
7. **Squash merges collapse "its own commit".** The reformat needs its own pull request to have its own
   commit on `main` for `.git-blame-ignore-revs`.
8. **The gate never builds the studio.** It runs `typecheck`, `lint`, `format:check`, `test` plus its own
   checks (setup's files, workflow copies, a 400-line file cap, `AGENTS.md` size, markdown reference
   labels, local links, Knip on unused files, exports and types). Markdown style isn't checked, so the
   README isn't a predicted failure. The pull-request size limits (500 lines, 15 files) are measured and
   warned about but don't fail.

## Decisions

**D1. Order:** capture setup's refusal locally, create the GitHub repo and push today's `main`, then switch
to pnpm (PR A) and format (PR B) through pull requests, then set up temple-bar (PR C). (Recommended.) The
npm-era history is public either way; this order also makes the migration a reviewable pull request that
an adopter can follow. Alternative: migrate on a local branch merged before the repo exists; fewer steps.

**D2. Create the repo by hand.** With your yes:

```bash
gh repo create londontypescript/tate-modern --public --description "London TypeScript Design Studio" --source . --remote origin
git remote set-url origin git@github.com:londontypescript/tate-modern.git
git push -u origin main
```

Then confirm `main` is the default branch. This ends GitHub's redirect from the old name; the prototype's
local clone already points at its new name.

**D3. Formatting.** PR B adds Prettier and reformats, strictly mechanically, so its squash commit can go in
`.git-blame-ignore-revs`. PR C adds a `.prettierignore` for everything setup generates and checks itself
(`AGENTS.md`, `CLAUDE.md`, the companion docs, the three `temple-bar-*.yml` workflows), so `format:check`
never rewrites a file whose copy the gate compares. Generated SVGs aren't formatted by Prettier.

**D4. Lint.** ESLint flat config (`eslint.config.js`), packages pinned: typescript-eslint
`recommendedTypeChecked` with the project service, **scoped to `**/*.{ts,tsx}`**; plain JS rules for the
config file itself; `eslint-plugin-react-hooks` recommended (exact version pinned; expect a flag on the
render-time ref read at `src/concepts/three/Scene.tsx:161`); `includeIgnoreFile` for `.gitignore`.
Findings are listed before PR C's scope is fixed. A rule that can't be met is disabled on that line with
a reason, never globally.

**D5. Knip.** Real unused exports (for example exported props types used only in their own module, such as
`TypeScriptMarkProps`) get fixed. Only a genuine discovery gap gets a narrow Knip config entry, with a
comment; it's reported upstream only if it's temple-bar's or Knip's fault rather than this project's set-up.
The lazy concept imports are literal, so Knip should find them.

**D6. A build check in CI.** The gate doesn't build, and the studio's build (asset generation, `tsc`,
Vite) is what breaks on a TypeScript or dependency change. PR C adds our own `build.yml` workflow running
`pnpm build` on every pull request (temple-bar's workflows must stay byte-identical, so own jobs go in
their own file). Required in the `main` ruleset alongside temple-bar's checks. Alternative: build locally
only, recorded in each PR description.

**D7. Licence and provenance (yours to choose; a preference, so not sent to ChatGPT Sol 6.1).** No
licence means "all rights reserved"; temple-bar is MIT. Separately from that choice, before publishing:
credit three.js (MIT) in `src/concepts/projected/engine/shading.ts`, which ports its shader formulas;
note in the README where the reference images come from (`public/references/`, including the ChatGPT
original) and that you're happy publishing them; fonts arrive through Fontsource packages under the OFL,
with nothing committed.

## Steps

Each pull request gets my own review plus an independent ChatGPT Sol 6.1 review (effort high) before its
single push, then a combined pass; I show you every finding I reject. You approve every merge.

1. **Before publishing:** D7's credit and provenance notes (a local commit on `main`, since nothing is
   protected yet). History scan done by both reviewers: no secrets or local paths in any of the 154 blobs.
2. **Capture setup's refusal** locally: `pnpm create @londontypescript/temple-bar@0.0.10` on `main`, save
   the output, confirm with `git status` that nothing changed. Then draft the agreed temple-bar issue (see
   Evidence) and show it to you before filing.
3. **Create the repo** as in D2 (your yes first) and push `main`.
4. **PR A `chore: switch from npm to pnpm`:** `pnpm import`, then compare its resolved versions against
   `package-lock.json`; delete `package-lock.json`; add `packageManager: "pnpm@10.34.5"` and
   `engines.node: ">=24"`; replace npm in the `build` script, README (commands, Node requirement at line
   17, lockfile mention at line 188), `scripts/generate-assets.ts:5` and `.claude/launch.json`. Checked on
   a fresh `pnpm install --frozen-lockfile`: tests (66), typecheck, build, and all three concepts in the
   preview. No gate yet, so results go in the PR description.
5. **PR B `style: format with Prettier`:** Prettier (pinned), `.prettierrc.json` (`singleQuote: true`,
   `printWidth: 110`, chosen to match today's style), a `format:check` script, and the reformat. Same
   checks as PR A, plus the longest file recounted against the 400-line cap.
6. **Run setup on a branch:** `git switch -c chore/temple-bar-setup` first, then
   `pnpm create @londontypescript/temple-bar@0.0.10`. Expect the non-zero exit and printed manual steps;
   save the output. Ask you once for **the whole protection scope** (the `main` ruleset, CodeQL, and later
   the judge ruleset and required checks); only on your yes, run
   `pnpm exec temple-bar init --create-ruleset`. Check `pnpm -v` is 10.34.5 in any new worktree
   (temple-bar #358).
7. **PR C `chore: set up temple-bar with TypeScript 6.0.3 and ESLint`:** every file setup wrote (finding 4),
   its lockfile, TypeScript 6.0.3, ESLint (D4) with its findings fixed, Knip fixes (D5), the four scripts,
   `.prettierignore` (D3), `.git-blame-ignore-revs` for PR B, `build.yml` (D6) and this plan. If the lint
   or Knip fixes grow large, they move to their own pull request after setup. Before pushing: fresh frozen
   install, `pnpm gate`, `pnpm build`, the three concepts in the preview, then commit and
   `pnpm exec temple-bar ready`. `prepare` is reviewed by hand (the judge doesn't guard it, temple-bar
   #285). **You merge it as admin**; there's no judge run on this one.
8. **Finish protection:** once PR C is on `main` and CodeQL has analysed `main`, run
   `pnpm exec temple-bar init --create-ruleset` (covered by step 6's yes), read back the effective rules
   with `gh api`, and run the gate on `main`. Rerun if CodeQL hadn't finished. Until this is done the gate
   fails on `main`, so it happens straight after the merge.
9. **PR D `docs:` first milestone plan** (`docs/plans/<milestone>.md`) and its issues: the
   logo-comparison table items 8–15, tuning the flat fade, environment reflections for the projected
   concept. Separate approval.

Later, separately: bump the temple-bar pin in its own PR; for temple-bar #360, one PR that touches a
judge-guarded script and one with a deliberately failing check.

## Evidence for temple-bar

Kept in each PR description, then gathered into drafts for you to approve before anything is filed:

- **Agreed to file (2026-10-12), after step 2:** the `package-lock.json` refusal's advice loops for a user
  who already has pnpm; it should name the migration (`pnpm import`, remove the foreign lockfile, set
  `packageManager`), and the README's existing-project path should mention it. Separate from #360 (any
  npm project); #190 fixed the same gap for a non-pnpm `packageManager` field. Filed with step 2's real
  output and PR A's steps; draft shown first.
- **Agreed (2026-10-12): a trial-log issue** on temple-bar, "Existing-project adoption trial: tate-modern
  on 0.0.10", label `setup`, linked from #196, one comment per step. Draft approved in
  `.temple-bar/drafts/trial-log-issue.md`; filed once step 2's refusal is observed, with that output.
- Candidates: `--create-repo` ignoring the organisation; the reformat vs squash-merge conflict; whether
  setup's generated files should ship their own Prettier ignore; the first setup PR having no judge run;
  how Knip handles the R3F chunk and Tailwind 4 (for #360).

## Review record

ChatGPT Sol 6.1 adversarial review, 2026-10-12, effort medium, ~158k tokens. All 12 findings accepted;
I checked findings 1, 2, 3 and 10 against the 0.0.10 source myself.

- Blocker: push needs `temple-bar ready`, not just a passing gate (step 7).
- Major: PR C is an admin merge with no judge run (fact 6); no-terminal behaviour and setup's full file
  list (facts 3–4); the last protection step needs `--create-ruleset` (step 8); Prettier must not touch
  setup's checked files (D3); expect real unused exports (D5); scope typed lint rules (D4); the gate
  doesn't build (D6); provenance before publishing (D7).
- Minor: size limits are advisory checks, not prose; README markdownlint isn't a predicted failure; PR A's
  migration details (step 4).
- Its reordering (refusal captured before publishing; setup run on a branch) is adopted.
