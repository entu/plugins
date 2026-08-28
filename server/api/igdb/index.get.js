import { igdbFetch } from '../../utils/igdb'

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  const games = await igdbFetch('games', `search "${q.replace(/["\\]/g, '')}"; fields name, first_release_date, platforms.abbreviation, cover.image_id; limit 100;`)

  return games.map((x) => ({
    id: x.id,
    name: x.name,
    year: x.first_release_date ? new Date(x.first_release_date * 1000).getFullYear() : null,
    platform: [...new Set(x.platforms?.map((p) => p.abbreviation).filter(Boolean) || [])],
    image: x.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${x.cover.image_id}.jpg` : null
  }))
})
