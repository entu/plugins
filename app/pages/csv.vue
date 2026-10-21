<script setup>
import jschardet from 'jschardet'
import { parse } from 'papaparse'
import { NButton, NCheckbox, NForm, NFormItem, NPopconfirm, NRadio, NRadioGroup, NSelect, NSpin, NUpload, NUploadDragger } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const runtimeConfig = useRuntimeConfig()

const error = ref()
const csvContent = ref()
const file = ref()
const encoding = ref('utf-8')
const encodingOptions = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'ascii', label: 'ASCII' },
  { value: 'big5', label: 'Big5' },
  { value: 'euc-jp', label: 'EUC-JP' },
  { value: 'euc-kr', label: 'EUC-KR' },
  { value: 'gb18030', label: 'gb18030' },
  { value: 'gbk', label: 'GBK' },
  { value: 'ibm866', label: 'IBM866' },
  { value: 'iso-2022-jp', label: 'ISO-2022-JP' },
  { value: 'iso-8859-10', label: 'ISO-8859-10' },
  { value: 'iso-8859-13', label: 'ISO-8859-13' },
  { value: 'iso-8859-14', label: 'ISO-8859-14' },
  { value: 'iso-8859-15', label: 'ISO-8859-15' },
  { value: 'iso-8859-16', label: 'ISO-8859-16' },
  { value: 'iso-8859-2', label: 'ISO-8859-2' },
  { value: 'iso-8859-3', label: 'ISO-8859-3' },
  { value: 'iso-8859-4', label: 'ISO-8859-4' },
  { value: 'iso-8859-5', label: 'ISO-8859-5' },
  { value: 'iso-8859-6', label: 'ISO-8859-6' },
  { value: 'iso-8859-7', label: 'ISO-8859-7' },
  { value: 'iso-8859-8', label: 'ISO-8859-8' },
  { value: 'iso-8859-8-I', label: 'ISO-8859-8-I' },
  { value: 'koi8-r', label: 'KOI8-R' },
  { value: 'koi8-u', label: 'KOI8-U' },
  { value: 'macintosh', label: 'macintosh' },
  { value: 'shift_jis', label: 'Shift_JIS' },
  { value: 'utf-16be', label: 'UTF-16BE' },
  { value: 'utf-16le', label: 'UTF-16LE' },
  { value: 'windows-1250', label: 'windows-1250' },
  { value: 'windows-1251', label: 'windows-1251' },
  { value: 'windows-1252', label: 'windows-1252' },
  { value: 'windows-1253', label: 'windows-1253' },
  { value: 'windows-1254', label: 'windows-1254' },
  { value: 'windows-1255', label: 'windows-1255' },
  { value: 'windows-1256', label: 'windows-1256' },
  { value: 'windows-1257', label: 'windows-1257' },
  { value: 'windows-1258', label: 'windows-1258' },
  { value: 'windows-874', label: 'windows-874' },
  { value: 'x-mac-cyrillic', label: 'x-mac-cyrillic' }
]
const propertyOptions = ref([])
const selectedProperties = ref([])
const unmappedProperties = ref('keep')
const importing = ref(false)

const allChecked = computed({
  get: () => {
    return csvContent.value?.every((x) => x.selected)
  },
  set: (value) => {
    for (const x of csvContent.value?.filter((x) => !x.savedId) ?? []) {
      x.selected = value
    }
  }
})

const someChecked = computed(() => csvContent.value?.filter((x) => !x.savedId)?.some((x) => x.selected) && !allChecked.value)

const idIndex = computed(() => selectedProperties.value.indexOf('_id'))

const isUpdateMode = computed(() => idIndex.value > -1)

const isDeleteMode = computed(() => isUpdateMode.value && unmappedProperties.value === 'delete')

const updateCount = computed(() => csvContent.value?.filter((x) => !x.savedId && x.selected && getRowId(x)).length || 0)

watch(file, (value) => {
  if (!value) return

  const reader = new FileReader()

  reader.onload = (e) => {
    const text = new TextDecoder().decode(e.target.result)
    encoding.value = jschardet.detect(text).encoding
  }

  reader.readAsArrayBuffer(value)
})

const checkedCount = computed(() => csvContent.value?.filter((x) => !x.savedId).filter((x) => x.selected)?.length || 0)

const hasPropertyMapping = computed(() => selectedProperties.value.some((x) => x && x !== '_id'))

watch([file, encoding], ([fileValue, encodingValue]) => {
  if (!fileValue) return

  const reader = new FileReader()

  reader.onload = (e) => {
    parse(e.target.result, {
      complete: ({ data }) => {
        parseCsv(data)
      },
      dynamicTyping: true,
      skipEmptyLines: 'greedy'
    })
  }

  reader.readAsText(fileValue, encodingValue)
})

