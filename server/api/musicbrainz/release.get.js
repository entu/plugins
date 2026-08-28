const headers = { 'User-Agent': 'EntuPlugins/1.0 (https://plugins.entu.app)' }

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid release id' })
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  const data = await $fetch(`https://musicbrainz.org/ws/2/release/${id}`, {
    headers,
    query: { inc: 'artist-credits+labels+media+genres', fmt: 'json' }
  })

  return {
    release: {
      musicbrainz_id: [data.id],
      name: [data.title],
      artist: [...new Set(data['artist-credit']?.map((x) => x.name) || [])],
      year: [data.date?.slice(0, 4)].filter(Boolean),
      country: [data.country].filter(Boolean),
      label: [...new Set(data['label-info']?.map((x) => x.label?.name).filter(Boolean) || [])],
      format: [...new Set(data.media?.map((x) => x.format).filter(Boolean) || [])],
      barcode: [data.barcode].filter(Boolean),
      genre: [...new Set(data.genres?.map((x) => x.name) || [])]
    },
    cover: await getCover(data.id)
  }
})

async function getCover (id) {
  const cover = await $fetch(`https://coverartarchive.org/release/${id}/front-500`, { responseType: 'arrayBuffer', headers }).catch(() => null)

  return cover ? Buffer.from(cover).toString('base64') : null
}
