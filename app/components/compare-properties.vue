<script setup>
import { NButton, NRadioButton, NRadioGroup, NTable } from 'naive-ui'

const props = defineProps({
  definitions: { type: Array, default: () => [] },
  entity: { type: Object, required: true },
  sourceProperties: { type: Array, required: true }
})

const emit = defineEmits(['cancel', 'save'])

const { locale, t } = useI18n()

const rows = ref([])

const changes = computed(() => {
  const result = { properties: [], deleteIds: [], added: 0, overwritten: 0, deleted: 0 }

  for (const row of rows.value.flatMap((x) => x.values)) {
    if (row.choice === 'add') {
      result.properties.push(row.source)
      result.added++
    }
    else if (row.choice === 'overwrite') {
      result.properties.push({ ...row.source, _id: row.current._id })
      result.overwritten++
    }
    else if (row.choice === 'delete') {
      result.deleteIds.push(row.current._id)
      result.deleted++
    }
  }

  return result
})

const hasChanges = computed(() => changes.value.properties.length > 0 || changes.value.deleteIds.length > 0)

watch(() => [props.entity, props.sourceProperties], buildRows, { immediate: true })

// Lists every property with a value on either side: the entity type's own properties in form order, then the rest by name.
function buildRows () {
  const definedNames = props.definitions.map((x) => x.name)
  const otherNames = [...new Set([
    ...Object.keys(props.entity),
    ...props.sourceProperties.map((x) => x.type)
  ])].filter((x) => !definedNames.includes(x) && isPluginProperty(x)).sort()

  const result = []

  for (const name of [...definedNames, ...otherNames]) {
    const definition = props.definitions.find((x) => x.name === name)

    if (definition && !definition.isEditable) continue
    if (!isPluginProperty(name)) continue

    const current = props.entity[name] || []
    const source = props.sourceProperties.filter((x) => x.type === name).map((x) => definition?.multilingual ? { ...x, language: locale.value } : x)

    if (current.length === 0 && source.length === 0) continue

    result.push({
      name,
      label: definition?.label || name,
      isFirstOther: !definition && !result.some((x) => !x.isDefined),
      isDefined: Boolean(definition),
      values: getValueRows(definition || { list: true }, current, source)
    })
  }

  rows.value = result
}

// Pairs a single current value with a single source value in the same language; otherwise lists all current and source values one by one.
function getValueRows (definition, current, source) {
  const isPair = !definition?.list && current.length === 1 && source.length === 1 && (current.at(0).language || '') === (source.at(0).language || '')

  if (isPair) {
    const isSame = getValueText(current.at(0)) === getValueText(source.at(0))

    return [{ current: current.at(0), source: source.at(0), isSame, choice: isSame ? 'keep' : 'overwrite' }]
  }

  const currentTexts = current.map(getValueText)

  return [
    ...current.map((x) => ({ current: x, choice: 'keep' })),
    ...source.map((x) => {
      const isSame = currentTexts.includes(getValueText(x))

      return { source: x, isSame, choice: isSame ? 'skip' : 'add' }
    })
  ]
}

// Current values change only under an editable definition the user can read, so a hidden readonly or formula property is never overwritten or deleted.
function getOptions (row, property) {
  if (row.current && !property.isDefined) {
    return ['keep']
  }

  if (row.current && row.source) {
    return ['keep', 'overwrite']
  }

  if (row.current) {
    return ['keep', 'delete']
  }

  return ['add', 'skip']
}

function doSave () {
  emit('save', { properties: changes.value.properties, deleteIds: changes.value.deleteIds })
}
</script>

<template>
  <div class="flex h-full max-h-full flex-col gap-4 pt-6">
    <div class="grow overflow-auto">
      <n-table
        size="small"
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
      >
        <thead>
          <tr>
            <th>{{ t('property') }}</th>
            <th>{{ t('current') }}</th>
            <th>{{ t('source') }}</th>
            <th />
          </tr>
        </thead>

        <tbody>
          <template
            v-for="property in rows"
            :key="property.name"
          >
            <tr v-if="property.isFirstOther">
              <td
                class="font-bold text-slate-600 dark:text-slate-300"
                colspan="4"
              >
                {{ t('otherProperties') }}
              </td>
            </tr>

            <tr
              v-for="(row, index) in property.values"
              :key="index"
              :class="{ 'opacity-50': row.isSame }"
            >
              <td
                v-if="index === 0"
                class="align-top font-bold"
                :rowspan="property.values.length"
              >
                {{ property.label }}
              </td>

              <td
                class="max-w-60 align-top wrap-break-word"
                :class="{ 'line-through': ['delete', 'overwrite'].includes(row.choice) }"
                :title="getValueText(row.current)"
              >
                <div class="line-clamp-3">
                  {{ getValueText(row.current) }}
                </div>
              </td>

              <td
                class="max-w-60 align-top wrap-break-word"
                :class="{ 'line-through': row.choice === 'skip' && !row.isSame }"
                :title="getValueText(row.source)"
              >
                <div class="line-clamp-3">
                  {{ getValueText(row.source) }}
                </div>
              </td>

              <td class="text-right align-top">
                <span
                  v-if="row.isSame"
                  class="text-sm"
                >
                  {{ t('same') }}
                </span>

                <n-radio-group
                  v-else
                  v-model:value="row.choice"
                  size="small"
                >
                  <n-radio-button
                    v-for="option in getOptions(row, property)"
                    :key="option"
                    :label="t(option)"
                    :value="option"
                  />
                </n-radio-group>
              </td>
            </tr>
          </template>
        </tbody>
      </n-table>
    </div>

    <div class="mx-3 mb-4 flex items-center justify-between gap-4">
      <n-button @click="emit('cancel')">
        <template #icon>
          <my-icon icon="chevron-left" />
        </template>

        {{ t('back') }}
      </n-button>

      <span class="text-sm text-slate-600 dark:text-slate-300">
        {{ t('summary', { added: changes.added, overwritten: changes.overwritten, deleted: changes.deleted }) }}
      </span>

      <n-button
        type="primary"
        :disabled="!hasChanges"
        @click="doSave()"
      >
        {{ t('save') }}
      </n-button>
    </div>
  </div>
</template>

<i18n lang="yaml">
  en:
    property: Property
    current: Current
    source: From source
    otherProperties: Not in entity type
    same: Same
    keep: Keep
    overwrite: Overwrite
    delete: Delete
    add: Add
    skip: Skip
    back: Back
    save: Save
    summary: "Add {added}, overwrite {overwritten}, delete {deleted}"
  et:
    property: Parameeter
    current: Praegune
    source: Allikast
    otherProperties: Objektitüübis puuduvad
    same: Sama
    keep: Säilita
    overwrite: Asenda
    delete: Kustuta
    add: Lisa
    skip: Jäta vahele
    back: Tagasi
    save: Salvesta
    summary: "Lisatakse {added}, asendatakse {overwritten}, kustutatakse {deleted}"
</i18n>
