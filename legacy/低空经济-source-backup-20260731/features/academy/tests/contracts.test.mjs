import test from 'node:test'
import assert from 'node:assert/strict'
import { canUseOrgConsole, canWriteOrg, isDuplicateVisit, normalizeInstitutionQuery, paginate, validateVisit } from '../services/contracts.mjs'

test('visit validation rejects past dates and invalid contact data', () => {
  const result = validateVisit({ institutionId: 'school-01', date: '2026-07-30', slot: '', name: '', phone: '123', partySize: 8, consent: false }, new Date('2026-07-31T08:00:00'))
  assert.equal(result.valid, false)
  assert.equal(result.errors.date, '预约日期不能早于今天')
  assert.ok(result.errors.slot)
  assert.ok(result.errors.phone)
  assert.ok(result.errors.consent)
})

test('duplicate visit only considers active appointments', () => {
  const input = { institutionId: 'school-01', date: '2026-08-02', slot: '09:30-10:30', phone: '19999589962' }
  assert.equal(isDuplicateVisit([{ id: 'v1', ...input, status: 'confirmed' }], input), true)
  assert.equal(isDuplicateVisit([{ id: 'v2', ...input, status: 'cancelled' }], input), false)
})

test('institution pagination clamps unsafe input', () => {
  const query = normalizeInstitutionQuery({ page: -4, pageSize: 99, sort: 'unknown' })
  assert.deepEqual({ page: query.page, pageSize: query.pageSize, sort: query.sort }, { page: 1, pageSize: 20, sort: 'recommended' })
  assert.deepEqual(paginate([1, 2, 3, 4, 5], 2, 2).items, [3, 4])
})

test('institution roles separate read access from write access', () => {
  assert.equal(canUseOrgConsole({ loggedIn: true, roles: ['instructor'] }), true)
  assert.equal(canWriteOrg({ loggedIn: true, institution: true, roles: ['instructor'] }), false)
  assert.equal(canWriteOrg({ loggedIn: true, institution: true, roles: ['institution_admin'] }), true)
})
