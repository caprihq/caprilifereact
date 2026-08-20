// MUST be the first import in the app.
//
// The Base44 SDK generates a uuid for every request
// (@base44/sdk/dist/utils/axios-client.js: `const requestId = uuidv4()`), and
// uuid v13 requires `crypto.getRandomValues()`. Hermes does not provide it, so
// without this polyfill EVERY API call throws before it leaves the device:
//
//   [Base44 SDK Error] crypto.getRandomValues() not supported
//
// It has to run before `./src/App` is evaluated, because that pulls in the SDK —
// an import lower down would be too late.
import 'react-native-get-random-values'

// Registers the themes and breakpoints with Unistyles. Imported for its side
// effect, and before any component so the first render is already themed.
import './src/theme/unistyles'

import { AppRegistry } from 'react-native'
import { enableFreeze } from 'react-native-screens'

// Inactive screens stop re-rendering while they are off-screen. Native stacks
// keep them mounted so a back gesture is instant; freezing means that costs
// memory rather than CPU on every render pass.
enableFreeze(true)

import { App } from './src/App'
import { name as appName } from './app.json'

AppRegistry.registerComponent(appName, () => App)
