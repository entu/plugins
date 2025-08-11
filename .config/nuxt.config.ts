// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxtjs/i18n',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt'
  ],
  ssr: false,
  devtools: { enabled: false },
  app: {
    head: {
      script: [
        { src: 'https://analytics.entu.dev/ea.min.js', 'data-site': 'plugins.entu.app', crossorigin: 'anonymous', defer: true }
      ]
    }
  },
  spaLoadingTemplate: false,
  runtimeConfig: {
    discogsKey: '',
    entuKey: '',
    public: {
      entuUrl: ''
    }
  },
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2024-09-04',
  eslint: {
    config: {
      autoInit: false,
      stylistic: true
    }
  },
  i18n: {
    vueI18n: '~~/.config/i18n.config.ts'
  },
  icon: {
    customCollections: [{
      dir: './app/assets/icons',
      prefix: 'local'
    }]
  },
  tailwindcss: {
    cssPath: '~/assets/tailwind.css',
    configPath: '~~/.config/tailwind.config.ts'
  }
})
