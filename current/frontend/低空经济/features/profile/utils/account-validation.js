export const VERIFICATION_LABELS = Object.freeze({
  personal: '个人实名',
  caac: 'CAAC 资质',
  enterprise: '企业认证',
  institution: '机构认证'
})

export const STATUS_LABELS = Object.freeze({
  not_submitted: '未提交',
  pending: '审核中',
  approved: '已通过',
  rejected: '被拒绝',
  expired: '已失效'
})

export const ROLE_LABELS = Object.freeze({
  guest: '游客',
  personal: '个人飞手',
  pilot: '个人飞手',
  enterprise: '企业',
  institution: '培训机构'
})

export const VERIFICATION_FIELDS = Object.freeze({
  personal: [
    { key: 'realName', label: '真实姓名', required: true, placeholder: '请输入证件姓名' },
    { key: 'idNumber', label: '身份证号', required: true, placeholder: '仅用于实名审核' },
    { key: 'idFrontAssetId', label: '身份证人像面', required: true, type: 'upload' },
    { key: 'idBackAssetId', label: '身份证国徽面', required: true, type: 'upload' }
  ],
  caac: [
    { key: 'certificateNumber', label: '执照编号', required: true, placeholder: '请输入 CAAC 执照编号' },
    { key: 'level', label: '执照等级', required: true, type: 'select', options: ['视距内', '超视距', '教员'] },
    { key: 'validFrom', label: '生效日期', required: true, type: 'date' },
    { key: 'validUntil', label: '有效期至', required: true, type: 'date' },
    { key: 'certificateAssetId', label: '执照材料', required: true, type: 'upload' }
  ],
  enterprise: [
    { key: 'entityName', label: '企业名称', required: true, placeholder: '须与营业执照一致' },
    { key: 'unifiedSocialCreditCode', label: '统一社会信用代码', required: true, placeholder: '18 位统一社会信用代码' },
    { key: 'legalRepresentative', label: '法定代表人', required: true },
    { key: 'licenseAssetId', label: '营业执照', required: true, type: 'upload' },
    { key: 'contactName', label: '业务联系人', required: true },
    { key: 'contactPhone', label: '联系电话', required: true, type: 'phone' }
  ],
  institution: [
    { key: 'institutionName', label: '机构名称', required: true, placeholder: '须与主体资质一致' },
    { key: 'unifiedSocialCreditCode', label: '统一社会信用代码', required: true, placeholder: '18 位统一社会信用代码' },
    { key: 'licenseAssetId', label: '营业执照', required: true, type: 'upload' },
    { key: 'schoolPermitNumber', label: '办学资质编号', required: true },
    { key: 'permitAssetId', label: '办学资质材料', required: true, type: 'upload' },
    { key: 'campusAddress', label: '校区地址', required: true },
    { key: 'contactName', label: '机构联系人', required: true },
    { key: 'contactPhone', label: '联系电话', required: true, type: 'phone' }
  ]
})

function text(value) {
  return String(value ?? '').trim()
}

export function validateProfile(profile = {}) {
  const nickname = text(profile.nickname)
  if (nickname.length < 2 || nickname.length > 30) return '昵称需为 2 至 30 个字符'
  if (text(profile.bio).length > 300) return '个人简介不能超过 300 个字符'
  if (!['private', 'public'].includes(profile.visibility)) return '请选择资料可见范围'
  return ''
}

export function validateVerification(type, values = {}) {
  const fields = VERIFICATION_FIELDS[type]
  if (!fields) return '认证类型无效'
  const missing = fields.find((field) => field.required && !text(values[field.key]))
  if (missing) return '请补充' + missing.label
  if (values.contactPhone && !/^1\d{10}$/.test(text(values.contactPhone))) return '请输入正确的 11 位联系电话'
  if (values.idNumber && !/^\d{17}[\dXx]$/.test(text(values.idNumber))) return '请输入正确的 18 位身份证号'
  if (values.unifiedSocialCreditCode && !/^[0-9A-HJ-NPQRTUWXY]{18}$/i.test(text(values.unifiedSocialCreditCode))) return '请输入正确的 18 位统一社会信用代码'
  if (type === 'caac' && values.validFrom && values.validUntil && values.validUntil < values.validFrom) return '证书有效期不能早于生效日期'
  return ''
}

export function sanitizeMaterials(type, values = {}) {
  const fields = VERIFICATION_FIELDS[type] || []
  return Object.fromEntries(fields.map((field) => [field.key, text(values[field.key])]).filter(([, value]) => value !== ''))
}
