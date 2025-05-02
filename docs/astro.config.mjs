import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import ecTwoSlash from 'expressive-code-twoslash'
import starlightLlmsTxt from 'starlight-llms-txt'
import { createStarlightTypeDocPlugin } from 'starlight-typedoc'

const [corePlugin, coreSidebar] = createStarlightTypeDocPlugin()

const site = 'https://vasco-santos.github.io/hash-stream/'

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [
    starlight({
      title: 'hash-stream',
      logo: {
        light: './public/hashstream-icon-light.svg',
        dark: './public/hashstream-icon-dark.svg',
        alt: 'hash-stream',
      },
      favicon: 'hashstream-icon-dark.svg',
      head: [
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: new URL('og.jpg?v=1', site).href,
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:alt',
            content:
              'Building blocks to run a off-the-shelf Trustless HTTP Server for Content-Addressable Data',
          },
        },
      ],
      social: [
        {
          icon: 'github',
          label: 'Github',
          href: 'https://github.com/vascosantos/hash-stream',
        },
        {
          icon: 'x.com',
          label: 'X',
          href: 'https://x.com/vascosantos10',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/vascosantos/hash-stream/edit/main/docs/',
      },
      lastUpdated: true,
      sidebar: [
        {
          label: 'Introduction',
          autogenerate: { directory: 'intro' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'Proof of Concepts',
          autogenerate: { directory: 'pocs' },
        },
        {
          label: 'Specifications',
          autogenerate: { directory: 'specs' },
        },
        // Add the typedoc generated sidebar group to the sidebar.
        coreSidebar,
      ],
      expressiveCode: {
        plugins: [
          ecTwoSlash({
            twoslashOptions: {
              compilerOptions: {
                allowUmdGlobalAccess: true,
                lib: ['ESNext', 'DOM', 'DOM.Iterable'],
              },
            },
          }),
        ],
      },
      plugins: [
        starlightLlmsTxt(),
        corePlugin({
          pagination: true,
          sidebar: {
            label: 'Reference',
            collapsed: false,
          },
          entryPoints: ['../packages/*'],
          typeDoc: {
            entryPointStrategy: 'packages',
            packageOptions: {
              readme: 'none',
              groupOrder: [
                'Functions',
                'Classes',
                'Variables',
                'Interfaces',
                'Enums',
                'Type Aliases',
                'References',
              ],
              excludeExternals: true,
              gitRevision: 'main',
              // placeInternalsInOwningModule: false,
              // internalModule: 'Internal',
            },
            plugin: [
              // 'typedoc-plugin-missing-exports',
              'typedoc-plugin-zod',
              'typedoc-plugin-mdn-links',
            ],
            parametersFormat: 'table',
          },
          tsconfig: '../tsconfig.json',
        }),
      ],
    }),
  ],
})
