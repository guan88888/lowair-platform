<template>
  <view v-if="visible" class="confirm-mask" @tap.self="$emit('cancel')">
    <view class="confirm-panel">
      <text class="confirm-title">{{ title }}</text>
      <text class="confirm-message">{{ message }}</text>
      <view v-if="consequence" class="confirm-consequence"><text>操作后果</text><text>{{ consequence }}</text></view>
      <view v-if="requireReason" class="field-block">
        <text class="field-label">{{ reasonLabel }}</text>
        <textarea v-model="reason" class="textarea" :placeholder="reasonPlaceholder" maxlength="300" />
      </view>
      <view class="confirm-actions">
        <view class="button secondary" @tap="$emit('cancel')">取消</view>
        <view class="button danger" :class="{ disabled: busy || (requireReason && !reason.trim()) }" @tap="submit">{{ busy ? '提交中...' : confirmText }}</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'WorkConfirm',
  emits: ['cancel', 'confirm'],
  props: {
    visible: Boolean, busy: Boolean, title: { type: String, default: '确认操作' }, message: { type: String, default: '' }, consequence: { type: String, default: '' },
    confirmText: { type: String, default: '确认' }, requireReason: Boolean, reasonLabel: { type: String, default: '原因' }, reasonPlaceholder: { type: String, default: '请填写具体原因' }
  },
  data() { return { reason: '' } },
  watch: { visible(value) { if (value) this.reason = '' } },
  methods: {
    submit() {
      if (this.busy || (this.requireReason && !this.reason.trim())) return
      this.$emit('confirm', this.reason.trim())
    }
  }
}
</script>

<style scoped src="../styles/work-page.css"></style>

