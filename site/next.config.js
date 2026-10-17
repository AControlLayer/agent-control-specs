const withNextra = require('nextra').default({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx',
})

module.exports = withNextra({
  // The docs folder has no index page; send its URL to the withdrawal record.
  async redirects() {
    return [{ source: '/docs', destination: '/docs/README', permanent: false }]
  },
})
