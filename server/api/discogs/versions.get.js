const { discogsKey } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  if (!/^\d+$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid master id' })
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  const versions = []
  let page = 1
  let pages = Infinity

  while (page <= pages && versions.length < 500) {
    const result = await $fetch(`https://api.discogs.com/masters/${id}/versions`, {
      headers: { Authorization: `Discogs token=${discogsKey}` },
      query: { page, per_page: 100 }
    })

    pages = result.pagination.pages
    versions.push(...result.versions)
    page += 1
  }

  return versions.map((x) => ({
    id: x.id,
    title: x.title,
    year: x.released,
    country: x.country,
    format: [x.format].filter(Boolean),
    label: [x.label].filter(Boolean),
    image: x.thumb
  }))
})
