const { tmdbKey } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { q, l } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  const language = l === 'et' ? 'et-EE' : 'en-US'
  const movies = []
  let page = 1
  let pages = Infinity

  while (page <= pages && movies.length < 100) {
    const result = await $fetch('https://api.themoviedb.org/3/search/movie', {
      headers: { Authorization: `Bearer ${tmdbKey}` },
      query: { query: q, language, page }
    })

    pages = result.total_pages
    movies.push(...result.results)
    page += 1
  }

  return movies.map((x) => ({
    id: x.id,
    title: x.title,
    original_title: x.original_title !== x.title ? x.original_title : null,
    year: x.release_date?.slice(0, 4),
    image: x.poster_path ? `https://image.tmdb.org/t/p/w154${x.poster_path}` : null
  }))
})
