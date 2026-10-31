<template>
  <app-page-shell :title="title" active="work" :root="root" :city="city" :theme="theme" :locale="locale" @city="showCities">
    <view class="work-screen"><slot /></view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'

export default {
  name: 'WorkScaffold',
  components: { AppPageShell },
  props: { title: { type: String, required: true }, root: { type: Boolean, default: false } },
  data() {
    return {
      city: uni.getStorageSync('lowair-work-city') || '北京',
      theme: uni.getStorageSync('lowair-demo-theme') || 'ocean',
      locale: uni.getStorageSync('lowair-demo-locale') || 'zh'
    }
  },
  methods: {
    showCities() {
      uni.showActionSheet({
        itemList: ['北京', '杭州', '成都', '深圳'],
        success: ({ tapIndex }) => {
          this.city = ['北京', '杭州', '成都', '深圳'][tapIndex]
          uni.setStorageSync('lowair-work-city', this.city)
          this.$emit('city-change', this.city)
        }
      })
    }
  }
}
</script>

