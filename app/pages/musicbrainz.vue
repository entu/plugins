<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const runtimeConfig = useRuntimeConfig()

const error = ref(null)
const queryString = ref('')
const groups = ref([])
const releases = ref([])
const selectedGroup = ref(null)
const isLoading = ref(false)
const isAdding = ref(false)

const groupsListElement = ref(null)
const releasesListElement = ref(null)
const groupsVisible = ref(20)
const releasesVisible = ref(20)

const chunkSize = 20

const visibleGroups = computed(() => groups.value.slice(0, groupsVisible.value))

const visibleReleases = computed(() => releases.value.slice(0, releasesVisible.value))

useInfiniteScroll(groupsListElement, () => {
  if (groupsVisible.value < groups.value.length) groupsVisible.value += chunkSize
}, { distance: 150 })

useInfiniteScroll(releasesListElement, () => {
  if (releasesVisible.value < releases.value.length) releasesVisible.value += chunkSize
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
  if (!query.account) return
  if (!query.type) return
  if (!query.token) return

  isAdding.value = true

  const { release, cover } = await $fetch('/api/musicbrainz/release', { query: { id: item.id } })

  const properties = [
    { type: '_type', reference: query.type }
  ]

  if (query.parent) {
    properties.push({ type: '_parent', reference: query.parent })
  }

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

function doImageError (item) {
  item.image = null
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
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
        :striped="true"
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
                  :src="item.image"
                  class="mx-auto max-h-16 max-w-16"
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
                {{ t('import') }}
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
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
        :striped="true"
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
                  :src="item.image"
                  class="mx-auto max-h-16 max-w-16"
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
  et:
    search: Otsi
    searchInfo: Otsi MusicBrainz-ist
    source: "Andmed: MusicBrainz"
    releases: Väljaanded
    back: Tagasi
    import: Impordi
</i18n>
