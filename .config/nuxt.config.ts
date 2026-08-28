import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxtjs/i18n',
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
  css: ['~/assets/tailwind.css'],
  spaLoadingTemplate: false,
  runtimeConfig: {
    bggKey: '',
    bricksetKey: '',
    discogsKey: '',
    entuKey: '',
    tmdbKey: '',
    public: {
      entuApiUrl: '',
      entuUrl: ''
    }
  },
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2024-09-04',
  vite: {
    plugins: [tailwindcss()]
  },
  eslint: {
    config: {
      autoInit: false,
      stylistic: true
    }
  },
  i18n: {
    locales: [
      { code: 'en', name: 'English' },
      { code: 'et', name: 'Eesti keel' }
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: false
    },
    vueI18n: '~~/.config/i18n.config.ts'
  },
  icon: {
    customCollections: [{
      dir: './app/assets/icons',
      prefix: 'local'
    }]
  }
})
