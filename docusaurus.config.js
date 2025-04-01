// Minimal [Docusaurus](https://docusaurus.io) configuration to allow us
// to generate docusaurus-compatible markdown from typedoc output.

const config = {
  title: 'Hash stream documentation',
  tagline:
    'The Building blocks to run a off-the-shelf Trustless HTTP Server for Content-Addressable Data',
  url: 'https://github.com',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        tsconfig: './tsconfig.json',
        out: 'markdown',
        sidebar: {
          categoryLabel: 'hash-stream',
        },
      },
    ],
  ],
}

module.exports = config
