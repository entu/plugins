<script setup>
import { NButton, NInput, NInputGroup, NSelect, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const runtimeConfig = useRuntimeConfig()

const error = ref(null)
const queryString = ref('')
const works = ref([])
const editions = ref([])
const selectedWork = ref(null)
const languageFilter = ref(null)
const isLoading = ref(false)
const isAdding = ref(false)

const worksListElement = ref(null)
const editionsListElement = ref(null)
const worksVisible = ref(20)
const editionsVisible = ref(20)

const chunkSize = 20
const localeLanguages = { en: 'eng', et: 'est' }

const languageOptions = computed(() => [...new Set(editions.value.flatMap((x) => x.language))].map((x) => ({ label: getLanguageName(x), value: x })))

const filteredEditions = computed(() => languageFilter.value ? editions.value.filter((x) => x.language.includes(languageFilter.value)) : editions.value)

const visibleWorks = computed(() => works.value.slice(0, worksVisible.value))

const visibleEditions = computed(() => filteredEditions.value.slice(0, editionsVisible.value))

watch(languageFilter, () => {
  editionsVisible.value = chunkSize
})

useInfiniteScroll(worksListElement, () => {
  if (worksVisible.value < works.value.length) worksVisible.value += chunkSize
}, { distance: 150 })

useInfiniteScroll(editionsListElement, () => {
  if (editionsVisible.value < filteredEditions.value.length) editionsVisible.value += chunkSize
}, { distance: 150 })

async function doSearch () {
  if (isLoading.value || !queryString.value) return

  isLoading.value = true

  works.value = []
  editions.value = []
  selectedWork.value = null
  languageFilter.value = null
  worksVisible.value = chunkSize
  editionsVisible.value = chunkSize
  works.value = await $fetch('/api/openlibrary', { query: { q: queryString.value } })

  isLoading.value = false
}

async function doSelectWork (work) {
  if (isLoading.value) return

  isLoading.value = true

  selectedWork.value = work
  editions.value = []
  editionsVisible.value = chunkSize
  const result = await $fetch('/api/openlibrary/editions', { query: { id: work['openlibrary-id']?.[0] } })
  editions.value = result.map((x) => ({ ...x, author: work.author, tag: work.tag }))

  const localeLanguage = localeLanguages[locale.value]
  languageFilter.value = editions.value.some((x) => x.language.includes(localeLanguage)) ? localeLanguage : null

  isLoading.value = false
}

function doBack () {
  editions.value = []
  selectedWork.value = null
  languageFilter.value = null
  editionsVisible.value = chunkSize
}

async function doImport (item) {
  if (!query.account) return
  if (!query.type) return
  if (!query.token) return

  isAdding.value = true

  const properties = [
    { type: '_type', reference: query.type }
  ]

  if (query.parent) {
    properties.push({ type: '_parent', reference: query.parent })
  }

  for (const [key, value] of Object.entries(item)) {
    if (key === 'cover' || key === 'image') continue

    for (const i of value) {
      properties.push({
        type: convertType(key),
        string: i
      })
    }
  }

  const photo = await getCover(item.cover)

  if (photo) {
    properties.push({
      type: 'photo',
      filename: `cover-${item.cover}.jpg`,
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

async function getCover (cover) {
  if (!cover) return null

  return $fetch('/api/openlibrary/cover', { query: { id: cover }, responseType: 'blob' }).catch(() => null)
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

function getLanguageName (code) {
  try {
    return new Intl.DisplayNames([locale.value], { type: 'language' }).of(code) || code
  }
  catch {
    return code
  }
}

function convertType (type) {
  switch (type) {
    case 'title':
      return 'name'
    case 'isbn':
      return 'isn'
    default:
      return type.replaceAll('-', '_')
  }
}

function doScan (value) {
  queryString.value = value
  doSearch()
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

      <barcode-scanner
        :formats="['ean_13']"
        @scan="doScan"
      />
    </n-input-group>

    <div
      v-if="selectedWork"
      ref="editionsListElement"
      class="overflow-auto"
    >
      <div class="mx-3 mb-4 flex items-center justify-between gap-4">
        <n-button @click="doBack()">
          <template #icon>
            <my-icon icon="chevron-left" />
          </template>

          {{ t('back') }}
        </n-button>

        <n-select
          v-model:value="languageFilter"
          class="max-w-40"
          clearable
          :options="languageOptions"
          :placeholder="t('language')"
        />
      </div>

      <n-table
        v-if="filteredEditions.length > 0"
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
        :striped="true"
      >
        <tbody>
          <tr
            v-for="item in visibleEditions"
            :key="item['openlibrary-id']?.[0]"
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
                  :href="`https://openlibrary.org/books/${item['openlibrary-id']?.[0]}`"
                >
                  {{ item.title?.join(', ') }}
                </a>
                <div class="italic">
                  {{ item.subtitle?.join(', ') }}
                </div>
                <div>
                  {{ [...item['publishing-place'] || [], ...item['publishing-date'] || [], ...item.publisher || []].join(' ') }}
                </div>
                <div>
                  {{ [...item.language?.map(getLanguageName) || [], ...item.pages || []].join(', ') }}
                </div>
                <div>
                  {{ item.isbn?.join(', ') }}
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

    <div
      v-else
      ref="worksListElement"
      class="overflow-auto"
    >
      <n-table
        v-if="works.length > 0"
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
        :striped="true"
      >
        <tbody>
          <tr
            v-for="item in visibleWorks"
            :key="item['openlibrary-id']?.[0]"
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
                  :href="`https://openlibrary.org/works/${item['openlibrary-id']?.[0]}`"
                >
                  {{ item.title?.join(', ') }}
                </a>
                <div class="italic">
                  {{ item.subtitle?.join(', ') }}
                </div>
                <div>
                  {{ item.author?.join(', ') }}
                </div>
                <div>
                  {{ item['publishing-date']?.join(', ') }}
                </div>
              </div>

              <n-button
                icon-placement="right"
                @click="doSelectWork(item)"
              >
                <template #icon>
                  <my-icon icon="chevron-right" />
                </template>

                {{ t('editions') }}
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
    searchInfo: Search from Open Library
    editions: Editions
    back: Back
    language: Language
    import: Import
  et:
    search: Otsi
    searchInfo: Otsi Open Library-st
    editions: Väljaanded
    back: Tagasi
    language: Keel
    import: Impordi
</i18n>
