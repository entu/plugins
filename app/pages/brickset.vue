<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const { definitions, entity, error, isAdding, isEdit, sourceProperties, doCancel, doSave, importProperties, init } = useEntityImport()

const queryString = ref('')
const sets = ref([])
const isLoading = ref(false)

const setsListElement = useTemplateRef('setsListElement')
const setsVisible = ref(20)

const chunkSize = 20

const visibleSets = computed(() => sets.value.slice(0, setsVisible.value))

useInfiniteScroll(setsListElement, () => {
  if (setsVisible.value < sets.value.length) {
    setsVisible.value += chunkSize
  }
}, { distance: 150 })

async function doSearch () {
  if (isLoading.value || !queryString.value) return

  isLoading.value = true

  sets.value = []
  setsVisible.value = chunkSize
  sets.value = await $fetch('/api/brickset', { query: { q: queryString.value } })

  isLoading.value = false
}

async function doImport (item) {
  isAdding.value = true

  const { set, cover } = await $fetch('/api/brickset/set', { query: { id: item.id } })

  const properties = []

  for (const [key, value] of Object.entries(set)) {
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
        :formats="['ean_13', 'upc_a']"
        @scan="doScan"
      />
    </n-input-group>

    <a
      class="mx-auto -mt-4 text-xs opacity-50 hover:underline"
      href="https://brickset.com"
      rel="noopener noreferrer"
      target="_blank"
    >{{ t('source') }}</a>

    <div
      ref="setsListElement"
      class="overflow-auto"
    >
      <n-table
        v-if="visibleSets.length > 0"
        striped
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
      >
        <tbody>
          <tr
            v-for="item in visibleSets"
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
                  :href="`https://brickset.com/sets/${item.id}`"
                >
                  {{ [item.id, item.name].join(' ') }}
                </a>
                <div>
                  {{ item.theme }}
                </div>
                <div class="italic">
                  {{ [item.year, item.pieces].filter(Boolean).join(', ') }}
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
    searchInfo: Search from Brickset
    source: Data provided by Brickset
    import: Import
    update: Update
  et:
    search: Otsi
    searchInfo: Otsi Brickset-ist
    source: "Andmed: Brickset"
    import: Impordi
    update: Uuenda
</i18n>
