<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const { definitions, entity, error, isAdding, isEdit, sourceProperties, doCancel, doSave, importProperties, init } = useEntityImport()

const queryString = ref('')
const masters = ref([])
const releases = ref([])
const selectedMaster = ref(null)
const isLoading = ref(false)

const mastersListElement = useTemplateRef('mastersListElement')
const releasesListElement = useTemplateRef('releasesListElement')
const mastersVisible = ref(20)
const releasesVisible = ref(20)

const chunkSize = 20

const visibleMasters = computed(() => masters.value.slice(0, mastersVisible.value))

const visibleReleases = computed(() => releases.value.slice(0, releasesVisible.value))

useInfiniteScroll(mastersListElement, () => {
  if (mastersVisible.value < masters.value.length) {
    mastersVisible.value += chunkSize
  }
}, { distance: 150 })

useInfiniteScroll(releasesListElement, () => {
  if (releasesVisible.value < releases.value.length) {
    releasesVisible.value += chunkSize
  }
}, { distance: 150 })

async function doSearch () {
  if (isLoading.value || !queryString.value) return

  isLoading.value = true

  masters.value = []
  releases.value = []
  selectedMaster.value = null
  mastersVisible.value = chunkSize
  releasesVisible.value = chunkSize
  masters.value = await $fetch('/api/discogs', { query: { q: queryString.value } })

  isLoading.value = false
}

async function doSelectMaster (master) {
  if (isLoading.value) return

  isLoading.value = true

  selectedMaster.value = master
  releases.value = []
  releasesVisible.value = chunkSize
  releases.value = await $fetch('/api/discogs/versions', { query: { id: master.id } })

  isLoading.value = false
}

function doBack () {
  releases.value = []
  selectedMaster.value = null
  releasesVisible.value = chunkSize
}

async function doImport (item) {
  isAdding.value = true

  const { release, cover } = await $fetch('/api/discogs/release', { query: { id: item.id } })

  const properties = []

  for (const [key, value] of Object.entries(release)) {
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
      href="https://www.discogs.com"
      rel="noopener noreferrer"
      target="_blank"
    >{{ t('source') }}</a>

    <div
      v-if="selectedMaster"
      ref="releasesListElement"
      class="overflow-auto"
    >
      <div class="mx-3 mb-4 flex items-center justify-between gap-4">
        <n-button @click="doBack()">
          <template #icon>
            <my-icon icon="chevron-left" />
          </template>

          {{ t('back') }}
        </n-button>
      </div>

      <n-table
        v-if="visibleReleases.length > 0"
        striped
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
      >
        <tbody>
          <tr
            v-for="item in visibleReleases"
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
                  :href="`https://www.discogs.com/release/${item.id}`"
                >
                  {{ item.title }}
                </a>
                <div>
                  {{ item.format?.join(', ') }}
                </div>
                <div class="italic">
                  {{ [item.year, item.country].filter(Boolean).join(', ') }}
                </div>
                <div>
                  {{ item.label?.join(', ') }}
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
      ref="mastersListElement"
      class="overflow-auto"
    >
      <n-table
        v-if="visibleMasters.length > 0"
        striped
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
      >
        <tbody>
          <tr
            v-for="item in visibleMasters"
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
                  :href="`https://www.discogs.com/master/${item.id}`"
                >
                  {{ item.title }}
                </a>
                <div class="italic">
                  {{ item.year }}
                </div>
                <div>
                  {{ item.label?.join(', ') }}
                </div>
              </div>

              <n-button
                icon-placement="right"
                @click="doSelectMaster(item)"
              >
                <template #icon>
                  <my-icon icon="chevron-right" />
                </template>

                {{ t('releases') }}
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
    searchInfo: Search from Discogs
    source: Data provided by Discogs
    releases: Releases
    back: Back
    import: Import
    update: Update
  et:
    search: Otsi
    searchInfo: Otsi Discogs-ist
    source: "Andmed: Discogs"
    releases: Väljaanded
    back: Tagasi
    import: Impordi
    update: Uuenda
</i18n>
