<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const runtimeConfig = useRuntimeConfig()

const error = ref(null)
const queryString = ref('')
const movies = ref([])
const isLoading = ref(false)
const isAdding = ref(false)

const moviesListElement = ref(null)
const moviesVisible = ref(20)

const chunkSize = 20

const visibleMovies = computed(() => movies.value.slice(0, moviesVisible.value))

useInfiniteScroll(moviesListElement, () => {
  if (moviesVisible.value < movies.value.length) moviesVisible.value += chunkSize
}, { distance: 150 })

async function doSearch () {
  if (isLoading.value || !queryString.value) return

  isLoading.value = true

  movies.value = []
  moviesVisible.value = chunkSize
  movies.value = await $fetch('/api/tmdb', { query: { q: queryString.value, l: locale.value } })

  isLoading.value = false
}

async function doImport (item) {
  if (!query.account) return
  if (!query.type) return
  if (!query.token) return

  isAdding.value = true

  const { movie, cover } = await $fetch('/api/tmdb/movie', { query: { id: item.id, l: locale.value } })

  const properties = [
    { type: '_type', reference: query.type }
  ]

  if (query.parent) {
    properties.push({ type: '_parent', reference: query.parent })
  }

  for (const [key, value] of Object.entries(movie)) {
    for (const i of value) {
      properties.push({
        type: key,
        string: i
      })
    }
  }

  const photo = getCoverBlob(cover)

  if (photo) {
    properties.push({
      type: 'photo',
      filename: `cover-${item.id}.jpg`,
      filesize: photo.size,
      filetype: 'image/jpeg'
    })
  }

  const response = await $fetch(`${runtimeConfig.public.entuApiUrl}/${encodeURIComponent(query.account)}/entity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${query.token}` },
    body: properties.filter((x) => x.type && (x.string || x.reference || x.filename))
  })

  if (!response?._id) {
    error.value = 'Failed to import entity!'
    isAdding.value = false
    return
  }

  const isUploaded = await uploadCover(photo, response.properties?.find((x) => x.type === 'photo')?.upload)

  if (photo && !isUploaded) {
    error.value = 'Failed to upload cover!'
    isAdding.value = false
    return
  }

  await navigateTo(`${runtimeConfig.public.entuUrl}/${encodeURIComponent(query.account)}/${encodeURIComponent(response._id)}#edit`, { external: true, open: { target: '_top' } })
}

function getCoverBlob (cover) {
  if (!cover) return null

  const bytes = Uint8Array.from(atob(cover), (c) => c.charCodeAt(0))

  return new Blob([bytes], { type: 'image/jpeg' })
}

function uploadCover (photo, upload) {
  return new Promise((resolve) => {
    if (!photo || !upload) return resolve(false)

    const request = new XMLHttpRequest()
    request.open(upload.method, upload.url)

    for (const header in upload.headers) {
      if (header.toLowerCase() === 'content-length') continue

      request.setRequestHeader(header, upload.headers[header])
    }

    request.addEventListener('load', () => resolve(request.status === 200))
    request.addEventListener('error', () => resolve(false))
    request.send(photo)
  })
}

onMounted(() => {
  locale.value = query.locale || 'en'

  if (!query.account) {
    error.value = 'No account parameter!'
    return
  }

  if (!query.type) {
    error.value = 'No type parameter!'
  }

  if (!query.token) {
    error.value = 'No token parameter!'
  }
})
</script>

<template>
  <div
    v-if="error"
    class="flex h-full max-h-full items-center justify-center font-bold text-red-700"
  >
    {{ error }}
  </div>

  <div
    v-else-if="isAdding"
    class="flex h-full max-h-full items-center justify-center"
  >
    <n-spin show />
  </div>

  <div
    v-else
    class="flex h-full max-h-full flex-col gap-6 pt-6"
  >
    <n-input-group class="mx-auto max-w-80">
      <n-input
        v-model:value="queryString"
        autofocus
        :loading="isLoading"
        :placeholder="t('searchInfo')"
        @keyup.enter="doSearch()"
      />

      <n-button
        ghost
        type="primary"
        :disabled="isLoading"
        @click="doSearch()"
      >
        {{ t('search') }}
      </n-button>
    </n-input-group>

    <a
      class="mx-auto -mt-4 text-xs opacity-50 hover:underline"
      href="https://www.themoviedb.org"
      rel="noopener noreferrer"
      target="_blank"
    >{{ t('source') }}</a>

    <div
      ref="moviesListElement"
      class="overflow-auto"
    >
      <n-table
        v-if="visibleMovies.length > 0"
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
        :striped="true"
      >
        <tbody>
          <tr
            v-for="item in visibleMovies"
            :key="item.id"
          >
            <td class="flex items-start justify-between gap-4">
              <div class="w-16 shrink-0">
                <img
                  v-if="item.image"
                  :src="item.image"
                  class="mx-auto max-h-16 max-w-16"
                >
              </div>

              <div class="grow">
                <a
                  class="font-bold hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                  :href="`https://www.themoviedb.org/movie/${item.id}`"
                >
                  {{ item.title }}
                </a>
                <div
                  v-if="item.original_title"
                  class="italic"
                >
                  {{ item.original_title }}
                </div>
                <div>
                  {{ item.year }}
                </div>
              </div>

              <n-button @click="doImport(item)">
                {{ t('import') }}
              </n-button>
            </td>
          </tr>
        </tbody>
      </n-table>
    </div>
  </div>
</template>

<i18n lang="yaml">
  en:
    search: Search
    searchInfo: Search from TMDB
    source: This product uses the TMDB API but is not endorsed or certified by TMDB
    import: Import
  et:
    search: Otsi
    searchInfo: Otsi TMDB-st
    source: See rakendus kasutab TMDB API-t, kuid ei ole TMDB poolt heaks kiidetud ega sertifitseeritud
    import: Impordi
</i18n>
