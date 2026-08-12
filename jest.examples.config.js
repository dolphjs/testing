// Standalone config used only to prove the example specs under `examples/`
// actually pass against a real, compiled `@dolphjs/dolph`. Not shipped —
// `files` in package.json only includes `dist`.
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/examples'],
    // Jest's default testMatch only picks up `*.spec.ts` / `*.test.ts` — it
    // does NOT match `*.e2e-spec.ts` (no dot before "spec"), so integration
    // specs need to be listed explicitly or they silently never run.
    testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    transform: {
        '^.+\\.ts?$': ['ts-jest', { isolatedModules: true }],
    },
};
