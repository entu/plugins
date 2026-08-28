const headers = { 'User-Agent': 'EntuPlugins/1.0 (https://plugins.entu.app)' }

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  const groups = await getGroups(q)

  return groups.map((x) => ({
    id: x.id,
    title: x.title,
    artist: [...new Set(x['artist-credit']?.map((a) => a.name) || [])],
    year: x['first-release-date']?.slice(0, 4),
    type: x['primary-type'],
    image: `https://coverartarchive.org/release-group/${x.id}/front-250`
  }))
})

// A scanned barcode is searched on releases and mapped back to their release groups
async function getGroups (q) {
  if (/^\d{8,14}$/.test(q)) {
    const { releases } = await $fetch('https://musicbrainz.org/ws/2/release', {
      headers,
      query: { query: `barcode:${q}`, limit: 100, fmt: 'json' }
    })

    const groups = releases?.map((x) => x['release-group']).filter(Boolean) || []

    return [...new Map(groups.map((x) => [x.id, x])).values()]
  }

  const { 'release-groups': groups } = await $fetch('https://musicbrainz.org/ws/2/release-group', {
    headers,
    query: { query: q, limit: 100, fmt: 'json' }
  })

  return groups || []
}
