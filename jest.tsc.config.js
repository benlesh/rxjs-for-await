const jestConfig = require('./jest.config');

module.exports = {
  ...jestConfig,
  runner: 'jest-runner-tsc'
}