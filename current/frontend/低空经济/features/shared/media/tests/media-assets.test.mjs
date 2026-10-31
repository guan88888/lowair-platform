import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
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
assert.match(componentSource, /thumbnailSrc/, 'SafeMedia.vue must support an optional WebP thumbnail')
assert.match(componentSource, /displaySrc/, 'SafeMedia.vue must load a thumbnail before the original asset')

const entryPattern = /(\w+):\s*{([\s\S]*?)\n\s*},?/g
const entries = []
for (const match of registrySource.matchAll(entryPattern)) {
  const body = match[2]
  const src = body.match(/src:\s*'([^']+)'/)?.[1]
  const thumbnailSrc = body.match(/thumbnailSrc:\s*'([^']+)'/)?.[1]
  const alt = body.match(/alt:\s*'([^']+)'/)?.[1]
  const width = Number(body.match(/width:\s*(\d+)/)?.[1])
  const height = Number(body.match(/height:\s*(\d+)/)?.[1])
  if (src) entries.push({ key: match[1], src, thumbnailSrc, alt, width, height })
}

assert.ok(entries.length >= 15, 'expected every project media asset to be registered')

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
  if (extname(path).toLowerCase() === '.png') assert.ok(entry.thumbnailSrc, `${entry.key} needs a WebP thumbnail`)
  if (entry.thumbnailSrc) {
    assert.match(entry.thumbnailSrc, /^\/static\/images\/[a-z0-9-]+-thumb\.webp$/i, `${entry.key} has an invalid thumbnail path`)
    const thumbnailPath = resolve(projectRoot, entry.thumbnailSrc.slice(1))
    const thumbnail = await stat(thumbnailPath)
    assert.ok(thumbnail.isFile(), `${entry.thumbnailSrc} is missing`)
    assert.ok(thumbnail.size < info.size, `${entry.thumbnailSrc} must be smaller than its original`)
    assert.ok(registerSource.includes(entry.thumbnailSrc.split('/').pop()), `${entry.thumbnailSrc} is missing from ASSET_REGISTER.md`)
  }
}

const registeredPaths = new Set(entries.flatMap((entry) => [entry.src, entry.thumbnailSrc].filter(Boolean)))
const referencedPaths = new Set()
const filesToAudit = [
  'features/home/media.js',
  'features/academy/media.js',
  'features/work/media.js',
  'features/market/media.js',
  'features/community/media.js',
  'features/community/mock/community-data.js',
  'features/assistant/media.js',
  'features/home/mock/page-data.js',
  'features/academy/mock/page-data.js',
  'features/work/mock/page-data.js',
  'features/market/mock/catalog.js',
  'features/market/mock/page-data.js',
  'features/operations/mock/ad-data.js'
]
for (const file of filesToAudit) {
  const source = await readFile(resolve(projectRoot, file), 'utf8')
  for (const match of source.matchAll(/\/static\/images\/[a-z0-9-]+\.(?:png|jpg)/gi)) referencedPaths.add(match[0])
}

const communitySource = await readFile(resolve(projectRoot, 'features/community/mock/community-data.js'), 'utf8')
assert.doesNotMatch(communitySource, /state:\s*['"]live['"]/, 'demo live rooms must not claim a live stream without a real source')
assert.match(communitySource, /无实时流/, 'demo video covers need an explicit no-stream label')
for (const src of referencedPaths) {
  assert.ok(registeredPaths.has(src), `${src} must be present in the central media registry`)
  const path = resolve(projectRoot, src.slice(1))
  const info = await stat(path)
  assert.ok(info.isFile(), `${src} is missing`)
}

for (const file of await readdir(resolve(projectRoot, 'static/images'))) {
  if (/\.(png|jpg|webp)$/i.test(file)) assert.ok(registeredPaths.has(`/static/images/${file}`), `${file} is not registered`)
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
assert.match(registrySource, /sourceDate:\s*'2026-08-01'/, 'media entries must include an audit date')
assert.match(registrySource, /licenseStatus:/, 'media entries must include authorization status')

for (const icon of ['home', 'academy', 'work', 'market', 'community', 'profile']) {
  const iconInfo = await stat(resolve(projectRoot, `static/nav/${icon}.svg`))
  assert.ok(iconInfo.isFile(), `navigation icon ${icon}.svg must remain an SVG icon`)
}

console.log(`media asset checks passed (${entries.length} registry entries)`)
