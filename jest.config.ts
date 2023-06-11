import type { Config } from 'jest';

const config: Config = {
  roots: [
    '<rootDir>/tests'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest'
  },

  // Coverage
  collectCoverage: true,
  collectCoverageFrom: ['src/**'],
  coverageDirectory: 'coverage',
};

export default config;
