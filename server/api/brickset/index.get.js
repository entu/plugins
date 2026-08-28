const { bricksetKey } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  const search = new URLSearchParams({
    apiKey: bricksetKey,
    userHash: '',
    params: JSON.stringify({ query: q, pageSize: 500 })
  })

  const { status, message, sets } = await $fetch(`https://brickset.com/api/v3.asmx/getSets?${search}`)

  if (status !== 'success') {
    throw createError({ statusCode: 502, statusMessage: message || 'Brickset error' })
  }

  return (sets || []).map((x) => ({
    id: `${x.number}-${x.numberVariant}`,
    name: x.name,
    year: x.year,
    theme: x.theme,
    pieces: x.pieces,
    image: x.image?.thumbnailURL?.startsWith('https://images.brickset.com/') ? x.image.thumbnailURL : null
  }))
})
