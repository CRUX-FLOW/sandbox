# Contributing

1. Read the relevant page in the `sandbox-wiki` repository first: it is the spec. If the
   code and the wiki disagree, raise it in the pull request instead of guessing.
2. Branch from `main`; keep one change per pull request.
3. Put lending numbers in `src/domain/policy.ts`, never inline.
4. Money is integer cents everywhere; format only at the edge (`formatCents`).
5. Add or update a `bun test` case for every behaviour change, and run
   `bun test && bun run typecheck` before pushing.
6. Add a line to `CHANGELOG.md` under the next version.

Commit messages are short and imperative: `Expire holds after three days`.
