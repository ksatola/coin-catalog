import { expect, test, type Page } from '@playwright/test'

const dictionaries = {
  countries: [
    { id: 1, name: 'Polska' },
    { id: 2, name: 'Niemcy' },
  ],
  issuers: [],
  denominations: [
    { id: 2, name: '1 grosz' },
    { id: 3, name: '2 grosze' },
  ],
  mints: [],
  materials: [],
  states: [],
  eras: [{ id: 3, name: 'AD' }],
}

const categories = [
  { id: 10, name: 'Monety', description: null, parent_ids: [], child_ids: [], created_at: '', updated_at: '' },
  { id: 11, name: 'Polska', description: null, parent_ids: [], child_ids: [], created_at: '', updated_at: '' },
]

const collections = [
  { id: 1, name: 'Główna kolekcja', description: null, coin_count: 1, archived_coin_count: 0, image_count: 2, file_size_bytes: 100, category_count: 1, coins_without_images_count: 0, last_modified_at: '2026-09-17T05:00:00Z', created_at: '', updated_at: '' },
  { id: 2, name: 'Monety polskie', description: null, coin_count: 0, archived_coin_count: 0, image_count: 0, file_size_bytes: 0, category_count: 0, coins_without_images_count: 0, last_modified_at: '2026-09-17T05:00:00Z', created_at: '', updated_at: '' },
]

const assignedCategories = [categories[1]]

const coin = {
  id: 1,
  collection_id: 1,
  country_id: 1,
  issuer_id: null,
  denomination_id: 2,
  from_year: 1900,
  from_era_id: 3,
  to_year: 1901,
  to_era_id: 3,
  mint_id: null,
  material_id: null,
  state_id: null,
  collection_number: null,
  description: 'Polski grosz',
  weight: null,
  diameter: null,
  has_video: false,
  source: null,
  is_deleted: false,
}

const images = [
  { id: 101, coin_id: 1, filename: 'coin-1-avers.jpg', kind: 'avers', sort_order: 0, file_size_bytes: 50, created_at: '' },
  { id: 102, coin_id: 1, filename: 'coin-1-rewers.jpg', kind: 'rewers', sort_order: 1, file_size_bytes: 50, created_at: '' },
]

async function mockEditApis(page: Page): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []),
    })
  })
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) })
  })
  await page.route('**/api/collections', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collections) })
      return
    }
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(collections[1]) })
  })
  await page.route('**/api/collections/*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collections[0]) })
  })
  await page.route('**/api/coins/1/images', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(images) })
  })
  await page.route('**/api/coins/1/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(assignedCategories) })
  })
  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coin) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coin) })
  })
  await page.route('**/api/coins/2', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...coin, id: 2, collection_id: 2 }),
    })
  })
  await page.route('**/api/coins/1/move', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...coin, id: 2, collection_id: 2 }) })
  })
  await page.route('**/api/collections/1', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collections[0]) })
  })
}

test('Edytuj monetę: dropdowny działają od razu po wejściu bez dodawania zdjęcia', async ({ page }) => {
  await mockEditApis(page)
  await page.goto('/monety/1/edytuj')
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()

  const country = page.getByLabel('Kraj', { exact: true })
  const denomination = page.getByLabel('Nominał', { exact: true })
  const collection = page.getByLabel('Wybierz kolekcję')

  await expect(country.locator('option')).toHaveCount(3)
  await expect(denomination.locator('option')).toHaveCount(3)
  await expect(collection).toHaveValue('1')
  await country.selectOption('2')
  await denomination.selectOption('3')

  await expect(country).toHaveValue('2')
  await expect(denomination).toHaveValue('3')
})

test('Widok monety: pokazuje kategorię i przypisaną kolekcję bez możliwości zmiany', async ({ page }) => {
  await mockEditApis(page)
  await page.goto('/monety/1')
  await expect(page.getByRole('heading', { name: 'Szczegóły monety #1' })).toBeVisible()

  const categoriesSection = page.locator('.coin-categories')
  await expect(categoriesSection.getByRole('heading', { name: 'Kategorie' })).toBeVisible()
  await expect(categoriesSection.getByText('Polska', { exact: true })).toBeVisible()
  await expect(categoriesSection.locator('select')).toHaveCount(0)
  await expect(categoriesSection.getByRole('button')).toHaveCount(0)
  await expect(page.getByText('Główna kolekcja', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Główna kolekcja' })).toHaveAttribute('href', '/kolekcje/1')
  await expect(page.getByRole('button', { name: 'Edytuj' })).toBeVisible()
})

test('Edytuj monetę: udostępnia zarządzanie kategoriami i kolekcją', async ({ page }) => {
  await mockEditApis(page)
  await page.goto('/monety/1/edytuj')
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Kategorie' })).toBeVisible()
  await expect(page.getByLabel('Wybierz kategorie')).toBeVisible()
  await expect(page.getByLabel('Wybierz kolekcję')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dodaj kategorie' })).toBeDisabled()
  await expect(page.locator('.category-list li').filter({ hasText: 'Polska' })).toBeVisible()
})

test('Edytuj monetę: zapis kolekcji jest niezależny od zapisu danych monety', async ({ page }) => {
  await mockEditApis(page)
  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Wybierz kolekcję').selectOption('2')
  await page.getByLabel('Kraj', { exact: true }).selectOption('2')

  const moveRequest = page.waitForRequest('**/api/coins/1/move')
  const putRequest = page.waitForRequest('**/api/coins/1', { predicate: (request) => request.method() === 'PUT' })
  await page.getByRole('button', { name: 'Zapisz kolekcję' }).click()
  const request = await moveRequest
  expect(request.postDataJSON()).toEqual({ target_collection_id: 2 })
  await expect(page.getByRole('button', { name: 'Zapisz kolekcję' })).toBeDisabled()
  await expect.poll(async () => page.locator('[data-testid="unused"]').count()).toBe(0)
  await expect(putRequest).not.toBeTruthy()
})

test('Edytuj monetę: zapis danych monety nie uruchamia operacji move', async ({ page }) => {
  await mockEditApis(page)
  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Kraj', { exact: true }).selectOption('2')
  await page.getByLabel('Nominał', { exact: true }).selectOption('3')

  const putRequest = page.waitForRequest('**/api/coins/1', { predicate: (request) => request.method() === 'PUT' })
  const moveRequests: Promise<unknown>[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/coins/1/move')) moveRequests.push(Promise.resolve(request))
  })
  await page.getByRole('button', { name: 'Zapisz' }).click()
  const request = await putRequest
  expect(request.postDataJSON()).toMatchObject({ country_id: 2, denomination_id: 3, collection_id: 1 })
  expect(moveRequests).toHaveLength(0)
})

test('Edytuj monetę: po osobnym zapisie kolekcji dane monety zapisują się pod nowym ID', async ({ page }) => {
  await mockEditApis(page)
  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Wybierz kolekcję').selectOption('2')
  await page.getByLabel('Kraj', { exact: true }).selectOption('2')

  await page.getByRole('button', { name: 'Zapisz kolekcję' }).click()
  await expect(page.getByRole('button', { name: 'Zapisz kolekcję' })).toBeDisabled()

  const putRequest = page.waitForRequest('**/api/coins/2', { predicate: (request) => request.method() === 'PUT' })
  await page.getByRole('button', { name: 'Zapisz' }).click()
  const request = await putRequest
  expect(request.postDataJSON()).toMatchObject({ country_id: 2, collection_id: 2 })
})
