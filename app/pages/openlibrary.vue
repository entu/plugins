<script setup>
import { NButton, NInput, NInputGroup, NSelect, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const { definitions, entity, error, isAdding, isEdit, sourceProperties, doCancel, doSave, importProperties, init } = useEntityImport()

const queryString = ref('')
const works = ref([])
const editions = ref([])
const selectedWork = ref(null)
const languageFilter = ref(null)
const isLoading = ref(false)

const worksListElement = useTemplateRef('worksListElement')
const editionsListElement = useTemplateRef('editionsListElement')
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
  if (worksVisible.value < works.value.length) {
    worksVisible.value += chunkSize
  }
}, { distance: 150 })

useInfiniteScroll(editionsListElement, () => {
  if (editionsVisible.value < filteredEditions.value.length) {
    editionsVisible.value += chunkSize
  }
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
  isAdding.value = true

  const properties = []

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
      filetype: 'image/jpeg',
      blob: photo
    })
  }

  await importProperties(properties.filter((x) => x.type && (x.string || x.filename)))
}

async function getCover (cover) {
  if (!cover) {
    return null
  }

  return $fetch('/api/openlibrary/cover', { query: { id: cover }, responseType: 'blob' }).catch(() => null)
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

onMounted(async () => {
  locale.value = query.locale || 'en'

  const searchText = await init()

  if (searchText) {
    doScan(searchText)
  }
})
</script>

<template>
  <div
    v-if="error"
    class="flex h-full max-h-full items-center justify-center font-bold text-red-600"
  >
    {{ error }}
  </div>

  <div
    v-else-if="isAdding"
    class="flex h-full max-h-full items-center justify-center"
  >
    <n-spin show />
  </div>

  <compare-properties
    v-else-if="sourceProperties"
    :definitions="definitions"
    :entity="entity"
    :source-properties="sourceProperties"
    @cancel="doCancel()"
    @save="doSave"
  />

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

    <a
      class="mx-auto -mt-4 text-xs opacity-50 hover:underline"
      href="https://openlibrary.org"
      rel="noopener noreferrer"
      target="_blank"
    >{{ t('source') }}</a>

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
        striped
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
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
                  class="mx-auto max-h-16 max-w-16"
                  :src="item.image"
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
                {{ isEdit ? t('update') : t('import') }}
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
        striped
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
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
                  class="mx-auto max-h-16 max-w-16"
                  :src="item.image"
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
    source: Data provided by Open Library
    editions: Editions
    back: Back
    language: Language
    import: Import
    update: Update
  et:
    search: Otsi
    searchInfo: Otsi Open Library-st
    source: "Andmed: Open Library"
    editions: Väljaanded
    back: Tagasi
    language: Keel
    import: Impordi
    update: Uuenda
</i18n>
