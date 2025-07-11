// @ts-check

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.

 @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  // Custom sidebar for Cloud Resource Reservation documentation
  tutorialSidebar: [
    'intro',
    'complete-setup-guide',
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/kubernetes-deployment',
        {
          type: 'category',
          label: 'Webhooks',
          items: [
            'guides/webhooks',
            {
              type: 'category',
              label: 'Use Cases',
              items: [
                'guides/webhook-use-cases/database-management',
                'guides/webhook-use-cases/vm-container-management',
                'guides/webhook-use-cases/api-key-management',
                'guides/webhook-use-cases/network-switch-configuration',
              ],
            },
          ],
        },
      ],
    },
  ],
};

export default sidebars;
