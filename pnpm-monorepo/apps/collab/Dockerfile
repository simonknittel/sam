# Build context is the pnpm-monorepo directory:
#   docker build -f apps/collab/Dockerfile .
# The base images are Docker Hardened Images (see the requirements in
# docs/setup-local-machine.md). The runtime image has no shell and no package
# manager and runs as the user node.
FROM dhi.io/node:24.22.3-alpine3.23-dev@sha256:aae243bddd13a7449c9a458b31936fb86c2fbb377c155ec01890562ebc2e333a AS build
RUN corepack enable
WORKDIR /monorepo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/collab/package.json apps/collab/
COPY packages/database/package.json packages/database/
COPY packages/domain/package.json packages/domain/
COPY packages/wiki-editor/package.json packages/wiki-editor/
RUN pnpm install --frozen-lockfile --filter "@sam-monorepo/collab..." --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/database packages/database
COPY packages/domain packages/domain
COPY packages/wiki-editor packages/wiki-editor
COPY apps/collab apps/collab
RUN pnpm --filter "@sam-monorepo/collab..." run build
# Materializes the server with only its production dependencies (including
# the injected workspace packages) into a standalone directory. Everything
# is already built, so dependency build scripts are skipped — without
# --ignore-scripts pnpm fails on the workspace packages' postinstall
# scripts, which are not in allowBuilds.
RUN pnpm --filter "@sam-monorepo/collab" deploy --prod --ignore-scripts /deploy

FROM dhi.io/node:24.22.3-alpine3.23@sha256:056085462c7ee6d47db4e10ab26a9ff63c6cb4c1b88473096ec9c3660345cb54
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /deploy ./

EXPOSE 5210
CMD ["node", "dist/index.js"]
