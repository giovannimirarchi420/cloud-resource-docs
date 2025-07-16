// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Cloud Resource Reservation',
  tagline: 'Automate and manage cloud resource reservations with ease',
  favicon: 'img/logo.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://giovannimirarchi420.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'giovannimirarchi420', // Usually your GitHub org/user name.
  projectName: 'cloud-resource-docs', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

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
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/giovannimirarchi420/cloud-resource-docs/tree/main/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'Cloud Resource Reservation',
        logo: {
          alt: 'Cloud Resource Reservation Logo',
          src: 'img/logo.svg',
        },
        style: 'primary',
        hideOnScroll: false,
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/giovannimirarchi420/cloud-resource-docs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'System Overview',
                to: '/docs/intro',
              },
              {
                label: 'Complete Setup Guide',
                to: '/docs/complete-setup-guide',
              },
              {
                label: 'Webhooks Integration',
                to: '/docs/guides/webhooks',
              },
            ],
          },
          {
            title: 'Components',
            items: [
              {
                label: 'Backend Service',
                href: 'https://github.com/giovannimirarchi420/reservation-be',
              },
              {
                label: 'Frontend App',
                href: 'https://github.com/giovannimirarchi420/reservation-fe',
              },
              {
                label: 'Event Processor',
                href: 'https://github.com/giovannimirarchi420/reservation-event-processor',
              },
              {
                label: 'Webhook Archetype',
                href: 'https://github.com/giovannimirarchi420/webhook-archetype',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/giovannimirarchi420/cloud-resource-docs',
              },
            ],
          },
        ],
        copyright: `Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
