<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const { definitions, entity, error, isAdding, isEdit, sourceProperties, doCancel, doSave, importProperties, init } = useEntityImport()

const queryString = ref('')
const groups = ref([])
const releases = ref([])
const selectedGroup = ref(null)
const isLoading = ref(false)

const groupsListElement = useTemplateRef('groupsListElement')
const releasesListElement = useTemplateRef('releasesListElement')
const groupsVisible = ref(20)
const releasesVisible = ref(20)

const chunkSize = 20

const visibleGroups = computed(() => groups.value.slice(0, groupsVisible.value))

const visibleReleases = computed(() => releases.value.slice(0, releasesVisible.value))

useInfiniteScroll(groupsListElement, () => {
  if (groupsVisible.value < groups.value.length) {
    groupsVisible.value += chunkSize
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

  groups.value = []
  releases.value = []
  selectedGroup.value = null
  groupsVisible.value = chunkSize
  releasesVisible.value = chunkSize
  groups.value = await $fetch('/api/musicbrainz', { query: { q: queryString.value } })

  isLoading.value = false
}

async function doSelectGroup (group) {
  if (isLoading.value) return

  isLoading.value = true

  selectedGroup.value = group
  releases.value = []
  releasesVisible.value = chunkSize
  releases.value = await $fetch('/api/musicbrainz/releases', { query: { id: group.id } })

  isLoading.value = false
}

function doBack () {
  releases.value = []
  selectedGroup.value = null
  releasesVisible.value = chunkSize
}

async function doImport (item) {
  isAdding.value = true

  const { release, cover } = await $fetch('/api/musicbrainz/release', { query: { id: item.id } })

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

function doImageError (item) {
  item.image = null
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
      href="https://musicbrainz.org"
      rel="noopener noreferrer"
      target="_blank"
    >{{ t('source') }}</a>

    <div
      v-if="selectedGroup"
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
                  @error="doImageError(item)"
                >
              </div>

              <div class="grow">
                <a
                  class="font-bold hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                  :href="`https://musicbrainz.org/release/${item.id}`"
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
      ref="groupsListElement"
      class="overflow-auto"
    >
      <n-table
        v-if="visibleGroups.length > 0"
        striped
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
      >
        <tbody>
          <tr
            v-for="item in visibleGroups"
            :key="item.id"
          >
            <td class="flex items-start justify-between gap-4">
              <div class="w-16 shrink-0">
                <img
                  v-if="item.image"
                  class="mx-auto max-h-16 max-w-16"
                  :src="item.image"
                  @error="doImageError(item)"
                >
              </div>

              <div class="grow">
                <a
                  class="font-bold hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                  :href="`https://musicbrainz.org/release-group/${item.id}`"
                >
                  {{ item.title }}
                </a>
                <div>
                  {{ item.artist?.join(', ') }}
                </div>
                <div class="italic">
                  {{ [item.year, item.type].filter(Boolean).join(', ') }}
                </div>
              </div>

              <n-button
                icon-placement="right"
                @click="doSelectGroup(item)"
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
    searchInfo: Search from MusicBrainz
    source: Data provided by MusicBrainz
    releases: Releases
    back: Back
    import: Import
    update: Update
  et:
    search: Otsi
    searchInfo: Otsi MusicBrainz-ist
    source: "Andmed: MusicBrainz"
    releases: Väljaanded
    back: Tagasi
    import: Impordi
    update: Uuenda
</i18n>
