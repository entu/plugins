const { igdbClientId, igdbClientSecret } = useRuntimeConfig()

let token = null
let tokenTime = null

// Queries the IGDB API with a cached Twitch app access token
export async function igdbFetch (endpoint, body) {
  if (!token || tokenTime < Date.now()) {
    const data = await $fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      query: {
        client_id: igdbClientId,
        client_secret: igdbClientSecret,
        grant_type: 'client_credentials'
      }
    })

    token = data.access_token
    tokenTime = Date.now() + (data.expires_in - 60) * 1000
  }

  return $fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': igdbClientId,
      Authorization: `Bearer ${token}`
    },
    body
  })
}
