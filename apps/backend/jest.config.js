/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        paths: {
          '@skillshare-circles/shared': ['../../packages/shared/src'],
        },
      },
    }],
  },
  moduleNameMapper: {
    '@skillshare-circles/shared': '<rootDir>/../../packages/shared/src',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/config/prisma.ts',
  ],
  coverageDirectory: 'coverage',
  passWithNoTests: true,
};
