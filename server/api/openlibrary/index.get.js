export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  const { docs } = await $fetch('https://openlibrary.org/search.json', {
    query: {
      q,
      fields: 'key,title,subtitle,author_name,first_publish_year,subject,cover_i',
      limit: 20
    }
  })

  return docs.map((x) => ({
    'openlibrary-id': [x.key?.split('/').at(-1)].filter(Boolean),
    title: [x.title].filter(Boolean),
    subtitle: [x.subtitle].filter(Boolean),
    author: [...new Set(x.author_name || [])],
    'publishing-date': [x.first_publish_year].filter(Boolean).map(String),
    tag: [...new Set(x.subject || [])].slice(0, 20),
    image: x.cover_i ? `https://covers.openlibrary.org/b/id/${x.cover_i}-S.jpg` : null
  }))
})
