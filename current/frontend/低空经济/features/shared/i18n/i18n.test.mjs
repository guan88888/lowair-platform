import assert from 'node:assert/strict'
import test from 'node:test'
import { getLocale, installLocaleBridge, localizeDocument, setLocale, subscribeLocale, t } from './index.js'
import { supportedLocales, translate } from '../../../data/localization.js'

const tabKeys = ['首页', '学考', '工作', '交易', '社区', '我的']

test('a locale change notifies currently mounted screens immediately', () => {
  const updates = []
  const stop = subscribeLocale((locale) => updates.push(locale))
  setLocale('en')
  setLocale('ja')
  stop()
  setLocale('zh')

  assert.deepEqual(updates, ['en', 'ja'])
  assert.equal(getLocale(), 'zh')
})

test('all five locales keep the six tab identities and order', () => {
  assert.deepEqual(supportedLocales, ['zh', 'en', 'ja', 'ru', 'de'])
  supportedLocales.forEach((locale) => {
    const labels = tabKeys.map((key) => translate(key, locale))
    assert.equal(labels.length, 6)
    assert.equal(new Set(labels).size, 6, `${locale} tab labels must remain distinct`)
  })
})

test('interpolation changes display text only', () => {
  assert.equal(t('{count} 件商品待处理', { count: 3 }, 'en'), '3 items pending')
  assert.equal(translate('{count} 件商品待处理', 'zh', { count: 3 }), '3 件商品待处理')
})

test('locale bridge exports are safe without an H5 document', () => {
  assert.doesNotThrow(() => localizeDocument('en'))
  assert.doesNotThrow(() => installLocaleBridge())
})
