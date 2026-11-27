# Build context is the pnpm-monorepo directory:
#   docker build -f apps/relay/Dockerfile .
# The base images are Docker Hardened Images (see the requirements in
# docs/setup-local-machine.md). The runtime image has no shell and no package
# manager and runs as the user node.
FROM dhi.io/node:26.13.1-alpine3.23-dev@sha256:414d515a93958ecc003d5765e753e4ba70845f0c575f1004b2e8bd1d3fab2cef AS build
RUN corepack enable
WORKDIR /monorepo

# The workspace packages of the relay service and their workspace
# dependencies (application uses wiki-editor)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/relay/package.json apps/relay/
COPY packages/application/package.json packages/application/
COPY packages/database/package.json packages/database/
COPY packages/domain/package.json packages/domain/
COPY packages/infrastructure/package.json packages/infrastructure/
COPY packages/wiki-editor/package.json packages/wiki-editor/
RUN pnpm install --frozen-lockfile --filter "@sam-monorepo/relay..." --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/application packages/application
COPY packages/database packages/database
COPY packages/domain packages/domain
COPY packages/infrastructure packages/infrastructure
COPY packages/wiki-editor packages/wiki-editor
COPY apps/relay apps/relay
# The build of packages/database generates the Prisma client
RUN pnpm --filter "@sam-monorepo/relay..." run build
# See apps/collab/Dockerfile for the reason of --ignore-scripts
RUN pnpm --filter "@sam-monorepo/relay" deploy --prod --ignore-scripts /deploy

FROM dhi.io/node:26.13.1-alpine3.23@sha256:9810cc00c2c7662a61c491d374065121f991222cedd2b8f7c5bb39cd658f429c
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /deploy ./

EXPOSE 5220
CMD ["node", "dist/index.js"]
