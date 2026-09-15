# Agent notes

## Environment

Cloud Agent bootstrap is `.cursor/environment.json`: `npm ci` then `npm run build`. Chrome is at `/usr/bin/google-chrome`. Prove the CLI with `npm test` and `npm run demo`; the marketing site is static files in `website/`.

## Pull request before merge

Always **create a pull request before merging**. `main` is not a direct-push landing branch.

- Branch off `main` for every change.
- Commit, push the feature branch, and open a PR as soon as there is work to review.
- Update that PR on later commits. Do not land work by pushing or merging to `main` yourself.
- Merge only when the user explicitly asks to merge, and only through the existing PR.
