# This is the contract. The SDK consumes this. Both ship together.

## Auth Note

FlowBond auth for Sprint 2 uses Reown for wallet connections and Supabase magic link for email sign-in. Privy is not part of this contract.

## REST API

| method | path | purpose | status |
|---|---|---|---|
| GET | `/health` | Service health check for the FlowBond API. | existing |
| GET | `/api/v1/clients` | List registered client apps. | existing |
| GET | `/api/v1/clients/:slug` | Fetch one registered client app by slug. | existing |
| POST | `/api/v1/clients` | Create a registered client app. | existing |
| DELETE | `/api/v1/clients/:slug` | Delete a registered client app by slug. | existing |
| POST | `/api/auth/login` | Admin login and session cookie creation. | existing |
| POST | `/api/auth/logout` | Admin logout and session cookie deletion. | existing |
| GET | `/api/public` | Public read endpoint for admin-managed site data. | existing |
| OPTIONS | `/api/public` | CORS preflight for the public data endpoint. | existing |
| GET | `/api/data` | Authenticated admin read endpoint for site data. | existing |
| POST | `/api/data` | Authenticated admin write endpoint for site data. | existing |
| POST | `/api/gallery` | Authenticated admin image upload endpoint. | existing |
| DELETE | `/api/gallery` | Authenticated admin image delete endpoint. | existing |
| GET | `/api/v1/identities/:identityId` | Fetch a FlowBond identity by ID for `fb.identity.get(identityId)`. | planned |
| GET | `/api/v1/identities/resolve` | Resolve a FlowBond identity by wallet address for `fb.identity.resolveByWallet(address)`. | planned |
| PATCH | `/api/v1/identities/:identityId` | Update profile fields for `fb.identity.update(identityId, data)`. | planned |
| GET | `/api/v1/identities/:identityId/wallets` | List wallets linked to an identity for `fb.wallets.list(identityId)`. | planned |
| POST | `/api/v1/identities/:identityId/wallets` | Link a wallet to an identity for `fb.wallets.link(identityId, wallet)`. | planned |
| PATCH | `/api/v1/identities/:identityId/wallets/:address/primary` | Set the primary wallet for `fb.wallets.setPrimary(identityId, address)`. | planned |
| PATCH | `/api/v1/identities/:identityId/wallets/:address` | Relabel or update a wallet for `fb.wallets.relabel(identityId, address, label)`. | planned |
| POST | `/api/v1/identities/:identityId/consent` | Request per-app data scopes for `fb.consent.request(identityId, request)`. | planned |
| GET | `/api/v1/identities/:identityId/consent` | List consent grants for `fb.consent.list(identityId)`. | planned |
| DELETE | `/api/v1/consent/:grantId` | Revoke a consent grant for `fb.consent.revoke(grantId)`. | planned |
| GET | `/api/v1/identities/:identityId/missions` | List available and completed missions for `fb.missions.list(identityId)`. | planned |
| POST | `/api/v1/identities/:identityId/missions/:missionId/complete` | Complete a mission with proof for `fb.missions.complete(identityId, missionId, proof)`. | planned |
| GET | `/api/v1/identities/:identityId/points` | Fetch current point balance for `fb.points.balance(identityId)`. | planned |
| GET | `/api/v1/identities/:identityId/points/history` | Fetch point history for `fb.points.history(identityId)`. | planned |
| GET | `/api/v1/prices` | Proxy token price lookup through Jupiter for `fb.prices.get(mints)`. | planned |
