const { discogsKey } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  const { results } = await $fetch('https://api.discogs.com/database/search', {
    headers: { Authorization: `Discogs token=${discogsKey}` },
    query: {
      query: q,
      type: 'master',
      per_page: 100
    }
  })

  return results.map((x) => ({
    id: x.id,
    title: x.title,
    year: x.year,
    country: x.country,
    format: [...new Set(x.format || [])],
    label: [...new Set(x.label || [])],
    image: x.thumb
  }))
})