async function getTypes () {
  const { entities } = await $fetch(`${runtimeConfig.public.entuApiUrl}/${encodeURIComponent(query.account)}/entity`, {
    headers: { Authorization: `Bearer ${query.token}` },
    query: {
      '_parent.reference': query.type,
      '_type.string': 'property',
      'formula._id.exists': false,
      'readonly._id.exists': false,
      props: 'name,label,type,ordinal'
    }
  })

  if (!entities.length) {
    console.error('No types')
    return
  }

  propertyOptions.value = [
    { value: '_id', label: '_id', type: '_id' },
    ...entities.map((x) => ({
      value: getValue(x.name, locale.value),
      label: getValue(x.label, locale.value),
      type: getValue(x.type, locale.value),
      ordinal: getValue(x.ordinal, locale.value, 'number')
    })).filter((x) => x.value && isPluginProperty(x.value)).sort((a, b) => a.ordinal - b.ordinal)
  ]
}

function csvUpload (data) {
  file.value = data.file?.file
}

function parseCsv (data) {
  const colsCount = Math.max(...data.map((x) => x.length))
  const dataCols = []

  for (let i = 0; i < colsCount; i++) {
    if (data.map((x) => x[i]).some(Boolean)) {
      dataCols.push(i)
    }
  }

  csvContent.value = data.map((x) => ({
    selected: true,
    data: dataCols.map((i) => x[i])
  }))
}

function convertValue (datatype, value) {
  switch (datatype) {
    case 'boolean':
      return !!value
    case 'date':
      return new Date(value).toISOString()
    case 'datetime':
      return new Date(value).toISOString()
    case 'string':
      return `${value}`
    case 'reference':
      return `${value}`
    default:
      return value
  }
}

// Creates a new entity from every selected row, or with an _id column updates the row's entity; each row gets its own status.
async function doImport () {
  importing.value = true

  const params = { apiUrl: runtimeConfig.public.entuApiUrl, account: query.account, token: query.token }
  const deleteNames = isDeleteMode.value
    ? propertyOptions.value.map((x) => x.value).filter((x) => x !== '_id' && !selectedProperties.value.includes(x))
    : []

  for (const row of csvContent.value) {
    if (row.savedId) continue
    if (!row.selected) continue

    const entityId = getRowId(row)
    const values = getRowValues(row)

    try {
      if (entityId) {
        if (!isEntityId(entityId)) {
          throw new Error('Invalid entity _id')
        }

        const entity = await getEntity({ ...params, entityId })

        if (getValue(entity._type, locale.value, 'reference') !== query.type) {
          throw new Error('Entity is of another type')
        }

        row.savedId = await saveEntity({ ...params, entityId, ...getUpdateChanges(entity, values, deleteNames) })
        row.status = 'updated'
      }
      else {
        const properties = [{ type: '_type', reference: query.type }]

        if (query.parent) {
          properties.push({ type: '_parent', reference: query.parent })
        }

        row.savedId = await saveEntity({ ...params, properties: [...properties, ...values] })
        row.status = 'created'
      }
    }
    catch {
      row.status = 'error'
    }
  }

  importing.value = false
}

function onImportClick () {
  if (isDeleteMode.value) return

  doImport()
}

// Returns the row's entity _id when the _id column is mapped and filled.
function getRowId (row) {
  if (idIndex.value < 0) return

  const value = row.data[idIndex.value]

  if (value === null || value === undefined) return

  return `${value}`.trim() || undefined
}

// Returns the row's mapped cells as property values, skipping empty cells and the _id column.
function getRowValues (row) {
  const values = []

  for (const [i, value] of row.data.entries()) {
    const property = selectedProperties.value[i]

    if (!property || property === '_id') continue

    const datatype = propertyOptions.value.find((x) => x.value === property)?.type

    if (!datatype) continue
    if (value === null || value === undefined || value === '') continue

    values.push({ type: property, [datatype]: convertValue(datatype, value) })
  }

  return values
}

// Replaces the current values of each property the row fills, unchanged values left as they are, and deletes all values of deleteNames.
function getUpdateChanges (entity, values, deleteNames) {
  const properties = []
  const deleteIds = []

  for (const name of new Set(values.map((x) => x.type))) {
    const current = entity[name] || []
    const newValues = values.filter((x) => x.type === name)

    for (const [i, value] of newValues.entries()) {
      const old = current.at(i)

      if (old && getValueText(old) === getValueText(value)) continue

      properties.push(old ? { ...value, _id: old._id } : value)
    }

    deleteIds.push(...current.slice(newValues.length).map((x) => x._id))
  }

  for (const name of deleteNames) {
    deleteIds.push(...(entity[name] || []).map((x) => x._id))
  }

  return { properties, deleteIds }
}

