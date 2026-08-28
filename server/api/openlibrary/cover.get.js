export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  if (!/^\d+$/.test(id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid cover id' })
  }

  setResponseHeader(event, 'Content-Type', 'image/jpeg')

  const cover = await $fetch(`https://covers.openlibrary.org/b/id/${id}-L.jpg`, { responseType: 'arrayBuffer' })

  return Buffer.from(cover)
})
