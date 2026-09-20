import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "CodeChef docs",
  description: "CodeChef is React-SPA project for visual programming using blocks and python-codegeneration",
  themeConfig: {
    nav: [
      { text: 'Main', link: '/' },
      { text: 'API', link: '/api/' } 
    ],
    sidebar: {
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' }
          ]
        }
      ]
    },
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/HolodTema/isu-blockly-python-sandbox' }
    ]
  }
})

