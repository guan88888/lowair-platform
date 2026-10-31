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
  assert.throws(() => parseRouteOptions('community', 'post', {}), RouteValidationError)
  assert.throws(() => parseRouteOptions('profile', 'messages', { conversationId: 'bad/id' }), RouteValidationError)
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

test('root tab demo copy has translations for visible critical labels', () => {
  const locales = ['en', 'ja', 'ru', 'de']
  const critical = ['低空经济', '搜索课程、机构、证书等级', '搜索岗位、任务与企业', '搜索设备、配件与服务', '搜索话题、飞行日志与问答', '认证企业可管理岗位和候选人', '认证培训机构可管理招生与排课', '认证主体可创建广告计划']
  locales.forEach((locale) => critical.forEach((label) => {
    assert.notEqual(translate(label, locale), label, `${locale} still falls back for ${label}`)
  }))
})
