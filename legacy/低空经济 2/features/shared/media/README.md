# Safe media

`SafeMedia.vue` reserves an aspect ratio before loading, shows a skeleton, lazy-loads by default, reports failures, renders a stable fallback, and optionally opens the platform image preview.

Use a registry entry instead of a bare path so every image has dimensions and meaningful alternative text:

```vue
<safe-media v-bind="media" page="academy-learning" previewable />
```

The component emits `load`, `error`, and `preview`. The `onError` prop accepts an application logging hook; without one, failures are reported with a structured `console.warn` payload. Keep carousel frames sized by their container and pass `lazy="false"` only for the initially visible image.

Video and live-room entries must set a truthful `badge` when only a still image exists. A demonstration cover is not a playable video or a live-stream source.
