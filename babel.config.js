module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      // Bare React Native does not read tsconfig `paths`. Expo's preset used
      // to resolve `@/…` for us; without it Metro parses the `@` as a package
      // scope and the import fails.
      'module-resolver',
      {
        root: ['./'],
        alias: { '@': './src' },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    [
      // MANDATORY for react-native-unistyles v3. The plugin rewrites components
      // so their styles are bound to the theme and re-resolved natively.
      //
      // Without it the app mounts and logs normally but renders nothing — the
      // view tree exists with zero text nodes, because no style is ever attached.
      // `root` tells the plugin which folder holds the code to process.
      'react-native-unistyles/plugin',
      { root: 'src' },
    ],
  ],
}
