<script setup lang="ts">
import AppNavigation from './components/AppNavigation.vue'
</script>

<template>
  <div class="app">
    <main class="app-content">
      <RouterView :key="$route.fullPath" />
    </main>

    <AppNavigation />
  </div>
</template>

<style>
html,
body,
#app {
  min-height: 100%;
  margin: 0;
}

body {
  padding-bottom: 72px;
}

* {
  box-sizing: border-box;
}
</style>
