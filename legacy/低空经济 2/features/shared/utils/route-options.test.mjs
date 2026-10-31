import assert from 'node:assert/strict'
import test from 'node:test'

import { translate } from '../../../data/localization.js'
import { RouteValidationError, parseRouteOptions } from './route-options.js'

test('route parameter schemas accept declared IDs and reject malformed or inconsistent values', () => {
  assert.deepEqual(parseRouteOptions('academy', 'institutionDetail', { id: 'school-01' }), { id: 'school-01' })
  assert.deepEqual(parseRouteOptions('market', 'order', { mode: 'checkout', id: 'device-01', tradeType: 'buy' }), {
    mode: 'checkout', id: 'device-01', tradeType: 'buy'
  })
  assert.throws(() => parseRouteOptions('academy', 'institutionDetail', { id: '../../bad' }), RouteValidationError)
  assert.throws(() => parseRouteOptions('market', 'order', { mode: 'checkout', id: 'device-01' }), RouteValidationError)
})

test('all supported locales translate the root navigation labels', () => {
  const locales = ['zh', 'en', 'ja', 'ru', 'de']
  const labels = ['首页', '学考', '工作', '交易', '社区', '我的']

  locales.forEach((locale) => {
    labels.forEach((label) => assert.notEqual(translate(label, locale), ''))
  })
  assert.equal(translate('首页', 'en'), 'Home')
  assert.equal(translate('首页', 'ja'), 'ホーム')
  assert.equal(translate('首页', 'ru'), 'Главная')
  assert.equal(translate('首页', 'de'), 'Start')
  assert.equal(translate('我的', 'en'), 'Me')
  assert.equal(translate('我的', 'ja'), 'マイページ')
  assert.equal(translate('我的', 'ru'), 'Профиль')
  assert.equal(translate('我的', 'de'), 'Ich')
})
