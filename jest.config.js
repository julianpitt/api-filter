module.exports = {
  "moduleFileExtensions": ["ts", "js", "json"],
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/functions/**/*.test.ts', '<rootDir>/**/__tests__/*.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  setupFilesAfterEnv: ['./test/jest.setup.ts', "jest-date-mock"],
  globals: {
    "ts-jest": {
      "tsconfig": "<rootDir>/tsconfig.json",
      "diagnostics": false
    }
  },
  "collectCoverage": true,
  "collectCoverageFrom": ["<rootDir>/functions/**/*.ts", "!<rootDir>/functions/**/e2e*/**/*.ts"],
  "coverageThreshold": {
    "global": {
      "lines": 90
    }
  }
};
