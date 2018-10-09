
// this exists because you can't dynamically include/require a library.
//  e.g. you can't do the following:
//    `require('../component/' + myObj.componentName)
//  the string in a require must be static
//
// but, when I'm loading a 'chapter', I don't know what components i'll need.
// the general suggestion to solve this is to load all possible components, then get what you need in a giant switch statment.
// that's gross.
// but it's the only option. So that's what this file does.

// const log = require('electron-log')
export default function getComponent(componentName: string) {
  const components: {[index: string]: {message: string} } = { // define `components` type with an index signature
    ErrorComponent: require('./_ErrorComponent.vue').default,

    // any new components need to be registered here.  the passed name needs to match one of these keys.
    TestDataComponent: require('./TestDataComponent.vue').default,
    ValueOverTime: require('./ValueOverTime.vue').default

  }

  // if nothing was passed, return the available keys as an array. This is used in editPresentationUI.vue to create an enum of valid components
  if (componentName === undefined) {
    return Object.keys(components)
  }

  // return the chosen component
  const chosenComponent = components[componentName]

  if (!chosenComponent) {
    // log.error('you tried to fetch component "' + componentName + '" but it does not exist. Check _componentMap.js!  Available components are:', components)
    return null
  }

  return chosenComponent

}
