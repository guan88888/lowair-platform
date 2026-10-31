import assert from 'node:assert/strict'
import test from 'node:test'

const { WORK_API } = await import('../services/contracts.js')
const { validatePublish } = await import('../utils/index.js')

test('work API exposes the workflow collection endpoints', () => {
  assert.equal(WORK_API.jobs, '/work/jobs')
  assert.equal(WORK_API.tasks, '/work/tasks')
  assert.equal(WORK_API.resume, '/work/resume')
  assert.equal(WORK_API.fulfillments, '/work/fulfillments')
  assert.equal(WORK_API.taskAttachments, '/work/tasks/attachments')
})

test('directed task publishing requires an invite target', () => {
  const base = {
    title: '园区航测', city: '杭州', location: '余杭区范围', workAt: '2026-08-03 09:00', deadline: '2026-08-02 18:00',
    aircraft: 'Mavic 3E', caac: '视距内', duration: '4 小时', budget: 2800, delivery: '原始影像', acceptance: '影像清晰', description: '按工单执行', dispatchMode: 'directed'
  }
  assert.equal(validatePublish('task', base).invitedPilot, '定向任务需填写受邀飞手或企业标识')
  assert.deepEqual(validatePublish('task', { ...base, invitedPilot: 'pilot-01' }), {})
})

test('task dates and budgets are validated before API submission', () => {
  const errors = validatePublish('task', {
    title: '巡检', city: '北京', location: '昌平区范围', workAt: '2026-08-02 09:00', deadline: '2026-08-02 10:00',
    aircraft: 'M350 RTK', caac: '超视距', duration: '6 小时', budget: 0, delivery: '影像', acceptance: '合格', description: '按工单执行', dispatchMode: 'public'
  })
  assert.equal(errors.deadline, '报名截止时间必须早于作业时间')
  assert.equal(errors.budget, '预算必须大于 0')
})
