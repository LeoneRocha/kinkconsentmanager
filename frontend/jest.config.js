module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  testEnvironment: 'jsdom',
  cacheDirectory: '<rootDir>/.jest-cache',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary', 'lcov', 'cobertura'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.module.ts',
    '!src/app/**/*.interface.ts',
    '!src/app/**/*.model.ts',
    '!src/app/**/*.enum.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.test.ts',
    '!src/app/**/__tests__/**',
    '!src/app/**/*.mock.ts',
    '!src/app/**/*.routes.ts',
    '!src/app/**/index.ts',
    '!src/app/app.config.ts',
    '!src/main.ts',
    '!src/setup-jest.ts',
  ],
  testMatch: ['<rootDir>/src/app/**/*.spec.ts'],
  transform: {
    '^.+\\.(ts|js|mjs|html|svg)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@angular|@ngx-translate|primeng|@primeuix|@primeicons|rxjs))',
  ],
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  resolver: undefined,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage/junit',
        outputName: 'test-results.xml',
      },
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'KinkConsentManager Test Report',
        outputPath: '<rootDir>/coverage/html/test-report.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
      },
    ],
    [
      'jest-sonar',
      {
        outputDirectory: 'coverage/sonar',
        outputName: 'sonar-report.xml',
        reportedFilePath: 'absolute',
      },
    ],
    [
      'jest-stare',
      {
        resultDir: 'coverage/jest-stare',
        reportTitle: 'KinkConsentManager Test Report',
        additionalResultsProcessors: [],
        coverageLink: '../html/index.html',
        jestStareConfigJson: 'jest-stare',
        jestGlobalConfigJson: 'globalStuff',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'coverage/jest-html-reporters',
        filename: 'test-report.html',
        openReport: false,
        pageTitle: 'KinkConsentManager Tests',
        includeFailureMsg: true,
        includeConsoleLog: true,
        enableMergeData: false,
        darkTheme: false,
      },
    ],
  ],
};
