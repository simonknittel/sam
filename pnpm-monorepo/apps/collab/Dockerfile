# Build context is the pnpm-monorepo directory:
#   docker build -f apps/collab/Dockerfile .
FROM node:24.20.0-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS build
RUN corepack enable
WORKDIR /monorepo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/collab/package.json apps/collab/
COPY packages/database/package.json packages/database/
COPY packages/wiki-editor/package.json packages/wiki-editor/
RUN pnpm install --frozen-lockfile --filter "@sam-monorepo/collab..." --ignore-scripts

COPY packages/database packages/database
COPY packages/wiki-editor packages/wiki-editor
COPY apps/collab apps/collab
RUN pnpm --filter "@sam-monorepo/collab..." run build
# Materializes the server with only its production dependencies (including
# the injected workspace packages) into a standalone directory. Everything
# is already built, so dependency build scripts are skipped — without
# --ignore-scripts pnpm fails on the workspace packages' postinstall
# scripts, which are not in allowBuilds.
RUN pnpm --filter "@sam-monorepo/collab" deploy --prod --ignore-scripts /deploy

FROM node:24.20.0-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /deploy ./

EXPOSE 5210
CMD ["node", "dist/index.js"]
