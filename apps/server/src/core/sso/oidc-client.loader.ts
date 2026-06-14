import type * as OpenIdClient from 'openid-client';

/**
 * `openid-client` v6 ships as a pure ESM module. The server is compiled to
 * CommonJS, where a regular dynamic `import()` would be transpiled down to
 * `require()` and fail with ERR_REQUIRE_ESM. The `Function` indirection keeps a
 * genuine runtime `import()` so the ESM module loads correctly from CJS.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<typeof OpenIdClient>;

let cached: Promise<typeof OpenIdClient> | null = null;

export function loadOpenIdClient(): Promise<typeof OpenIdClient> {
  if (!cached) {
    cached = dynamicImport('openid-client');
  }
  return cached;
}
