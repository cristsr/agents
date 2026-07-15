# Path Alias Setup

## tsconfig.json configuration

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

The single `@/*` alias is sufficient for most cases. Add specific aliases only if needed
for clarity in a large codebase:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/shared/*": ["src/shared/*"]
    }
  }
}
```

## Jest configuration

Path aliases must also be mapped in Jest to avoid module resolution errors:

```javascript
// jest.config.js
module.exports = {
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
```

## Common errors

**Error:** `Cannot find module '@/...'`
- Cause: Path alias not configured in tsconfig.json or Jest config
- Fix: Add the `paths` entry to tsconfig and `moduleNameMapper` to jest.config.js

**Error:** Alias works in dev but fails in build
- Cause: TypeScript compiler strips alias info — bundler must also resolve them
- Fix: Add `tsconfig-paths` plugin or use `tsc-alias` as a post-build step

```bash
npm install --save-dev tsconfig-paths
# Then in package.json scripts:
# "start:dev": "ts-node -r tsconfig-paths/register src/main.ts"
```
