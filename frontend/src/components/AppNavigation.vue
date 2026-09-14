<template>
  <nav class="navigation">
    <RouterLink to="/monety">Monety</RouterLink>
    <RouterLink to="/dodaj">Dodaj monetę</RouterLink>
    <RouterLink to="/archiwum">Archiwum</RouterLink>
    <RouterLink to="/slowniki">Słowniki</RouterLink>
  </nav>
</template>

<style scoped>
.navigation {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;

  display: flex;
  justify-content: center;
  gap: 24px;

  padding: 14px 16px;
  border-top: 1px solid #ccc;
  background: white;
}

.navigation a {
  text-decoration: none;
}

.navigation a.router-link-active {
  font-weight: 700;
}
</style>
