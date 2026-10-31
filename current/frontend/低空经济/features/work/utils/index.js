export function money(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? '¥' + amount.toLocaleString('zh-CN') : '未填写'
}

export function salary(min, max) {
  if (!Number(min) || !Number(max)) return '企业未填写'
  return Math.round(Number(min) / 1000) + 'k-' + Math.round(Number(max) / 1000) + 'k'
}

export function statusText(status) {
  return ({ recruiting: '招聘中', paused: '已暂停', closed: '已关闭', reviewing: '审核中', open: '可报名', assigned: '已指派' })[status] || status
}

export function option(options, key, fallback = '') {
  return options && options[key] !== undefined ? options[key] : fallback
}

export function go(url, method = 'navigateTo') {
  if (url) uni[method]({ url })
}

export function notify(message) {
  uni.showToast({ title: message, icon: 'none', duration: 2200 })
}

export function chooseDocument() {
  return new Promise((resolve, reject) => {
    if (typeof uni.chooseMessageFile === 'function') {
      uni.chooseMessageFile({ count: 1, type: 'file', extension: ['pdf', 'doc', 'docx', 'zip', 'jpg', 'png'], success: ({ tempFiles }) => resolve(tempFiles[0]), fail: reject })
      return
    }
    // H5 fallback keeps the interaction usable when the platform file picker is unavailable.
    if (typeof uni.chooseFile === 'function') {
      uni.chooseFile({ count: 1, success: ({ tempFiles }) => resolve(tempFiles[0]), fail: reject })
      return
    }
    reject(new Error('当前端暂不支持文件选择'))
  })
}

export function completeness(resume) {
  const fields = ['intention', 'name', 'city', 'caacLevel', 'aircraft', 'experience', 'education']
  const completed = fields.filter((key) => String(resume?.[key] || '').trim()).length + ((resume?.attachments || []).length ? 1 : 0)
  return Math.round((completed / (fields.length + 1)) * 100)
}

export function validatePublish(type, form) {
  const errors = {}
  const required = type === 'job'
    ? ['title', 'city', 'salaryMin', 'salaryMax', 'employment', 'experience', 'caac', 'aircraft', 'responsibilities', 'requirements']
    : ['title', 'city', 'location', 'workAt', 'deadline', 'aircraft', 'caac', 'duration', 'budget', 'delivery', 'acceptance', 'description', 'dispatchMode']
  required.forEach((key) => { if (!String(form[key] ?? '').trim()) errors[key] = '此项必填' })
  if (type === 'job' && Number(form.salaryMin) >= Number(form.salaryMax) && form.salaryMin && form.salaryMax) errors.salaryMax = '最高薪资必须高于最低薪资'
  if (type === 'task' && form.workAt && form.deadline && new Date(form.deadline).getTime() >= new Date(form.workAt).getTime()) errors.deadline = '报名截止时间必须早于作业时间'
  if (type === 'task' && Number(form.budget) <= 0) errors.budget = '预算必须大于 0'
  if (type === 'task' && form.dispatchMode === 'directed' && !String(form.invitedPilot || '').trim()) errors.invitedPilot = '定向任务需填写受邀飞手或企业标识'
  return errors
}
