import { supportedLocales, translate } from '../../../data/localization.js'

export const LOCALE_STORAGE_KEY = 'lowair-demo-locale'
const listeners = new Set()

function normalizeLocale(locale) {
  return supportedLocales.includes(locale) ? locale : 'zh'
}

function storedLocale() {
  if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') return 'zh'
  return normalizeLocale(uni.getStorageSync(LOCALE_STORAGE_KEY))
}

let activeLocale = storedLocale()
let bridgeInstalled = false
let domObserver = null
let documentRefreshQueued = false

function applyLocaleToViewModel(viewModel, locale, visited = new Set()) {
  if (!viewModel || visited.has(viewModel)) return
  visited.add(viewModel)
  if (viewModel.$data && Object.prototype.hasOwnProperty.call(viewModel.$data, 'locale')) viewModel.locale = locale
  if (typeof viewModel.$forceUpdate === 'function') viewModel.$forceUpdate()
  ;(viewModel.$children || []).forEach((child) => applyLocaleToViewModel(child, locale, visited))
}

function refreshMountedPages(locale) {
  if (typeof globalThis.getCurrentPages !== 'function') return
  try {
    globalThis.getCurrentPages().forEach((page) => applyLocaleToViewModel(page.$vm, locale))
  } catch (_) {
    // Some uni-app runtimes do not expose page view models. Their reactive
    // AppPageShell and H5 text bridge still receive the locale event.
  }
}

function localizeElement(element, locale) {
  if (!element || ['SCRIPT', 'STYLE'].includes(element.tagName)) return
  ;['placeholder', 'aria-label', 'title'].forEach((attribute) => {
    const current = element.getAttribute?.(attribute)
    if (!current) return
    const sourceKey = `__lowairSource_${attribute}`
    const source = element[sourceKey] || current
    const translated = translate(source, locale)
    if (translated === source && locale !== 'zh') return
    if (current === translated) return
    element[sourceKey] = source
    element.setAttribute(attribute, translated)
  })
  if (['INPUT', 'TEXTAREA'].includes(element.tagName)) return
  Array.from(element.childNodes || []).forEach((node) => {
    if (node.nodeType !== 3) return
    const current = node.nodeValue || ''
    const source = node.__lowairSource || current.trim()
    if (!source) return
    const translated = translate(source, locale)
    if (translated === source && locale !== 'zh') return
    node.__lowairSource = source
    const visible = current.trim()
    if (visible === translated) return
    node.nodeValue = visible ? current.replace(visible, translated) : current
  })
}

/** Translate registered static UI text after route data or async UI changes. */
export function localizeDocument(locale = activeLocale) {
  if (typeof document === 'undefined' || !document.body) return
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale
  document.querySelectorAll('*').forEach((element) => localizeElement(element, locale))
}

/**
 * Install once from App.vue. The bridge keeps existing pages in sync and is
 * deliberately limited to dictionary keys, so API values and user input are
 * never machine-modified.
 */
export function installLocaleBridge() {
  if (bridgeInstalled) return
  bridgeInstalled = true
  const apply = (locale) => {
    refreshMountedPages(locale)
    if (typeof document === 'undefined') return
    const run = () => localizeDocument(locale)
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
    else setTimeout(run, 0)
  }
  subscribeLocale(apply)
  apply(activeLocale)
  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    domObserver = new MutationObserver(() => {
      if (documentRefreshQueued) return
      documentRefreshQueued = true
      const run = () => { documentRefreshQueued = false; localizeDocument(activeLocale) }
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
      else setTimeout(run, 0)
    })
    const observe = () => domObserver?.observe(document.body, { childList: true, subtree: true, characterData: true })
    if (document.body) observe()
    else document.addEventListener('DOMContentLoaded', observe, { once: true })
  }
}

/** The current visible language.  Route, filter and API values stay untouched. */
export function getLocale() {
  return activeLocale
}

/**
 * Changes the display language and synchronously notifies mounted screens.
 * This is deliberately separate from localStorage so a page already on screen
 * redraws immediately instead of waiting for its next lifecycle hook.
 */
export function setLocale(locale) {
  const nextLocale = normalizeLocale(locale)
  activeLocale = nextLocale
  if (typeof uni !== 'undefined' && typeof uni.setStorageSync === 'function') {
    uni.setStorageSync(LOCALE_STORAGE_KEY, nextLocale)
  }
  listeners.forEach((listener) => listener(nextLocale))
  return nextLocale
}

export function subscribeLocale(listener) {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function t(key, params, locale = activeLocale) {
  return translate(key, locale, params)
}
