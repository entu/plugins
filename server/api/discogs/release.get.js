const { discogsKey } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  if (!/^\d+$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid release id' })
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  const data = await $fetch(`https://api.discogs.com/releases/${id}`, { headers: { Authorization: `Discogs token=${discogsKey}` } })

  return {
    release: {
      discogs_id: [data.id],
      year: [data.year],
      artist: [...new Set(data.artists?.map((x) => x.name))],
      series: [...new Set(data.series?.map((x) => x.name))],
      series_number: [...new Set(data.series?.map((x) => x.catno))],
      label: [...new Set(data.labels?.map((x) => x.name))],
      company: [...new Set(data.companies?.map((x) => x.name))],
      format: [...new Set(data.formats?.map((x) => [x.name, ...x.descriptions]).flat())],
      title: [data.title],
      country: [data.country],
      notes: [data.notes],
      barcode: [...new Set(data.identifiers?.filter((x) => x.type.toLowerCase() === 'barcode')?.map((x) => x.value))],
      genre: [...new Set(data.genres)],
      style: [...new Set(data.styles)]
    },
    cover: await getCover(data)
  }
})

async function getCover (data) {
  const image = data.images?.find((x) => x.type === 'primary') || data.images?.at(0)

  if (!image?.uri?.startsWith('https://i.discogs.com/')) return null

  const cover = await $fetch(image.uri, { responseType: 'arrayBuffer', headers: { 'User-Agent': 'EntuPlugins/1.0' } }).catch(() => null)

  return cover ? Buffer.from(cover).toString('base64') : null
}
