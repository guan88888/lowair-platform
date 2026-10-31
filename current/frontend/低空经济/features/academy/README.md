# Academy feature

- Routes: all `pages/academy/**` routes.
- Owned files: `features/academy/**` and thin academy route shells.
- API boundary: institutions, visits, learning progress, question bank, exams and institution console adapters belong in `services/`.
- Demo state: institution results, course progress, question content, subsidy and console metrics are mock data.

## Backend contract

All records must be scoped by the authenticated user or the authenticated institution; the client never treats a local state change as authoritative.

| Area | Endpoint | Required response / request fields |
| --- | --- | --- |
| Institutions | `GET /academy/institutions` | Query: `city`, `level`, `distance`, `priceMax`, `startDate`, `verifiedOnly`, `sort`, `page`, `page_size`; item: `id`, `name`, `image`, `distance`, `priceFrom`, `levels`, `schedules`, `verified`, coordinates (`mapX`, `mapY`) or a map provider location. |
| Institution detail | `GET /academy/institutions/:id` | `id` must identify exactly one institution. Return courses, coaches, qualification, source-backed pass-rate fields, facilities and contact policy for that institution only. |
| Visits | `GET/POST /academy/visits`, `PATCH /academy/visits/:id`, `POST /academy/visits/:id/cancel` | Booking: `institutionId`, optional `courseId`, `date`, `slot`, `partySize`, `name`, `phone`, `consent`; response includes `id`, `status`, `notification`. Server must reject duplicate active bookings and enqueue a message-center notification for create, reschedule and cancel. |
| Learning | `GET /academy/learning/curriculum`, `GET /academy/learning/state`, `PUT /academy/learning/lessons/:id/progress`, `PUT /academy/learning/plan` | Chapters and lessons include media/cover URL, duration and source. State owns `progress`, `videoPosition` and plan. Validate that the lesson belongs to the learner's enrollment. |
| Question bank | `GET /academy/question-bank/catalog`, `POST /academy/exams`, draft/answer/submit endpoints | Catalog contains group, level and counts only. Session returns stems/options without correct answers. Server randomizes the set, controls duration, grades answers, stores wrong questions/history and returns answers/explanations only after a permitted submit. |
| Policies | `GET /academy/policies/subsidies?city=` | Each policy needs city, title, effective period, conditions, materials, `sourceName` and authoritative `sourceUrl`; omit or mark unverified policy content as pending. |
| Institution console | `GET /academy/org/console`, `POST /academy/org/actions` | Return only the current institution's leads, visits, schedules, students, exam/reputation summaries and institution ID. Action payloads include a server-validated `action` plus record ID/status changes. Server enforces institution membership, role-level write permission, ownership, audit logs and soft-delete rules. |

The question favorite endpoint is `PUT /academy/exams/:sessionId/questions/:questionId/favorite`; it stores a learner preference only and must not expose answer keys.
