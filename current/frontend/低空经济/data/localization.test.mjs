import assert from 'node:assert/strict'
import test from 'node:test'
import { retainedSourceTerms, supportedLocales, translate, untranslatedTerms } from './localization.js'

const coreNavigation = ['首页', '学考', '工作', '交易', '社区', '我的']

test('all supported locales translate the six root navigation labels', () => {
  assert.deepEqual(supportedLocales, ['zh', 'en', 'ja', 'ru', 'de'])
  supportedLocales.filter((locale) => locale !== 'zh').forEach((locale) => {
    coreNavigation.forEach((label) => assert.notEqual(translate(label, locale), label, `${locale}: ${label}`))
  })
})

test('missing or placeholder translations retain the Chinese source', () => {
  assert.equal(translate('未登记术语', 'en'), '未登记术语')
  assert.deepEqual(untranslatedTerms(['首页', '未登记术语'], 'de'), ['未登记术语'])
})

test('composed appearance toasts stay localized without changing source keys', () => {
  supportedLocales.filter((locale) => locale !== 'zh').forEach((locale) => {
    assert.notEqual(translate('已切换为云雾白背景', locale), '已切换为云雾白背景')
  })
})

test('authentication and entry prompts are translated in every non-Chinese locale', () => {
  const prompts = ['密码登录', '验证码登录', '用户协议', '隐私政策', '首次使用说明', '登录状态已失效，请重新登录']
  supportedLocales.filter((locale) => locale !== 'zh').forEach((locale) => {
    prompts.forEach((prompt) => assert.notEqual(translate(prompt, locale), prompt, `${locale}: ${prompt}`))
  })
})

test('translation interpolation preserves a stable message key', () => {
  assert.equal(translate('{count} 件商品待处理', 'en', { count: 2 }), '2 items pending')
})

test('retained source terms are explicitly registered', () => {
  assert.deepEqual(retainedSourceTerms.ja, ['第'])
  assert.deepEqual(untranslatedTerms(['第'], 'ja'), [])
})
