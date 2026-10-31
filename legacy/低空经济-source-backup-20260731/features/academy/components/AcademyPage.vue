<template>
  <academy-layout ref="layout" title="CAAC 学考" root>
    <view class="academy-hero">
      <image class="academy-hero__image" src="/static/images/lowair-academy-training.png" mode="aspectFill" />
      <view class="academy-hero__scrim" />
      <view class="academy-hero__copy"><text class="academy-kicker">学员服务</text><text class="academy-hero__title">从选机构到备考取证</text><text class="academy-hero__note">试听、课程、题库与学习档案统一管理</text><view class="academy-button" @tap="go('/pages/academy/institutions')">查找认证机构</view></view>
    </view>
    <view class="academy-section">
      <view class="academy-section__head"><view><text class="academy-section__title">现在要做什么</text><text class="academy-section__note">每一步都有记录，可随时继续</text></view></view>
      <view class="academy-grid">
        <view v-for="item in entrances" :key="item.title" class="academy-tile" @tap="go(item.to)"><view class="academy-tile__icon">{{ item.icon }}</view><text class="academy-tile__title">{{ item.title }}</text><text class="academy-tile__note">{{ item.note }}</text></view>
      </view>
    </view>
    <view class="academy-section">
      <view class="academy-section__head"><text class="academy-section__title">学习闭环</text><text class="academy-link" @tap="go('/pages/academy/progress')">查看档案 ›</text></view>
      <view class="academy-panel academy-flow"><view v-for="(step, index) in flow" :key="step" class="academy-flow__item"><text class="academy-flow__index">{{ index + 1 }}</text><text>{{ step }}</text></view></view>
    </view>
    <view class="academy-section">
      <view class="academy-row" @tap="go('/pages/academy/org-console')"><view class="academy-row__main"><text class="academy-row__title">培训机构工作台</text><text class="academy-row__note">机构角色可管理预约、排课、签到与学员状态</text></view><text class="academy-link">进入 ›</text></view>
    </view>
  </academy-layout>
</template>

<script>
import AcademyLayout from './AcademyLayout.vue'
export default {
  name: 'AcademyPage', components: { AcademyLayout },
  data() { return { entrances: [{ icon: '校', title: '找机构', note: '筛选、排序与四家对比', to: '/pages/academy/institutions' }, { icon: '课', title: '继续学习', note: '章节、视频与学习计划', to: '/pages/academy/learning' }, { icon: '练', title: '题库考试', note: '练习、模拟考与错题', to: '/pages/academy/exam' }, { icon: '档', title: '学习档案', note: '进度、成绩与政策来源', to: '/pages/academy/progress' }], flow: ['确定目标等级', '筛选培训机构', '预约试听与报名', '课程学习和练习', '模拟考试与取证'] } },
  methods: { go(url) { uni.navigateTo({ url }) } }
}
</script>

<style scoped>
.academy-flow { display: flex; overflow-x: auto; gap: 22rpx; }.academy-flow__item { flex: 0 0 140rpx; display: flex; flex-direction: column; gap: 10rpx; color: var(--muted); font-size: 21rpx; }.academy-flow__index { display: flex; width: 42rpx; height: 42rpx; align-items: center; justify-content: center; border: 1rpx solid var(--accent); border-radius: 9rpx; color: var(--accent); font-weight: 700; }
</style>
