const credentialProperties = ['entu_user', 'entu_api_key', 'entu_passkey']

// Reads an entity with all values the token may see.
export async function getEntity ({ apiUrl, account, token, entityId }) {
  const { entity } = await $fetch(`${apiUrl}/${encodeURIComponent(account)}/entity/${encodeURIComponent(entityId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  return entity
}

// Returns an entity type's property definitions in form order, each marked whether a plugin may write it.
export async function getPropertyDefinitions ({ apiUrl, account, token, typeId, locale }) {
  const { entities } = await $fetch(`${apiUrl}/${encodeURIComponent(account)}/entity`, {
    headers: { Authorization: `Bearer ${token}` },
    query: {
      '_parent.reference': typeId,
      '_type.string': 'property',
      props: 'name,label,type,list,multilingual,readonly,formula,hidden,ordinal'
    }
  })

  return entities.map((x) => ({
    name: getValue(x.name, locale),
    label: getValue(x.label, locale),
    type: getValue(x.type, locale),
    list: Boolean(getValue(x.list, locale, 'boolean')),
    multilingual: Boolean(getValue(x.multilingual, locale, 'boolean')),
    ordinal: getValue(x.ordinal, locale, 'number') || 0,
    isEditable: !getValue(x.readonly, locale, 'boolean') && !getValue(x.hidden, locale, 'boolean') && !x.formula?.length && getValue(x.type, locale) !== 'formula'
  })).filter((x) => x.name).sort((a, b) => a.ordinal - b.ordinal || (a.label || a.name).localeCompare(b.label || b.name))
}

// Returns whether a value is a well-formed entity _id, so it is safe to put in an API path.
export function isEntityId (value) {
  return /^[a-f\d]{24}$/i.test(value || '')
}

// Returns whether a property may be shown and changed by a plugin - never system or credential properties.
export function isPluginProperty (name) {
  return !name.startsWith('_') && !credentialProperties.includes(name)
}

// Creates an entity (no entityId) or adds and replaces values on one, uploads the files of the written values, then deletes deleteIds; returns the entity _id.
export async function saveEntity ({ apiUrl, account, token, entityId, properties = [], deleteIds = [] }) {
  const accountUrl = `${apiUrl}/${encodeURIComponent(account)}`
  const headers = { Authorization: `Bearer ${token}` }

  let _id = entityId

  if (properties.length > 0) {
    const response = await $fetch(entityId ? `${accountUrl}/entity/${encodeURIComponent(entityId)}` : `${accountUrl}/entity`, {
      method: 'POST',
      headers,
      body: properties.map((x) => ({ ...x, blob: undefined }))
    })

    if (!response?._id) {
      throw new Error('No entity _id in response')
    }

    _id = response._id

    for (const property of properties.filter((x) => x.blob)) {
      const upload = response.properties?.find((x) => x.type === property.type && x.filename === property.filename)?.upload
      const isUploaded = await uploadFile(property.blob, upload)

      if (!isUploaded) {
        throw new Error('File upload failed')
      }
    }
  }

  for (const propertyId of deleteIds) {
    await $fetch(`${accountUrl}/property/${encodeURIComponent(propertyId)}`, { method: 'DELETE', headers })
  }

  return _id
}

// Turns a base64 image from a plugin server route into a JPEG blob.
export function getCoverBlob (cover) {
  if (!cover) {
    return null
  }

  const bytes = Uint8Array.from(atob(cover), (c) => c.charCodeAt(0))

  return new Blob([bytes], { type: 'image/jpeg' })
}

// Sends a blob to the signed upload URL the entity POST returned; resolves true on success.
export function uploadFile (blob, upload) {
  return new Promise((resolve) => {
    if (!blob || !upload) {
      return resolve(false)
    }

    const request = new XMLHttpRequest()
    request.open(upload.method, upload.url)

    for (const header in upload.headers) {
      if (header.toLowerCase() === 'content-length') continue

      request.setRequestHeader(header, upload.headers[header])
    }

    request.addEventListener('load', () => resolve(request.status === 200))
    request.addEventListener('error', () => resolve(false))
    request.send(blob)
  })
}

// Returns a property value as text, for showing and comparing values.
export function getValueText (value) {
  if (!value) {
    return ''
  }

  if (value.filename) {
    return value.filename
  }

  if (value.date) {
    return value.date.slice(0, 10)
  }

  return `${value.string ?? value.number ?? value.boolean ?? value.datetime ?? value.reference ?? ''}`
}
