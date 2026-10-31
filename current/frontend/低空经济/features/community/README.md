# Community feature

- Routes: all `pages/community/**` routes.
- Owned files: `features/community/**` and thin community route shells.
- API boundary: posts, comments, media, knowledge, live rooms, local circles and moderation belong in `services/`.
- Runtime data source: community pages call the API boundary above; fixtures are only for isolated UI tests and are never silently used as an API fallback.

## Backend contracts

- `GET /community/posts?tab=&page=&page_size=&cursor=` returns `{ items, next_cursor, has_more }`. Each post includes authoritative `stats`, `liked`, `saved`, and `permissions` (`like`, `save`, `share`, `comment`, `report`, `delete`, `moderate`).
- `GET /community/posts/:id`, `POST /community/posts`, `PUT /community/posts/:id/reactions`, `POST /community/posts/:id/comments`, `POST /community/posts/:id/shares`, and `DELETE /community/posts/:id` enforce visibility, role, ownership, moderation, and counters server-side.
- `POST /community/content-validation` and `POST /community/media` provide content safety decisions and multipart/object-storage upload results. Media responses must include an `id` or `url`.
- `POST /community/reports` accepts post, comment, knowledge, live-comment, field, and AI targets and returns a moderation case id.
- `GET /community/knowledge`, `GET /community/knowledge/:id`, and the `questions`/`answers`/`accept` subresources return source, published/updated time, review status, answer permissions, accepted state, and server-calculated points-settlement status. Official labels require a verified publisher or trust status.
- `GET /community/live-rooms`, `POST /community/live-rooms/:id/comments`, and `PUT /community/live-rooms/:id/reminder` return state and optional HTTPS `streamUrl`/`playbackUrl`; no URL means an explicit demo placeholder.
- `GET /community/nearby` accepts either `location_mode=city&city=` or `location_mode=authorized&latitude=&longitude=` after system authorization. Results include privacy-filtered map centre/markers, distance text, source, `updatedAt`, risk status, and must never be treated as flight permission. `PUT /community/events/:id/registration` owns capacity and registration status.