onMounted(() => {
  if (query.locale) {
    locale.value = query.locale
  }

  if (!query.account) {
    error.value = t('errorNoAccount')
    return
  }

  if (!query.type) {
    error.value = t('errorNoType')
  }

  if (!query.token) {
    error.value = t('errorNoToken')
  }

  getTypes()
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
    v-else
    class="flex h-full max-h-full flex-col gap-6 overflow-auto p-6"
  >
    <n-upload
      v-if="!importing"
      accept=".csv"
      :custom-request="csvUpload"
      :show-file-list="false"
    >
      <n-upload-dragger
        class="flex flex-col items-center justify-center gap-2 rounded-none"
        :class="{ 'h-96': !file }"
      >
        {{ t('uploadText') }}

        <div
          v-if="file"
          class="font-bold"
        >
          {{ file.name }}
        </div>
      </n-upload-dragger>
    </n-upload>

    <table
      v-if="csvContent"
      class="w-full"
    >
      <thead v-if="!importing">
        <tr>
          <th
            class="p-3 pb-1 text-center font-normal"
            :colspan="csvContent.at(0).data.length + 1"
          >
            {{ t('fieldInfo') }}
          </th>
        </tr>

        <tr>
          <th class="bg-slate-100 p-3 text-left">
            <n-checkbox
              v-model:checked="allChecked"
              :indeterminate="someChecked"
            />
          </th>
          <th
            v-for="(column, index) in csvContent.at(0).data"
            :key="index"
            class="bg-slate-100 p-3 text-left"
            :title="column"
          >
            <n-select
              v-model:value="selectedProperties[index]"
              class="w-full"
              clearable
              :options="propertyOptions"
            />
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(row, rowIndex) in csvContent"
          :key="rowIndex"
          class="group border-t border-slate-200 hover:bg-slate-50"
          :title="row.status ? t(row.status) : undefined"
        >
          <td class="p-3">
            <n-checkbox
              v-model:checked="row.selected"
              :disabled="!!row.savedId"
            />
          </td>
          <td
            v-for="(column, columnIndex) in row.data"
            :key="columnIndex"
            class="text-sm"
          >
            <nuxt-link
              v-if="row.savedId"
              class="block w-full p-3 text-green-600 dark:text-green-400"
              target="_blank"
              :to="`${runtimeConfig.public.entuUrl}/${encodeURIComponent(query.account)}/${encodeURIComponent(row.savedId)}#edit`"
            >
              {{ column }}
            </nuxt-link>

            <div
              v-else
              class="block w-full p-3"
              :class="{ 'text-red-600 dark:text-red-400': row.status === 'error' }"
            >
              {{ column }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <n-form
      v-if="file && !importing"
      :show-feedback="false"
    >
      <n-form-item :label="t('encoding')">
        <n-select
          v-model:value="encoding"
          filterable
          :options="encodingOptions"
        />
      </n-form-item>

      <n-form-item
        v-if="isUpdateMode"
        class="mt-4"
        :label="t('unmappedProperties')"
      >
        <n-radio-group v-model:value="unmappedProperties">
          <n-radio
            value="keep"
            :label="t('keep')"
          />
          <n-radio
            value="delete"
            :label="t('delete')"
          />
        </n-radio-group>
      </n-form-item>
    </n-form>

    <div class="flex w-full justify-center">
      <n-popconfirm
        v-if="csvContent?.length && !importing"
        :disabled="!isDeleteMode"
        :negative-text="t('cancel')"
        :positive-text="t('import', checkedCount || 0)"
        @positive-click="doImport()"
      >
        <template #trigger>
          <n-button
            class="block"
            type="primary"
            :disabled="checkedCount === 0 || !hasPropertyMapping"
            @click="onImportClick()"
          >
            {{ t('import', checkedCount || 0) }}
          </n-button>
        </template>

        {{ t('confirmDelete', updateCount) }}
      </n-popconfirm>

      <div
        v-else-if="importing"
        class="flex h-full max-h-full items-center justify-center"
      >
        <n-spin show />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
  en:
    errorNoAccount: No account parameter!
    errorNoType: No type parameter!
    errorNoToken: No token parameter!
    uploadText: Click or drag a CSV file to this area to upload.
    encoding: 'Encoding (if you see strange characters in the table, try changing the file encoding):'
    fieldInfo: Choose which rows to import and what column corresponds to which property. Map a column to _id to update existing entities.
    import: Import | Import {n} rows | Import {n} rows
    unmappedProperties: 'Properties not mapped to a column:'
    keep: Keep
    delete: Delete
    cancel: Cancel
    confirmDelete: No entity will be updated. | Values of properties not mapped to a column will be deleted from {n} entity. | Values of properties not mapped to a column will be deleted from {n} entities.
    created: Created
    updated: Updated
    error: Failed
  et:
    errorNoAccount: Puudub parameeter "account"!
    errorNoType: Puudub parameeter "type"!
    errorNoToken: Puudub parameeter "token"!
    uploadText: Lohista CSV fail siia või klõpsa siin, et fail valida.
    encoding: 'Faili kodeering (kui tabeli tekstis on veidrad märgid, proovi muuta faili kodeeringut):'
    fieldInfo: Vali mis read importida ja milline veerg vastab millisele parameetrile. Olemasolevate objektide uuendamiseks seo veerg _id-ga.
    import: Impordi | Impordi {n} rida | Impordi {n} rida
    unmappedProperties: 'Veeruga sidumata parameetrid:'
    keep: Säilita
    delete: Kustuta
    cancel: Loobu
    confirmDelete: Ühtegi objekti ei uuendata. | {n} objektilt kustutatakse veeruga sidumata parameetrite väärtused. | {n} objektilt kustutatakse veeruga sidumata parameetrite väärtused.
    created: Lisatud
    updated: Uuendatud
    error: Ebaõnnestus
</i18n>
