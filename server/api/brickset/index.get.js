const { bricksetKey } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  const { sets } = await $fetch('https://brickset.com/api/v3.asmx/getSets', {
    query: {
      apiKey: bricksetKey,
      userHash: '',
      params: JSON.stringify({ query: q, pageSize: 100 })
    }
  })

  return (sets || []).map((x) => ({
    id: `${x.number}-${x.numberVariant}`,
    name: x.name,
    year: x.year,
    theme: x.theme,
    pieces: x.pieces,
    image: x.image?.thumbnailURL?.startsWith('https://images.brickset.com/') ? x.image.thumbnailURL : null
  }))
})
