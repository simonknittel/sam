#!/bin/bash

# Related: https://vercel.com/guides/how-do-i-use-the-ignored-build-step-field-on-vercel

echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF";

# Only proceed for main, develop, and feature branches
if [[ "$VERCEL_GIT_COMMIT_REF" != "main" && "$VERCEL_GIT_COMMIT_REF" != "develop" && "$VERCEL_GIT_COMMIT_REF" != feature/* ]] ; then
  echo "🛑 - Build cancelled (incorrect branch)"
  exit 0;
fi

# Run from the repository root so the paths below work no matter which
# directory Vercel invokes this script from (it uses the project's Root
# Directory, pnpm-monorepo/apps/app).
cd "$(git rev-parse --show-toplevel)" || exit 1

# Only proceed when files relevant to the app have changed. The app lives in
# pnpm-monorepo/apps/app; its dependencies resolve through the workspace
# lockfile and workspace config at the pnpm-monorepo root.
if [[ ! `git diff HEAD^ HEAD -- pnpm-monorepo/apps/app pnpm-monorepo/pnpm-lock.yaml pnpm-monorepo/pnpm-workspace.yaml pnpm-monorepo/package.json pnpm-monorepo/.nvmrc` ]]; then
  echo "🛑 - Build cancelled (no app changes)"
  exit 0;
fi

echo "✅ - Build can proceed"
exit 1;
