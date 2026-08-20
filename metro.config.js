const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

/**
 * The `@/…` path alias is handled by babel-plugin-module-resolver, not here —
 * Metro would otherwise read the leading `@` as a package scope.
 *
 * `unstable_enablePackageExports` stays on: @base44/sdk ships CommonJS with
 * conditional exports and its subpaths will not resolve without it.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: { unstable_enablePackageExports: true },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
