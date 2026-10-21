// Shared state of the catalog plugin pages: create a new entity from a source record, or compare the record with the open entity and update it.
export function useEntityImport () {
  const { locale } = useI18n()
  const { query } = useRoute()
  const runtimeConfig = useRuntimeConfig()

  const error = ref(null)
  const isAdding = ref(false)
  const entity = ref()
  const definitions = ref([])
  const sourceProperties = ref()

  const isEdit = Boolean(query.entity)

  // Checks the plugin parameters and in edit mode loads the entity; returns its ISBN or barcode to search for, so nothing more identifying is sent to the source unasked.
  async function init () {
    if (!query.account) {
      error.value = 'No account parameter!'
      return
    }

    if (!query.token) {
      error.value = 'No token parameter!'
      return
    }

    if (!isEdit && !query.type) {
      error.value = 'No type parameter!'
      return
    }

    if (isEdit && !isEntityId(query.entity)) {
      error.value = 'Invalid entity parameter!'
      return
    }

    if (!isEdit) return

    isAdding.value = true

    try {
      const params = { apiUrl: runtimeConfig.public.entuApiUrl, account: query.account, token: query.token }

      entity.value = await getEntity({ ...params, entityId: query.entity })
      definitions.value = await getPropertyDefinitions({ ...params, typeId: getValue(entity.value._type, locale.value, 'reference'), locale: locale.value })
    }
    catch {
      error.value = 'Failed to load entity!'
    }

    isAdding.value = false

    return getValueText(['isn', 'barcode'].map((x) => entity.value?.[x]?.at(0)).find(Boolean))
  }

  // Creates the entity from the source properties, or in edit mode opens them for comparison.
  async function importProperties (properties) {
    if (isEdit) {
      sourceProperties.value = properties
      isAdding.value = false
      return
    }

    const newProperties = [{ type: '_type', reference: query.type }]

    if (query.parent) {
      newProperties.push({ type: '_parent', reference: query.parent })
    }

    await doSave({ properties: [...newProperties, ...properties] })
  }

  // Writes the values and deletions, then opens the entity in Entu - in edit mode without #edit, so the page reloads with the new values.
  async function doSave ({ properties, deleteIds }) {
    isAdding.value = true

    try {
      const _id = await saveEntity({
        apiUrl: runtimeConfig.public.entuApiUrl,
        account: query.account,
        token: query.token,
        entityId: query.entity,
        properties,
        deleteIds
      })

      const url = `${runtimeConfig.public.entuUrl}/${encodeURIComponent(query.account)}/${encodeURIComponent(_id)}`

      await navigateTo(isEdit ? url : `${url}#edit`, { external: true, open: { target: '_top' } })
    }
    catch {
      error.value = 'Failed to save entity!'
      isAdding.value = false
    }
  }

  function doCancel () {
    sourceProperties.value = undefined
  }

  return {
    definitions,
    entity,
    error,
    isAdding,
    isEdit,
    sourceProperties,
    doCancel,
    doSave,
    importProperties,
    init
  }
}
