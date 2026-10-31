import assert from 'node:assert/strict'
import test from 'node:test'

const storage = new Map()
globalThis.uni = {
  getStorageSync: (key) => storage.get(key) || '',
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  $emit() {}
}

const auth = await import('../../../utils/auth.js')

test('RBAC normalization distinguishes the five acceptance states', () => {
  const guest = auth.normalizeAuthState({}, { guest: true })
  const loggedUser = auth.normalizeAuthState({ id: 1, roles: ['personal'] })
  const unverifiedPilot = auth.normalizeAuthState({ id: 2, roles: ['personal'], verification: { caac: 'pending' } })
  const enterprise = auth.normalizeAuthState({ id: 3, roles: ['personal', 'enterprise'], verification: { enterprise: 'approved' } })
  const institution = auth.normalizeAuthState({ id: 4, roles: ['institution'], verification: { institution: { status: 'approved' } } })

  assert.equal(guest.guest, true)
  assert.equal(loggedUser.loggedIn, true)
  assert.equal(unverifiedPilot.caac, false)
  assert.equal(unverifiedPilot.verification.caac, 'pending')
  assert.equal(enterprise.enterprise, true)
  assert.equal(institution.institution, true)
  assert.equal(auth.hasApprovedPermission('login', loggedUser), true)
  assert.equal(auth.hasApprovedPermission('caac', unverifiedPilot), false)
  assert.equal(auth.hasApprovedPermission('enterprise', enterprise), true)
  assert.equal(auth.hasApprovedPermission('institution', institution), true)
})

test('session persistence stores tokens and server-owned verification state', () => {
  storage.clear()
  auth.saveSession({
    access_token: 'access-value', refresh_token: 'refresh-value', expires_in: 3600,
    user: { id: 8, phone: '19999589962', roles: ['enterprise'], verification: { enterprise: 'approved' } }
  })
  const restored = auth.getAuthState()
  assert.equal(restored.loggedIn, true)
  assert.equal(restored.enterprise, true)
  assert.equal(auth.getRefreshToken(), 'refresh-value')
  assert.equal(auth.isAccessTokenFresh(), true)
})

test('return URL validation only accepts internal page targets', () => {
  const target = '/pages/work/task-detail?id=task-01&tab=bids'
  assert.equal(auth.safeInternalUrl(target), target)
  assert.equal(auth.safeInternalUrl('https://example.com', '/pages/index/index'), '/pages/index/index')
})

test('server role/status aliases are normalized without persisting secrets', () => {
  storage.clear()
  const state = auth.normalizeAuthState({
    id: 9,
    role: '企业',
    enterprise_status: 'pending',
    password: 'must-not-persist',
    verification: { caac: { review_status: 'rejected', rejection_reason: '证件过期' } }
  })
  assert.deepEqual(state.roles, ['enterprise'])
  assert.equal(state.verification.enterprise, 'pending')
  assert.equal(state.verification.caac, 'rejected')

  auth.saveSession({ access_token: 'access-only', user: { id: 9, role: '企业' } })
  auth.applyCurrentUser({ id: 9, role: '企业', password: 'must-not-persist', verification: { caac: 'approved' } })
  const persisted = storage.get('lowair-user')
  assert.equal('password' in persisted, false)
  assert.equal('verification' in persisted, false)
})

test('guest exit clears the entry gate while signed-in state remains intact', () => {
  storage.clear()
  auth.setGuestSession()
  assert.equal(auth.getAuthState().guest, true)
  auth.clearGuestSession()
  assert.equal(auth.getAuthState().loggedIn, false)
  assert.equal(storage.has('lowair-entry-complete'), false)
})

test('server-disabled accounts do not retain a local session', () => {
  storage.clear()
  assert.throws(() => auth.saveSession({ access_token: 'blocked-token', user: { id: 10, account_status: 'suspended' } }), /账号当前不可用/)
  assert.equal(auth.getAccessToken(), '')
  assert.equal(auth.getAuthState().loggedIn, false)
})
