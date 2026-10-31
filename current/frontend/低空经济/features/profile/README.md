# Profile feature

- Routes: `pages/profile/**` and `pages/messages/index`.
- Owned files: `features/profile/**` and their thin route shells. Authentication remains in `pages/auth` until its dedicated migration.
- API boundary: account verification, wallet, transaction records and messages belong in `services/`; auth transport stays in `api/auth.js`.
- The profile overview reads `GET /market/cart` only for the visible cart count;
  cart mutations remain owned by `features/market`.
- Demo state: wallet balances, escrow, verification submission result and message delivery are demo-only unless supplied by the server.
