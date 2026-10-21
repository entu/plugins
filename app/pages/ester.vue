<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const { definitions, entity, error, isAdding, isEdit, sourceProperties, doCancel, doSave, importProperties, init } = useEntityImport()

const queryString = ref('')
const esterItems = ref([])
const isLoading = ref(false)

async function doSearch () {
  if (isLoading.value || !queryString.value) return

  isLoading.value = true

  esterItems.value = []
  esterItems.value = await $fetch('/api/ester', { query: { q: queryString.value } })

  isLoading.value = false
}

async function doImport (item) {
  isAdding.value = true

  const properties = []

  for (const [key, value] of Object.entries(item)) {
    for (const i of value) {
      properties.push({
        type: convertType(key),
        string: i
      })
    }
  }

  await importProperties(properties.filter((x) => x.type && x.string))
}

function convertType (type) {
  switch (type) {
    case 'title':
      return 'name'
    case 'isbn':
      return 'isn'
    case 'issn':
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
      href="https://www.ester.ee"
      rel="noopener noreferrer"
      target="_blank"
    >{{ t('source') }}</a>

    <div class="overflow-auto">
      <n-table
        v-if="esterItems.length > 0"
        striped
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
      >
        <tbody>
          <tr
            v-for="item in esterItems"
            :key="item['ester-id']"
          >
            <td class="flex items-center justify-between gap-2">
              <div>
                <div class="font-bold">
                  {{ item.title?.join(', ') }}
                </div>
                <div class="italic">
                  {{ item.subtitle?.join(', ') }}
                </div>
                <div>
                  {{ item.author?.join(', ') }}
                </div>
                <div>
                  {{ [item?.['publishing-place'] || [], ...item?.['publishing-date'] || []]?.join(' ') }}
                </div>
                <div>
                  {{ item?.['isbn']?.join(', ') }}
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
    searchInfo: Search from ESTER
    source: Data provided by ESTER
    import: Import
    update: Update
  et:
    search: Otsi
    searchInfo: Otsi ESTER-ist
    source: "Andmed: e-kataloog ESTER"
    import: Impordi
    update: Uuenda
  </i18n>
