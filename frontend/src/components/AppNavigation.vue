<template>
  <nav class="navigation" aria-label="Główna nawigacja">
    <div class="navigation-inner">
      <a
        class="brand"
        href="https://github.com/ksatola/coin-catalog"
        target="_blank"
        rel="noreferrer"
      >
        <span class="brand-mark">CC</span>
        <span class="brand-name">Coin Catalog</span>
      </a>

      <div class="navigation-links">
        <RouterLink to="/monety">Monety</RouterLink>
        <RouterLink class="primary-link" to="/dodaj">+ Dodaj monetę</RouterLink>
        <RouterLink to="/archiwum">Archiwum</RouterLink>
        <RouterLink to="/slowniki">Słowniki</RouterLink>
        <RouterLink to="/kategorie">Kategorie</RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navigation {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;

  border-top: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(10px);
}

.navigation-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;

  width: min(1200px, 100%);
  min-height: 64px;
  margin: 0 auto;
  padding: 8px 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;

  color: #0f172a;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;

  border-radius: 8px;
  background: #0f172a;
  color: #ffffff;
  font-size: 12px;
  letter-spacing: 0.04em;
}

.navigation-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navigation-links a {
  padding: 9px 12px;
  border-radius: 7px;

  color: #475569;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.navigation-links a:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.navigation-links a.router-link-active {
  background: #e2e8f0;
  color: #0f172a;
  font-weight: 700;
}

.navigation-links a.primary-link {
  margin-right: 4px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 700;
}

.navigation-links a.primary-link:hover,
.navigation-links a.primary-link.router-link-active {
  background: #1d4ed8;
  color: #ffffff;
}

@media (max-width: 760px) {
  .navigation-inner {
    justify-content: center;
    padding: 8px 12px;
  }

  .brand {
    display: none;
  }

  .navigation-links {
    width: 100%;
    justify-content: space-between;
    gap: 2px;
  }

  .navigation-links a {
    flex: 1;
    padding: 9px 6px;
    text-align: center;
    font-size: 12px;
  }

  .navigation-links a.primary-link {
    margin-right: 0;
  }
}
</style>
