<script setup>
import { NButton, NModal } from 'naive-ui'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

const props = defineProps({
  formats: { type: Array, default: () => ['ean_13'] }
})

const emit = defineEmits(['scan'])

const { t } = useI18n()

const canScan = ref(false)
const isScannerOpen = ref(false)
const scanError = ref(null)
const video = ref(null)
const photoInput = ref(null)

let barcodeDetector = null
let mediaStream = null
let detectTimer = null

async function openScanner () {
  isScannerOpen.value = true
  scanError.value = null

  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill')

  prepareZXingModule({
    overrides: {
      locateFile: (path, prefix) => path.endsWith('.wasm') ? wasmUrl : prefix + path
    }
  })

  barcodeDetector = new BarcodeDetector({ formats: props.formats })

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  }
  catch {
    scanError.value = t('scanCameraError')
    return
  }

  await nextTick()

  // Modal may have been closed while waiting for camera permission
  if (!isScannerOpen.value || !video.value) {
    stopScanner()
    return
  }

  video.value.srcObject = mediaStream
  detectTimer = setInterval(detectFromVideo, 150)
}

async function detectFromVideo () {
  if (!video.value || video.value.readyState < 2) return

  let barcodes

  // Ignore transient detect failures and retry on the next tick
  try {
    barcodes = await barcodeDetector.detect(video.value)
  }
  catch {
    return
  }

  if (barcodes.length === 0) return

  useScanResult(barcodes.at(0).rawValue)
}

async function detectFromPhoto (event) {
  const file = event.target.files?.at(0)
  event.target.value = ''

  if (!file || !barcodeDetector) return

  scanError.value = null

  let barcodes

  try {
    const bitmap = await createImageBitmap(file)
    barcodes = await barcodeDetector.detect(bitmap)
  }
  catch {
    scanError.value = t('scanPhotoError')
    return
  }

  if (barcodes.length === 0) {
    scanError.value = t('scanNotFound')
    return
  }

  useScanResult(barcodes.at(0).rawValue)
}

function useScanResult (value) {
  isScannerOpen.value = false
  emit('scan', value)
}

function openPhotoInput () {
  photoInput.value.click()
}

function stopScanner () {
  clearInterval(detectTimer)
  detectTimer = null

  mediaStream?.getTracks().forEach((x) => x.stop())
  mediaStream = null
}

watch(isScannerOpen, (value) => {
  if (!value) stopScanner()
})

onMounted(() => {
  canScan.value = Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia)
})

onBeforeUnmount(() => {
  stopScanner()
})
</script>

<template>
  <n-button
    v-if="canScan"
    ghost
    type="primary"
    :title="t('scanBarcode')"
    @click="openScanner()"
  >
    <template #icon>
      <my-icon icon="camera" />
    </template>
  </n-button>

  <n-modal
    v-model:show="isScannerOpen"
    preset="card"
    class="max-w-96"
    :title="t('scanBarcode')"
  >
    <div class="flex flex-col gap-4">
      <div
        v-show="!scanError"
        class="text-center text-sm text-gray-500"
      >
        {{ t('scanInfo') }}
      </div>

      <video
        v-show="!scanError"
        ref="video"
        autoplay
        muted
        playsinline
        class="w-full rounded"
      />

      <div
        v-if="scanError"
        class="text-red-700"
      >
        {{ scanError }}
      </div>

      <n-button @click="openPhotoInput()">
        {{ t('scanPhoto') }}
      </n-button>

      <input
        ref="photoInput"
        accept="image/*"
        capture="environment"
        class="hidden"
        type="file"
        @change="detectFromPhoto"
      >
    </div>
  </n-modal>
</template>

<i18n lang="yaml">
  en:
    scanBarcode: Scan barcode
    scanInfo: Point the camera at the barcode. If it is not detected, take a photo of it with the button below.
    scanPhoto: Take a photo of the barcode
    scanCameraError: Camera is not available. Take a photo instead.
    scanNotFound: No barcode found
    scanPhotoError: Could not read the photo
  et:
    scanBarcode: Skaneeri vöötkood
    scanInfo: Suuna kaamera vöötkoodile. Kui seda ei tuvastata, pildista vöötkoodi allpool oleva nupuga.
    scanPhoto: Pildista vöötkoodi
    scanCameraError: Kaamera pole saadaval. Pildista vöötkoodi.
    scanNotFound: Vöötkoodi ei leitud
    scanPhotoError: Fotot ei õnnestunud lugeda
  </i18n>
