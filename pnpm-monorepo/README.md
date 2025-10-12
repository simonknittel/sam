# pnpm-monorepo

## Prerequisites

- Git
- [nvm](https://github.com/creationix/nvm)
- [pnpm](https://pnpm.io/)
  1. `corepack enable`
  2. `corepack install`

## Installation

1. Clone this Repository
2. Ensure to use the correct Node.js version which is defined in the `.nvmrc` file by running `nvm install`
3. Run `pnpm install` to install all dependencies
4. Configure environment variables
   1. Duplicate the `.env.examples` files to `.env` and fill in the blanks.
   2. `apps/lambda/.env.example`
   3. `packages/database/.env.example`
5. Run the app(s):
   - Lambda: `pnpm run dev:lambda`
     - Alternatively, you can use the launch configuration when using VSCode
6. Access local Lambda API at <http://localhost:3000>
