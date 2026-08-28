const { numistaKey } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  const { types } = await $fetch('https://api.numista.com/v3/types', {
    headers: { 'Numista-API-Key': numistaKey },
    query: { q, count: 50, lang: 'en' }
  })

  return (types || []).map((x) => ({
    id: x.id,
    title: x.title,
    category: x.category,
    issuer: x.issuer?.name,
    min_year: x.min_year,
    max_year: x.max_year,
    image: getImage(x.obverse_thumbnail)
  }))
})

function getImage (url) {
  try {
    const { protocol, hostname } = new URL(url)

    return protocol === 'https:' && (hostname === 'numista.com' || hostname.endsWith('.numista.com')) ? url : null
  }
  catch {
    return null
  }
}
