<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const { definitions, entity, error, isAdding, isEdit, sourceProperties, doCancel, doSave, importProperties, init } = useEntityImport()

const queryString = ref('')
const types = ref([])
const isLoading = ref(false)

const typesListElement = useTemplateRef('typesListElement')
const typesVisible = ref(20)

const chunkSize = 20

const visibleTypes = computed(() => types.value.slice(0, typesVisible.value))

useInfiniteScroll(typesListElement, () => {
  if (typesVisible.value < types.value.length) {
    typesVisible.value += chunkSize
  }
}, { distance: 150 })

async function doSearch () {
  if (isLoading.value || !queryString.value) return

  isLoading.value = true

  types.value = []
  typesVisible.value = chunkSize
  types.value = await $fetch('/api/numista', { query: { q: queryString.value } })

  isLoading.value = false
}

async function doImport (item) {
  isAdding.value = true

  const { type, covers } = await $fetch('/api/numista/type', { query: { id: item.id } })

  const properties = []

  for (const [key, value] of Object.entries(type)) {
    for (const i of value) {
      properties.push({
        type: key,
        string: i
      })
    }
  }

  const photos = covers.map((x) => ({ filename: `${x.name}-${item.id}.jpg`, blob: getCoverBlob(x.data) })).filter((x) => x.blob)

  for (const photo of photos) {
    properties.push({
      type: 'photo',
      filename: photo.filename,
      filesize: photo.blob.size,
      filetype: 'image/jpeg',
      blob: photo.blob
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
      href="https://en.numista.com"
      rel="noopener noreferrer"
      target="_blank"
    >{{ t('source') }}</a>

    <div
      ref="typesListElement"
      class="overflow-auto"
    >
      <n-table
        v-if="visibleTypes.length > 0"
        striped
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
      >
        <tbody>
          <tr
            v-for="item in visibleTypes"
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
                  :href="`https://en.numista.com/catalogue/pieces${item.id}.html`"
                >
                  {{ item.title }}
                </a>
                <div>
                  {{ item.issuer }}
                </div>
                <div class="italic">
                  {{ [...new Set([item.min_year, item.max_year])].filter(Boolean).join(' - ') }}
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
    searchInfo: Search from Numista
    source: Data provided by Numista
    import: Import
    update: Update
  et:
    search: Otsi
    searchInfo: Otsi Numista-st
    source: "Andmed: Numista"
    import: Impordi
    update: Uuenda
</i18n>
