import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
import { getLocale, subscribeLocale } from './features/shared/i18n'
export function createApp() {
	const app = createSSRApp(App)
	app.mixin({
		created() {
			if (this.$data && Object.prototype.hasOwnProperty.call(this.$data, 'locale')) this.locale = getLocale()
			this.__lowairStopLocale = subscribeLocale((locale) => {
				if (this.$data && Object.prototype.hasOwnProperty.call(this.$data, 'locale')) this.locale = locale
			})
		},
		beforeUnmount() {
			if (this.__lowairStopLocale) this.__lowairStopLocale()
		}
	})
	return {
		app
	}
}
// #endif
