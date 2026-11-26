import { expect, test, type Page } from '@playwright/test'

const coin = {
  id: 1,
  collection_id: 1,
  country_id: 1,
  issuer_id: null,
  denomination_id: 1,
  from_year: 1900,
  from_era_id: 1,
  to_year: 1900,
  to_era_id: 1,
  mint_id: null,
  material_id: null,
  state_id: null,
  description: 'Moneta testowa',
  weight: null,
  diameter: null,
  collection_number: null,
  has_video: false,
  source: null,
  is_deleted: false,
  avers_description: null,
  revers_description: null,
  literature: null,
  acquisition_method_id: null,
  acquisition_method_text: null,
  purchase_price: null,
  purchase_date: null,
  images: [],
}

const dictionaries = {
  countries: [{ id: 1, name: 'Polska' }],
  issuers: [{ id: 1, name: 'Emitent testowy' }],
  denominations: [{ id: 1, name: 'Grosz' }],
  mints: [{ id: 1, name: 'Warszawa' }],
  materials: [{ id: 1, name: 'Srebro' }],
  states: [{ id: 1, name: 'Bardzo dobry' }],
  eras: [{ id: 1, name: 'n.e.' }],
}

async function setupIsolatedCatalog(page: Page): Promise<URL[]> {
  const coinRequests: URL[] = []

  // Playwright creates a fresh browser context per test, isolating tab and local storage.

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []),
    })
  })

  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.route('**/api/collections', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Kolekcja testowa' }]),
    })
  })

  await page.route('**/api/coins?*', async (route) => {
    coinRequests.push(new URL(route.request().url()))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [coin], next_cursor: null, has_more: false }),
    })
  })

  return coinRequests
}

async function openFilters(page: Page): Promise<void> {
  await page.goto('/monety')
  await expect(page.getByRole('link', { name: 'Moneta #1', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '⚙ Filtry' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test('oba paski akcji zawierają ten sam zestaw czterech przycisków w jednym rzędzie', async ({ page }) => {
  await setupIsolatedCatalog(page)
  await openFilters(page)

  const actionBars = page.locator('.coin-filters .filter-actions')
  await expect(actionBars).toHaveCount(2)

  for (const actionBar of await actionBars.all()) {
    await expect(actionBar.getByRole('button')).toHaveText([
      'Szukaj / filtruj',
      'Wyczyść filtry',
      'Wyczyść sortowanie',
      'Zwiń',
    ])
    await expect(actionBar).toHaveCSS('flex-wrap', 'nowrap')

    const buttons = await actionBar.getByRole('button').all()
    const boxes = await Promise.all(buttons.map((button) => button.boundingBox()))
    expect(boxes.every((box): box is NonNullable<typeof box> => box !== null)).toBe(true)
    expect(new Set(boxes.map((box) => box.y)).size).toBe(1)
  }
})

test('górny przycisk Szukaj / filtruj zatwierdza filtry i zamyka okno', async ({ page }) => {
  const requests = await setupIsolatedCatalog(page)
  await openFilters(page)
  await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('srebrna moneta')
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).first().click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(() => requests.at(-1)?.searchParams.get('search')).toBe('srebrna moneta')
})

test('dolny przycisk Szukaj / filtruj respektuje walidację formularza', async ({ page }) => {
  const requests = await setupIsolatedCatalog(page)
  await openFilters(page)
  const initialRequestCount = requests.length

  await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('ab')
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).last().click()

  await expect(page.getByText('Każdy fragment wyszukiwania musi mieć co najmniej 3 znaki.')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(requests).toHaveLength(initialRequestCount)
})

test('Wyczyść sortowanie ustawia ID ASC, wysyła request i zachowuje pozostałe filtry', async ({ page }) => {
  const requests = await setupIsolatedCatalog(page)
  await openFilters(page)

  await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('srebrna moneta')
  await page.getByRole('combobox', { name: 'Kryterium sortowania 1' }).selectOption('country')
  await page.getByRole('button', { name: '+ Dodaj kryterium' }).click()
  await page.getByRole('combobox', { name: 'Kryterium sortowania 2' }).selectOption('from_year')
  await page.getByRole('button', { name: 'Wyczyść sortowanie' }).first().click()

  await expect.poll(() => requests.at(-1)?.searchParams.getAll('sort_by')).toEqual(['id'])
  expect(requests.at(-1)?.searchParams.getAll('sort_order')).toEqual(['asc'])
  expect(requests.at(-1)?.searchParams.get('search')).toBe('srebrna moneta')
  await expect(page.getByRole('combobox', { name: 'Kryterium sortowania 1' })).toHaveValue('id')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('Wyczyść filtry usuwa kryteria filtrów, zachowuje sortowanie i zamyka okno', async ({ page }) => {
  const requests = await setupIsolatedCatalog(page)
  await openFilters(page)

  await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('srebrna moneta')
  await page.getByRole('combobox', { name: 'Kryterium sortowania 1' }).selectOption('country')
  await page.getByRole('button', { name: 'Wyczyść filtry' }).last().click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(() => requests.at(-1)?.searchParams.get('search')).toBeNull()
  expect(requests.at(-1)?.searchParams.getAll('sort_by')).toEqual(['country'])
  expect(requests.at(-1)?.searchParams.getAll('sort_order')).toEqual(['asc'])
})

test('Zwiń zamyka okno zarówno z górnego, jak i dolnego paska', async ({ page }) => {
  await setupIsolatedCatalog(page)
  await openFilters(page)
  await page.getByRole('button', { name: 'Zwiń' }).first().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await openFilters(page)
  await page.getByRole('button', { name: 'Zwiń' }).last().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('zastosowane filtry są odtwarzane po odświeżeniu karty', async ({ page }) => {
  await setupIsolatedCatalog(page)
  await openFilters(page)

  await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('srebrna moneta')
  await page.getByRole('combobox', { name: 'Kryterium sortowania 1' }).selectOption('country')
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).first().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.reload()
  await page.getByRole('button', { name: '⚙ Filtry' }).click()
  await expect(page.getByRole('searchbox', { name: 'Szukaj', exact: true })).toHaveValue('srebrna moneta')
  await expect(page.getByRole('combobox', { name: 'Kryterium sortowania 1' })).toHaveValue('country')
})

test('podsumowanie pokazuje aktywne filtry i priorytety sortowania', async ({ page }) => {
  await setupIsolatedCatalog(page)
  await openFilters(page)

  await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('srebrna moneta')
  await page.getByRole('combobox', { name: 'Kraj' }).selectOption(['1'])
  await page.getByRole('combobox', { name: 'Kryterium sortowania 1' }).selectOption('country')
  await page.getByRole('button', { name: '+ Dodaj kryterium' }).click()
  await page.getByRole('combobox', { name: 'Kryterium sortowania 2' }).selectOption('from_year')
  await page.getByRole('combobox', { name: 'Kierunek sortowania 2' }).selectOption('desc')
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).first().click()

  const summary = page.getByLabel('Aktywne kryteria')
  await expect(summary).toContainText('Szukaj: "srebrna moneta"')
  await expect(summary).toContainText('Kraj: Polska')
  await expect(summary).toContainText('1. Kraj ↑')
  await expect(summary).toContainText('2. Rok od ↓')
})
