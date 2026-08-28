import { XMLParser } from 'fast-xml-parser'

const { bggKey } = useRuntimeConfig()

const headers = { Authorization: `Bearer ${bggKey}` }
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', htmlEntities: true })

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  if (!/^\d+$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid game id' })
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  const xml = await $fetch('https://boardgamegeek.com/xmlapi2/thing', {
    headers,
    query: { id },
    responseType: 'text'
  })

  const data = toArray(parser.parse(xml).items?.item).at(0)

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  return {
    game: {
      bgg_id: [data.id],
      name: [toArray(data.name).find((n) => n.type === 'primary')?.value].filter(Boolean),
      year: [data.yearpublished?.value].filter(Boolean),
      designer: getLinks(data, 'boardgamedesigner'),
      artist: getLinks(data, 'boardgameartist'),
      publisher: getLinks(data, 'boardgamepublisher').slice(0, 5),
      category: getLinks(data, 'boardgamecategory'),
      mechanic: getLinks(data, 'boardgamemechanic'),
      min_players: [data.minplayers?.value].filter(Boolean),
      max_players: [data.maxplayers?.value].filter(Boolean),
      playing_time: [data.playingtime?.value].filter(Boolean),
      age_min: [data.minage?.value].filter(Boolean),
      notes: [data.description].filter(Boolean)
    },
    cover: await getCover(data.image)
  }
})

function getLinks (data, type) {
  return [...new Set(toArray(data.link).filter((x) => x.type === type).map((x) => x.value))]
}

async function getCover (image) {
  if (!image?.startsWith('https://cf.geekdo-images.com/')) return null

  const cover = await $fetch(image, { responseType: 'arrayBuffer' }).catch(() => null)

  return cover ? Buffer.from(cover).toString('base64') : null
}

function toArray (value) {
  if (!value) return []

  return Array.isArray(value) ? value : [value]
}
