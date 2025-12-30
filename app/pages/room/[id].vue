<script lang="ts" setup>
import Chat from "~/components/Chat.vue";
</script>

<template>
  <NuxtLayout>
    <ClientOnly>
      <Chat />
    </ClientOnly>
  </NuxtLayout>
</template>
