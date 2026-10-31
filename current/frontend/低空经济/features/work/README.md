# Work feature

- Routes: all `pages/work/**` routes.
- Owned files: `features/work/**` and thin work route shells.
- API boundary: jobs, resumes, candidates, tasks and fulfillment adapters belong in `services/`.

## API inventory

- `GET /work/jobs`: paged position list. Supports `identity`, `city`, `caac`, `aircraft`, `salary`, `dateRange`, `status`, `keyword`, `page`, `page_size`.
- `GET /work/jobs/:id`, `POST /work/jobs`, `POST /work/jobs/:id/applications`.
- `GET|PUT /work/resume`, `POST /work/resume/attachments`, `GET /work/applications`, `POST /work/applications/:id/withdraw`.
- `GET /work/interviews`, `POST /work/interviews/:id/response`.
- `GET /work/tasks`, `GET /work/tasks/:id`, `POST /work/tasks`, `POST /work/tasks/attachments`, `POST /work/tasks/:id/bids`.
- `GET /work/tasks/:id/applicants`, `POST /work/tasks/:id/applicants/:applicantId/select`.
- `GET /work/company/jobs`, `PATCH /work/company/jobs/:id`, `GET /work/company/candidates`, `POST /work/candidates/:id/interviews`, `POST /work/candidates/:id/reject`.
- `GET /work/fulfillments/:orderId`, `PATCH /work/fulfillments/:orderId/milestones/:milestoneId`, `POST /work/fulfillments/:orderId/contract-actions`.
- `POST /work/fulfillments/:orderId/deliveries`, `/acceptance`, `/disputes`, `/pause`, `/sos`.

The server owns approval, contracts, escrow, signatures, insurance, and all fulfillment state transitions. UI actions must use the returned order record rather than inferring a successful state locally.
