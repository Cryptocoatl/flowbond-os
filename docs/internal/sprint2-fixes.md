# Sprint 2 Infra Fixes (Precondition)

## packages/db
- add devDependency: @types/node

## services/api
- add dependency: drizzle-orm
- add devDependency: @types/node
- fix import:
  ./routes/clients → ./routes/clients.js

## Reason
- Node types missing → process errors
- pnpm strict deps → drizzle-orm must be direct
- NodeNext → requires .js extensions
