const { tmdbKey } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { id, l } = getQuery(event)

  if (!/^\d+$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid movie id' })
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  const language = l === 'et' ? 'et-EE' : 'en-US'

  const data = await $fetch(`https://api.themoviedb.org/3/movie/${id}`, {
    headers: { Authorization: `Bearer ${tmdbKey}` },
    query: { language, append_to_response: 'credits' }
  })

  return {
    movie: {
      tmdb_id: [data.id],
      name: [data.title],
      original_name: [data.original_title !== data.title ? data.original_title : null].filter(Boolean),
      year: [data.release_date?.slice(0, 4)].filter(Boolean),
      director: [...new Set(data.credits?.crew?.filter((x) => x.job === 'Director')?.map((x) => x.name))],
      actor: [...new Set(data.credits?.cast?.slice(0, 10)?.map((x) => x.name))],
      genre: [...new Set(data.genres?.map((x) => x.name))],
      runtime: [data.runtime].filter(Boolean),
      language: [...new Set([data.original_language, ...data.spoken_languages?.map((x) => x.iso_639_1) || []])].filter(Boolean),
      country: [...new Set(data.production_countries?.map((x) => x.name))],
      company: [...new Set(data.production_companies?.map((x) => x.name))],
      imdb_id: [data.imdb_id].filter(Boolean),
      notes: [data.overview].filter(Boolean)
    },
    cover: await getCover(data.poster_path)
  }
})

async function getCover (posterPath) {
  if (!/^\/[\w.-]+$/.test(posterPath || '')) return null

  const cover = await $fetch(`https://image.tmdb.org/t/p/w780${posterPath}`, { responseType: 'arrayBuffer' }).catch(() => null)

  return cover ? Buffer.from(cover).toString('base64') : null
}
