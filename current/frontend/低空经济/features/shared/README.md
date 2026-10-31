# Shared feature utilities

This directory owns presentational components and utilities that contain no business-domain data or business workflow state.

- `components/RequestState.vue`, `EmptyState.vue`, `ErrorState.vue`, `PaginationBar.vue`, and `ConfirmDialog.vue` are reusable state views.
- `utils/formatters.js` contains shared formatting functions.
- `media/SafeMedia.vue` and `media/media-registry.js` provide loading-safe image presentation and the central accessible media registry.
- `media/ASSET_REGISTER.md` records asset provenance, processing and authorization status.

Business-specific UI, data lookup, interactions and services live in their domain directory and must not be added here.
