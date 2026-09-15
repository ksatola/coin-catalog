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
:root {
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  color: #1f2937;
  background: #f5f7fa;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

html,
body,
#app {
  min-height: 100%;
  margin: 0;
}

body {
  min-width: 320px;
  padding-bottom: 72px;
  background: #f5f7fa;
}

* {
  box-sizing: border-box;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

input,
select,
textarea {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: inherit;
}

input:focus,
select:focus,
textarea:focus,
button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.app {
  min-height: 100vh;
}

.app-content {
  width: min(1200px, 100%);
  margin: 0 auto;
  padding: 24px 20px;
}
</style>
