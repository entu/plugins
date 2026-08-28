export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  if (!/^OL\d+W$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid work id' })
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  const entries = []
  let offset = 0
  let size = Infinity

  while (offset < size && offset < 500) {
    const result = await $fetch(`https://openlibrary.org/works/${id}/editions.json`, { query: { limit: 100, offset } })

    size = result.size
    entries.push(...result.entries)
    offset += 100
  }

  return entries.map((x) => {
    const cover = x.covers?.find((c) => c > 0)

    return {
      'openlibrary-id': [x.key?.split('/').at(-1)].filter(Boolean),
      title: [x.title].filter(Boolean),
      subtitle: [x.subtitle].filter(Boolean),
      publisher: [...new Set(x.publishers || [])],
      'publishing-place': [...new Set(x.publish_places || [])],
      'publishing-date': [x.publish_date].filter(Boolean).map(String),
      series: [...new Set(x.series || [])],
      pages: [x.pagination || x.number_of_pages].filter(Boolean).map(String),
      dimensions: [x.physical_dimensions].filter(Boolean),
      weight: [x.weight].filter(Boolean),
      language: [...new Set(x.languages?.map((l) => l.key?.split('/').at(-1)) || [])].filter(Boolean),
      isbn: [...new Set([...x.isbn_13 || [], ...x.isbn_10 || []])],
      notes: [x.notes?.value || x.notes].filter((n) => typeof n === 'string'),
      cover,
      image: cover ? `https://covers.openlibrary.org/b/id/${cover}-S.jpg` : null
    }
  })
})
