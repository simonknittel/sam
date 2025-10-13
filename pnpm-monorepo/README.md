# pnpm-monorepo

## Prerequisites

- Git
- [nvm](https://github.com/creationix/nvm) and [pnpm](https://pnpm.io/)
  1. `nvm install`
  2. `corepack enable`
  3. `corepack install`

## Installation

1. Run `pnpm install` to install all dependencies
2. Configure environment variables
   1. Duplicate the `.env.examples` files to `.env` and fill in the blanks.
   2. `apps/lambda/.env.example`
   3. `packages/database/.env.example`
3. Run the app(s):
   - Lambda: `pnpm run dev:lambda`
     - Alternatively, you can use the launch configuration when using VSCode
4. Access local Lambda API at <http://localhost:3001>
