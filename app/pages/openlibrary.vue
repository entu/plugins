<script setup>
import { NButton, NInput, NInputGroup, NPagination, NSelect, NSpin, NTable } from 'naive-ui'

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

const worksPage = ref(1)
const editionsPage = ref(1)

const pageSize = 20
const localeLanguages = { en: 'eng', et: 'est' }

const languageOptions = computed(() => [...new Set(editions.value.flatMap((x) => x.language))].map((x) => ({ label: getLanguageName(x), value: x })))

const filteredEditions = computed(() => languageFilter.value ? editions.value.filter((x) => x.language.includes(languageFilter.value)) : editions.value)

const paginatedWorks = computed(() => works.value.slice((worksPage.value - 1) * pageSize, worksPage.value * pageSize))

const paginatedEditions = computed(() => filteredEditions.value.slice((editionsPage.value - 1) * pageSize, editionsPage.value * pageSize))

watch(languageFilter, () => {
  editionsPage.value = 1
})

async function doSearch () {
  if (isLoading.value || !queryString.value) return

  isLoading.value = true

  works.value = []
  editions.value = []
  selectedWork.value = null
  languageFilter.value = null
  worksPage.value = 1
  editionsPage.value = 1
  works.value = await $fetch('/api/openlibrary', { query: { q: queryString.value } })

  isLoading.value = false
}

async function doSelectWork (work) {
  if (isLoading.value) return

  isLoading.value = true

  selectedWork.value = work
  editions.value = []
  editionsPage.value = 1
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
  editionsPage.value = 1
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

  const response = await $fetch(`${runtimeConfig.public.entuApiUrl}/${query.account}/entity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${query.token}` },
    body: properties.filter((x) => x.type && (x.string || x.reference || x.filename))
  })

  if (!response?._id) {
    error.value = 'Failed to import entity!'
    isAdding.value = false
    return
  }

  await uploadCover(photo, response.properties?.photo?.at(0)?.upload)

  await navigateTo(`${runtimeConfig.public.entuUrl}/${query.account}/${response._id}#edit`, { external: true, open: { target: '_top' } })
}

async function getCover (cover) {
  if (!cover) return null

  return $fetch('/api/openlibrary/cover', { query: { id: cover }, responseType: 'blob' }).catch(() => null)
}

async function uploadCover (photo, upload) {
  if (!photo || !upload) return

  const headers = { ...upload.headers }
  delete headers['Content-Length']

  await $fetch(upload.url, { method: upload.method, headers, body: photo }).catch(() => null)
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
      class="overflow-auto"
    >
      <div class="mx-4 mb-4 flex items-center justify-between gap-4">
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
            v-for="item in paginatedEditions"
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

      <n-pagination
        v-if="filteredEditions.length > pageSize"
        v-model:page="editionsPage"
        class="mx-4 mt-4 justify-center"
        :item-count="filteredEditions.length"
        :page-size="pageSize"
      />
    </div>

    <div
      v-else
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
            v-for="item in paginatedWorks"
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

      <n-pagination
        v-if="works.length > pageSize"
        v-model:page="worksPage"
        class="mx-4 mt-4 justify-center"
        :item-count="works.length"
        :page-size="pageSize"
      />
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
