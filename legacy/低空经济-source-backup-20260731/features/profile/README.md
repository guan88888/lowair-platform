# Profile feature

- Routes: `pages/profile/**` and `pages/messages/index`.
- Owned files: `features/profile/**` and their thin route shells. Authentication remains in `pages/auth` until its dedicated migration.
- API boundary: account verification, wallet, transaction records and messages belong in `services/`; auth transport stays in `api/auth.js`.
- Demo state: wallet balances, escrow, verification submission result and message delivery are demo-only unless supplied by the server.
