// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@unocss/nuxt',],
  runtimeConfig: {
    public: {
      turnUrl: process.env.NUXT_TURN_URL,
      turnUser: process.env.NUXT_TURN_USER,
      turnPassword: process.env.NUXT_TURN_PASSWORD
    }
  },
  nitro: {
    experimental: {
      websocket: true
    }
  }
})
