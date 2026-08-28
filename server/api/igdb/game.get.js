import { igdbFetch } from '../../utils/igdb'

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  if (!/^\d+$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid game id' })
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  const games = await igdbFetch('games', `fields name, first_release_date, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, summary, cover.image_id; where id = ${id}; limit 1;`)
  const data = games.at(0)

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  return {
    game: {
      igdb_id: [data.id],
      name: [data.name].filter(Boolean),
      year: [data.first_release_date ? new Date(data.first_release_date * 1000).getFullYear() : null].filter(Boolean),
      platform: [...new Set(data.platforms?.map((x) => x.name).filter(Boolean) || [])],
      genre: [...new Set(data.genres?.map((x) => x.name).filter(Boolean) || [])],
      developer: [...new Set(data.involved_companies?.filter((x) => x.developer).map((x) => x.company?.name).filter(Boolean) || [])],
      publisher: [...new Set(data.involved_companies?.filter((x) => x.publisher).map((x) => x.company?.name).filter(Boolean) || [])],
      notes: [data.summary].filter(Boolean)
    },
    cover: await getCover(data.cover?.image_id)
  }
})

async function getCover (imageId) {
  if (!/^[\w]+$/.test(imageId || '')) return null

  const cover = await $fetch(`https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`, { responseType: 'arrayBuffer' }).catch(() => null)

  return cover ? Buffer.from(cover).toString('base64') : null
}
