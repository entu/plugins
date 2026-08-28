const { bricksetKey } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  if (!/^[\w.]+-\d+$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid set number' })
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  const search = new URLSearchParams({
    apiKey: bricksetKey,
    userHash: '',
    params: JSON.stringify({ setNumber: id })
  })

  const { status, message, sets } = await $fetch(`https://brickset.com/api/v3.asmx/getSets?${search}`)

  if (status !== 'success') {
    throw createError({ statusCode: 502, statusMessage: message || 'Brickset error' })
  }

  const data = sets?.at(0)

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Set not found' })
  }

  return {
    set: {
      brickset_id: [`${data.number}-${data.numberVariant}`],
      name: [data.name].filter(Boolean),
      year: [data.year].filter(Boolean),
      theme: [data.theme].filter(Boolean),
      subtheme: [data.subtheme].filter(Boolean),
      pieces: [data.pieces].filter(Boolean),
      minifigs: [data.minifigs].filter(Boolean),
      barcode: [data.barcode?.EAN, data.barcode?.UPC].filter(Boolean)
    },
    cover: await getCover(data.image?.imageURL)
  }
})

async function getCover (image) {
  if (!image?.startsWith('https://images.brickset.com/')) return null

  const cover = await $fetch(image, { responseType: 'arrayBuffer' }).catch(() => null)

  return cover ? Buffer.from(cover).toString('base64') : null
}
