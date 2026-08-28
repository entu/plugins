const headers = { 'User-Agent': 'EntuPlugins/1.0 (https://plugins.entu.app)' }

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid release group id' })
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  const { releases } = await $fetch('https://musicbrainz.org/ws/2/release', {
    headers,
    query: { 'release-group': id, inc: 'labels+media', limit: 100, fmt: 'json' }
  })

  return (releases || []).map((x) => ({
    id: x.id,
    title: x.title,
    year: x.date?.slice(0, 4),
    country: x.country,
    format: [...new Set(x.media?.map((m) => m.format).filter(Boolean) || [])],
    label: [...new Set(x['label-info']?.map((l) => l.label?.name).filter(Boolean) || [])],
    image: `https://coverartarchive.org/release/${x.id}/front-250`
  }))
})
