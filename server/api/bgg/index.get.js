import { XMLParser } from 'fast-xml-parser'

const { bggKey } = useRuntimeConfig()

const headers = { Authorization: `Bearer ${bggKey}` }
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  const searchXml = await $fetch('https://boardgamegeek.com/xmlapi2/search', {
    headers,
    query: { query: q, type: 'boardgame' },
    responseType: 'text'
  })

  const found = toArray(parser.parse(searchXml).items?.item).slice(0, 30)

  if (found.length === 0) return []

  const thingsXml = await $fetch('https://boardgamegeek.com/xmlapi2/thing', {
    headers,
    query: { id: found.map((x) => x.id).join(',') },
    responseType: 'text'
  })

  return toArray(parser.parse(thingsXml).items?.item).map((x) => ({
    id: x.id,
    title: toArray(x.name).find((n) => n.type === 'primary')?.value,
    year: x.yearpublished?.value,
    image: x.thumbnail?.startsWith('https://cf.geekdo-images.com/') ? x.thumbnail : null
  }))
})

function toArray (value) {
  if (!value) return []

  return Array.isArray(value) ? value : [value]
}
