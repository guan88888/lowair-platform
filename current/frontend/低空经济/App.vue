<script>
import { installLocaleBridge } from './features/shared/i18n'

export default {
  onLaunch() {
    console.log('Low-altitude economy app launched')
    this.applyStoredAppearance()
    installLocaleBridge()
  },
  onShow() {
    this.applyStoredAppearance()
  },
  methods: {
    applyStoredAppearance() {
      if (typeof document === 'undefined' || typeof uni === 'undefined') return
      const theme = uni.getStorageSync('lowair-demo-theme') || 'ocean'
      document.documentElement.setAttribute('data-lowair-theme', theme)
    }
  }
}
</script>

<style>
page, body { min-height: 100%; background: var(--lowair-app-bg, #061a2b); color: var(--lowair-text, #edf7f8); font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Yu Gothic UI", "Noto Sans", "Microsoft YaHei", sans-serif; font-synthesis: none; -webkit-font-smoothing: antialiased; }
:root { --lowair-app-bg: #061a2b; --lowair-text: #edf7f8; --lowair-surface: #0b263a; --lowair-line: #1d4256; --lowair-focus-ring: #75e6c7; }
:root[data-lowair-theme="mist"] { --lowair-app-bg: #e9f1f6; --lowair-text: #16343c; --lowair-surface: #ffffff; --lowair-line: #b8cbd3; --lowair-focus-ring: #126b5e; }
:root[data-lowair-theme="sky"] { --lowair-app-bg: #eaf1f8; --lowair-text: #1c3048; --lowair-surface: #ffffff; --lowair-line: #b9c9da; --lowair-focus-ring: #205f8e; }
:root[data-lowair-theme="sage"] { --lowair-app-bg: #edf2e9; --lowair-text: #25362b; --lowair-surface: #ffffff; --lowair-line: #bdcbbb; --lowair-focus-ring: #426d53; }
view, text, input, textarea, button, image, scroll-view { box-sizing: border-box; }
input, textarea, button { min-height: 44px; font: inherit; }
image { max-width: 100%; }
button::after { border: 0; }
button, [role="button"] { -webkit-tap-highlight-color: transparent; }
button:focus-visible, [role="button"]:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid var(--lowair-focus-ring); outline-offset: 2px; }
input::placeholder, textarea::placeholder { color: #667c82; opacity: 1; }
@media (forced-colors: active) { button:focus-visible, [role="button"]:focus-visible, input:focus-visible, textarea:focus-visible { outline-color: Highlight; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
</style>
