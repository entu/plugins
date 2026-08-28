import TurndownService from 'turndown'

const { numistaKey } = useRuntimeConfig()

const turndown = new TurndownService()

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  if (!/^\d+$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid type id' })
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  const data = await $fetch(`https://api.numista.com/v3/types/${id}`, {
    headers: { 'Numista-API-Key': numistaKey },
    query: { lang: 'en' }
  })

  return {
    type: {
      numista_id: [data.id],
      name: [data.title].filter(Boolean),
      country: [data.issuer?.name].filter(Boolean),
      year: [...new Set([data.min_year, data.max_year].filter(Boolean))],
      value: [data.value?.text].filter(Boolean),
      material: [data.composition?.text].filter(Boolean),
      weight: [data.weight].filter(Boolean).map((x) => `${x} g`),
      dimensions: [data.size].filter(Boolean).map((x) => `${x} mm`),
      shape: [data.shape].filter(Boolean),
      series: [data.series].filter(Boolean),
      catalog_number: [...new Set(data.references?.map((x) => [x.catalogue?.code, x.number].filter(Boolean).join(' ')).filter(Boolean) || [])],
      notes: [data.comments].filter(Boolean).map((x) => turndown.turndown(x))
    },
    covers: [
      { name: 'obverse', data: await getCover(data.obverse?.picture) },
      { name: 'reverse', data: await getCover(data.reverse?.picture) }
    ].filter((x) => x.data)
  }
})

async function getCover (url) {
  try {
    const { protocol, hostname } = new URL(url)

    if (protocol !== 'https:' || (hostname !== 'numista.com' && !hostname.endsWith('.numista.com'))) return null
  }
  catch {
    return null
  }

  const cover = await $fetch(url, { responseType: 'arrayBuffer' }).catch(() => null)

  return cover ? Buffer.from(cover).toString('base64') : null
}
