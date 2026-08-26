<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
defineProps({
  set: { type: String, default: 'local' },
  icon: { type: String, required: true }
})
</script>

<template>
  <Icon
    filled
    :name="`${set}:${icon}`"
  />
</template>

<style>
@reference "tailwindcss";

.nuxt-icon svg {
  @apply m-0;
}
</style>
