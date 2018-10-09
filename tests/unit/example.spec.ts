import { expect } from 'chai'
import { shallowMount } from '@vue/test-utils'
import Root from '@/components/Root.vue'

describe('Root.vue', () => {
  it('renders props.msg when passed', () => {
    const msg = 'new message'
    const wrapper = shallowMount(Root, {
      propsData: { msg },
    })
    expect(wrapper.text()).to.include(msg)
  })
})
