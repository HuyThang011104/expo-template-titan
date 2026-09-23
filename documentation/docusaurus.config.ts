import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Titan',
  tagline: 'Expo boilerplate with working example',
  favicon: 'img/Rhino.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // D5 decided: GitHub Pages project site. url + baseUrl below are final.
  // Vercel: url 'https://<domain>', baseUrl '/' (plus dropping the Pages
  // deploy job — no content change).
  url: 'https://huythang011104.github.io',
  baseUrl: '/expo-template-titan/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'HuyThang011104', // Usually your GitHub org/user name.
  projectName: 'expo-template-titan', // Usually your repo name.

  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        // Preview: docs re-enabled for the first 4 pages of the new IA.
        // Phase 3 of DOCS_AUTHORING_GUIDE switches the two settings below
        // back to 'throw'.
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/HuyThang011104/expo-template-titan/tree/main/documentation/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    // Re-enable when docs return: 'docusaurus-plugin-llms' scans docs and
    // currently has nothing to index. See git history for the old options.
    // Re-add `@docusaurus/plugin-client-redirects` per deleted/moved page
    // when the new IA lands (old decisions/* -> stack-choices targets are
    // gone with docs/). Do not bulk-redirect everything to /.
    [
      // Offline search. Upgrade path: replace with Algolia DocSearch
      // (free for OSS) once the site is approved — then remove this plugin.
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        // Preview: index the first docs pages; full search config (Algolia
        // vs local) is decided when the IA lands.
        indexDocs: true,
        indexPages: true,
      },
    ],
  ],

  // Minimal observability (D5): no analytics vendor yet — add ONE script
  // below (Plausible or GA, respecting DNT) once an account exists. Do not
  // run two trackers in parallel.
  // scripts: [
  //   {src: 'https://plausible.io/js/script.js', defer: true, 'data-domain': 'huythang011104.github.io'},
  // ],

  themeConfig: {
    image: 'img/Rhino.png',
    metadata: [
      {
        name: 'keywords',
        content:
          'expo, react native, expo router, boilerplate, template, tanstack query, dev client',
      },
      {
        name: 'description',
        content:
          'Titan: Expo boilerplate with a working example — auth, feed, post detail — plus enforced module boundaries and one-command setup.',
      },
    ],
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Titan',
      logo: {
        alt: 'Titan Logo',
        src: 'img/Rhino.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'main',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/HuyThang011104/expo-template-titan',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      // Docs rewrite in progress: no /docs/* links until the new IA lands.
      // Re-add Start/Architecture/Guides columns per new sidebar entries.
      links: [
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/HuyThang011104/expo-template-titan',
            },
            {
              label: 'Docs feedback (label: docs)',
              href: 'https://github.com/HuyThang011104/expo-template-titan/issues/new?labels=docs',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Titan.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
