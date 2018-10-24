import Vue from 'vue'
import { Store } from 'vuex'
import { AppStore } from '@/store'

// the point of this AppVue class is simply to TYPE the $store in all subsequent .vue files
//  so all .vue files will extend AppVue, thus typing $store
export default abstract class AppVue extends Vue {
  public $store: Store<AppStore> = this.$store
}
