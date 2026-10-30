// @ts-check
import { defineConfig } from 'astro/config';
import sanityRedirects from './integrations/redirects.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://statwise.in',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sanityRedirects()],
});
