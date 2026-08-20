/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transformIgnorePatterns: [
    // @base44/sdk bundles nested ESM dependencies (uuid), so the pattern has
    // to reach inside its own node_modules too.
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?/.*|@react-navigation/.*|react-native-.*|@base44/.*|.*/node_modules/uuid))',
  ],
  collectCoverageFrom: ['src/lib/**/*.ts', 'src/features/**/*.ts'],
}
