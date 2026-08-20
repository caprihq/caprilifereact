/**
 * Image assets imported as modules.
 *
 * Metro resolves `import mark from './x.png'` to an opaque asset id (a number),
 * which is what `Image`'s `source` accepts. TypeScript needs telling, and this is
 * the alternative to `require()`, which the lint config forbids.
 */
declare module '*.png' {
  const asset: number
  export default asset
}

declare module '*.jpg' {
  const asset: number
  export default asset
}
