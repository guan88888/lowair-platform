<template><view class="field-block"><text class="field-label">{{ label }}</text><textarea v-if="multiline" class="textarea" :value="modelValue" :placeholder="placeholder || '请输入' + label" @input="emitValue" /><input v-else class="input" :type="type" :value="modelValue" :placeholder="placeholder || '请输入' + label" @input="emitValue" /><text v-if="help" class="field-help">{{ help }}</text><text v-if="error" class="field-error">{{ error }}</text></view></template>
<script>
export default { name: 'WorkField', emits: ['update'], props: { label: String, fieldKey: String, modelValue: [String, Number], placeholder: String, help: String, error: String, multiline: Boolean, type: { type: String, default: 'text' } }, methods: { emitValue(event) { this.$emit('update', { key: this.fieldKey, value: event.detail.value }) } } }
</script>
<style scoped src="../styles/work-page.css"></style>
