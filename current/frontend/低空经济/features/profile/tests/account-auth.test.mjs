import assert from 'node:assert/strict'
import test from 'node:test'

import { sanitizeMaterials, validateProfile, validateVerification } from '../utils/account-validation.js'

test('verification validation covers all four server-owned qualification forms', () => {
  assert.equal(validateVerification('personal', {}), '请补充真实姓名')
  assert.equal(validateVerification('personal', { realName: '张三', idNumber: '11010519491231002X', idFrontAssetId: '1', idBackAssetId: '2' }), '')
  assert.equal(validateVerification('caac', { certificateNumber: 'CAAC-01', level: '超视距', validFrom: '2026-08-01', validUntil: '2026-07-01', certificateAssetId: '3' }), '证书有效期不能早于生效日期')
  assert.equal(validateVerification('enterprise', { entityName: '测试企业', unifiedSocialCreditCode: '91350211M000100Y43', legalRepresentative: '李四', licenseAssetId: '4', contactName: '王五', contactPhone: '123' }), '请输入正确的 11 位联系电话')
  assert.equal(validateVerification('institution', {}), '请补充机构名称')
})

test('submission DTO only contains declared material fields and no review state', () => {
  const result = sanitizeMaterials('enterprise', {
    entityName: '低空科技', unifiedSocialCreditCode: '91350211M000100Y43', legalRepresentative: '李四',
    licenseAssetId: 42, contactName: '王五', contactPhone: '19999589962', status: 'approved', reviewer: 'client'
  })
  assert.deepEqual(result, {
    entityName: '低空科技', unifiedSocialCreditCode: '91350211M000100Y43', legalRepresentative: '李四',
    licenseAssetId: '42', contactName: '王五', contactPhone: '19999589962'
  })
  assert.equal('status' in result, false)
})

test('profile validation rejects invalid visibility and oversized data', () => {
  assert.equal(validateProfile({ nickname: 'A', bio: '', visibility: 'private' }), '昵称需为 2 至 30 个字符')
  assert.equal(validateProfile({ nickname: '飞手用户', bio: '', visibility: 'team' }), '请选择资料可见范围')
  assert.equal(validateProfile({ nickname: '飞手用户', bio: '巡检经验', visibility: 'public' }), '')
})
