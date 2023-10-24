/* eslint-disable */
module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc-node/jest', {
      target: 'esnext',
      module: 'es6'
    }],
  },
  testMatch: ["**/tests/*.ts?(x)"],
  extensionsToTreatAsEsm: ['.ts'],
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
  ]
}
