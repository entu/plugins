<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const { definitions, entity, error, isAdding, isEdit, sourceProperties, doCancel, doSave, importProperties, init } = useEntityImport()

const queryString = ref('')
const movies = ref([])
const isLoading = ref(false)

const moviesListElement = useTemplateRef('moviesListElement')
const moviesVisible = ref(20)

const chunkSize = 20

const visibleMovies = computed(() => movies.value.slice(0, moviesVisible.value))

useInfiniteScroll(moviesListElement, () => {
  if (moviesVisible.value < movies.value.length) {
    moviesVisible.value += chunkSize
  }
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
  isAdding.value = true

  const { movie, cover } = await $fetch('/api/tmdb/movie', { query: { id: item.id, l: locale.value } })

  const properties = []

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
      filetype: 'image/jpeg',
      blob: photo
    })
  }

  await importProperties(properties.filter((x) => x.type && (x.string || x.filename)))
}

onMounted(async () => {
  locale.value = query.locale || 'en'

  const searchText = await init()

  if (searchText) {
    queryString.value = searchText
    doSearch()
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
        striped
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
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
                  class="mx-auto max-h-16 max-w-16"
                  :src="item.image"
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
                {{ isEdit ? t('update') : t('import') }}
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
    update: Update
  et:
    search: Otsi
    searchInfo: Otsi TMDB-st
    source: See rakendus kasutab TMDB API-t, kuid ei ole TMDB poolt heaks kiidetud ega sertifitseeritud
    import: Impordi
    update: Uuenda
</i18n>
