import { getRouteOptions } from '../../shared/utils/route-options.js'

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const MODES = Object.freeze({
  institutions: ['list', 'map', 'compare'],
  visit: ['booking', 'vr'],
  learning: ['guide', 'video', 'law', 'simulator'],
  exam: ['practice', 'mock', 'review'],
  progress: ['record', 'subsidy']
})

function cleanId(value) {
  const text = String(value || '').trim()
  return ID_PATTERN.test(text) ? text : ''
}

function enumValue(value, values, fallback = '') {
  return values.includes(value) ? value : fallback
}

// Academy accepts shared links while keeping route validation local to this domain.
export function getAcademyRouteOptions(page) {
  const raw = getRouteOptions({ validate: false })
  const mode = enumValue(String(raw.mode || ''), MODES[page] || [], '')
  return {
    ...raw,
    id: cleanId(raw.id),
    institutionId: cleanId(raw.institutionId),
    courseId: cleanId(raw.courseId),
    recordId: cleanId(raw.recordId),
    mode,
    tab: enumValue(String(raw.tab || ''), MODES.progress, ''),
    type: enumValue(String(raw.type || ''), ['all', 'single', 'multiple', 'judge', 'wrong'], ''),
    ids: String(raw.ids || '').split(',').map(cleanId).filter(Boolean).slice(0, 4)
  }
}
