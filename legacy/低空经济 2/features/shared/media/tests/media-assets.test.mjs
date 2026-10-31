import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileTemplate, parse } from '@vue/compiler-sfc'

const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(currentDir, '../../../..')
const registryPath = resolve(currentDir, '../media-registry.js')
const registerPath = resolve(currentDir, '../ASSET_REGISTER.md')
const registrySource = await readFile(registryPath, 'utf8')
const registerSource = await readFile(registerPath, 'utf8')
const componentPath = resolve(currentDir, '../SafeMedia.vue')
const componentSource = await readFile(componentPath, 'utf8')

const parsedComponent = parse(componentSource, { filename: componentPath })
assert.equal(parsedComponent.errors.length, 0, 'SafeMedia.vue must parse without errors')
assert.ok(parsedComponent.descriptor.template, 'SafeMedia.vue needs a template')
const compiledTemplate = compileTemplate({
  id: 'safe-media-test',
  filename: componentPath,
  source: parsedComponent.descriptor.template.content
})
assert.equal(compiledTemplate.errors.length, 0, 'SafeMedia.vue template must compile without errors')
assert.match(componentSource, /:lazy-load="lazy"/, 'SafeMedia.vue must expose lazy loading')
assert.match(componentSource, /safe-media-skeleton/, 'SafeMedia.vue must provide a skeleton')
assert.match(componentSource, /safe-media-fallback/, 'SafeMedia.vue must provide a failure placeholder')
assert.match(componentSource, /uni\.previewImage/, 'SafeMedia.vue must support image preview')
assert.match(componentSource, /reportMediaError/, 'SafeMedia.vue must report media errors')

const entryPattern = /(\w+):\s*{([\s\S]*?)\n\s*},?/g
const entries = []
for (const match of registrySource.matchAll(entryPattern)) {
  const body = match[2]
  const src = body.match(/src:\s*'([^']+)'/)?.[1]
  const alt = body.match(/alt:\s*'([^']+)'/)?.[1]
  const width = Number(body.match(/width:\s*(\d+)/)?.[1])
  const height = Number(body.match(/height:\s*(\d+)/)?.[1])
  if (src) entries.push({ key: match[1], src, alt, width, height })
}

assert.ok(entries.length >= 14, 'expected every project media asset to be registered')

for (const entry of entries) {
  assert.ok(entry.alt && entry.alt.trim().length >= 8, `${entry.key} needs descriptive alt text`)
  assert.ok(entry.width > 0 && entry.height > 0, `${entry.key} needs intrinsic dimensions`)
  assert.match(entry.src, /^\/static\/images\/[a-z0-9-]+\.(png|jpg)$/i, `${entry.key} has an unsafe or invalid path`)
  const path = resolve(projectRoot, entry.src.slice(1))
  const info = await stat(path)
  assert.ok(info.isFile(), `${entry.src} is missing`)
  assert.ok(info.size <= 1_500_000, `${entry.src} exceeds the 1.5 MB media budget`)
  assert.ok(registerSource.includes(entry.src.split('/').pop()), `${entry.src} is missing from ASSET_REGISTER.md`)
  assert.ok(['.png', '.jpg'].includes(extname(path).toLowerCase()), `${entry.src} uses an unsupported format`)
}

const sourceTree = await Promise.all([
  'features/home/mock/page-data.js',
  'features/academy/mock/page-data.js',
  'features/work/mock/page-data.js',
  'features/market/mock/page-data.js',
  'features/community/mock/page-data.js',
  'features/assistant/mock/page-data.js'
].map((path) => readFile(resolve(projectRoot, path), 'utf8')))

for (const source of sourceTree) {
  assert.doesNotMatch(source, /https?:\/\//, 'domain media mappings must not embed remote media or model endpoints')
  assert.doesNotMatch(source, /(api[_-]?key|secret|bearer\s+[a-z0-9._-]+)/i, 'media data must not contain credentials')
}

assert.match(registrySource, /learningVideoDemo:[\s\S]*demo:\s*true[\s\S]*badge:\s*'课程演示封面'/, 'course video cover must be labelled as a demo')
assert.match(registerSource, /must not imply a live stream/, 'community interaction cover must not claim to be live')

for (const icon of ['home', 'academy', 'work', 'market', 'community', 'profile']) {
  const iconInfo = await stat(resolve(projectRoot, `static/nav/${icon}.svg`))
  assert.ok(iconInfo.isFile(), `navigation icon ${icon}.svg must remain an SVG icon`)
}

console.log(`media asset checks passed (${entries.length} registry entries)`)
