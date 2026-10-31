const STATUS_LABELS = Object.freeze({
  pending_payment: '待付款', paid: '已付款', pending_shipment: '待发货', shipped: '运输中',
  pending_inspection: '待验机', inspection_passed: '验机通过', inspection_failed: '验机异常',
  renting: '租赁中', returning: '归还中', returned: '已归还', after_sale: '售后中',
  disputed: '争议处理中', refunded: '已退款', closed: '已关闭'
})

function statusOf(order, field) {
  return order?.[field] || order?.[field.replace(/_([a-z])/g, (_, key) => key.toUpperCase())] || ''
}

export function orderStatusLabel(order = {}) {
  const status = statusOf(order, 'status')
  return STATUS_LABELS[status] || order.status_label || order.statusLabel || status || '等待服务端返回'
}

export function orderStages(order = {}) {
  const payment = statusOf(order, 'payment_status') || statusOf(order, 'escrow_status') || '等待服务端返回'
  const logistics = statusOf(order, 'logistics_status') || statusOf(order, 'shipment_status') || '等待服务端返回'
  const inspection = statusOf(order, 'inspection_status') || '等待服务端返回'
  const afterSale = statusOf(order, 'after_sale_status') || statusOf(order, 'dispute_status') || '无服务端状态'
  const refund = statusOf(order, 'refund_status') || '无服务端状态'
  const returned = statusOf(order, 'return_status') || '不适用 / 等待服务端返回'
  return [
    { label: '支付 / 托管', value: payment }, { label: '物流 / 交付', value: logistics },
    { label: '验机', value: inspection }, { label: '归还', value: returned },
    { label: '售后 / 争议', value: afterSale }, { label: '退款', value: refund }
  ]
}

export function availableOrderActions(order = {}) {
  const actions = Array.isArray(order.available_actions) ? order.available_actions : (Array.isArray(order.availableActions) ? order.availableActions : [])
  return actions.map((item) => typeof item === 'string' ? { code: item, label: item } : item).filter((item) => item?.code && item?.label)
}
