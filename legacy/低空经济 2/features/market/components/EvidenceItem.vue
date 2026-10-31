<template>
  <view class="market-evidence">
    <view class="market-evidence__top"><text class="market-evidence__label">{{ title }}</text><text class="market-status" :class="tone">{{ evidence.status || '未返回' }}</text></view>
    <text class="market-evidence__value">{{ evidence.label || '未返回' }}</text>
    <text class="market-evidence__meta">来源：{{ evidence.source || '服务端未返回' }}</text>
    <text class="market-evidence__meta">记录时间：{{ evidence.recordedAt || '服务端未返回' }}</text>
  </view>
</template>

<script>
export default {
  name: 'EvidenceItem',
  props: { title: { type: String, required: true }, evidence: { type: Object, default: () => ({}) } },
  computed: {
    tone() {
      const value = this.evidence.status || ''
      if (/失败|异常|争议|下架/.test(value)) return 'market-status--danger'
      if (/待|中|声明|演示|未/.test(value)) return 'market-status--warning'
      if (/不适用/.test(value)) return 'market-status--muted'
      return 'market-status--neutral'
    }
  }
}
</script>
