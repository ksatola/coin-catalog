import { expect, test } from '@playwright/test'

const dictionaries = {
  countries: [{ id: 1, name: 'Polska' }, { id: 2, name: 'Niemcy' }],
  issuers: [],
  denominations: [{ id: 1, name: '1 zł' }],
  mints: [],
  materials: [],
  states: [],
  eras: [{ id: 1, name: 'III RP' }],
}

const collections = [
  { id: 1, name: 'Kolekcja 1', description: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
  { id: 2, name: 'Kolekcja 2', description: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
]

const categories = [
  { id: 1, name: 'Kategoria 1', description: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
  { id: 2, name: 'Kategoria 2', description: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
]

const coin = {
  id: 1,
  country_id: 1,
  issuer_id: null,
  denomination_id: 1,
  from_year: 2000,
  from_era_id: 1,
  to_year: 2000,
  to_era_id: 1,
  mint_id: null,
  material_id: null,
  state_id: null,
  description: 'Opis monety',
  weight: null,
  diameter: null,
  collection_number: '1',
  has_video: false,
  archived: false,
  collection_id: 1,
}

const movedCoin = { ...coin, id: 2, collection_id: 2 }

const coinImages = [
  { id: 1, coin_id: 1, filename: 'avers.jpg', kind: 'avers', sort_order: 0, file_size_bytes: 1000, created_at: '2026-01-01T00:00:00' },
  { id: 2, coin_id: 1, filename: 'rewers.jpg', kind: 'rewers', sort_order: 0, file_size_bytes: 1000, created_at: '2026-01-01T00:00:00' },
]

const movedCoinImages = coinImages.map((image) => ({ ...image, coin_id: 2 }))

async function mockCoinEditApi(page: Parameters<typeof test>[0]['page']): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() as keyof typeof dictionaries
    await route.fulfill({ json: dictionaries[name] ?? [] })
  })
  await page.route('**/api/categories*', async (route) => await route.fulfill({ json: [] }))
  await page.route('**/api/collections', async (route) => await route.fulfill({ json: collections }))
  await page.route('**/api/coins/1/images', async (route) => await route.fulfill({ json: coinImages }))
  await page.route('**/api/coins/2/images', async (route) => await route.fulfill({ json: movedCoinImages }))
  await page.route('**/api/coins/1', async (route) => await route.fulfill({ json: coin }))
  await page.route('**/api/coins/2', async (route) => await route.fulfill({ json: movedCoin }))
  await page.route('**/api/coins/1/move', async (route) => await route.fulfill({ json: movedCoin }))
}

test('zmiana kolekcji zapisuje się niezależnie od danych monety', async ({ page }) => {
  await mockCoinEditApi(page)
  let coinUpdateCount = 0
  let moveRequestCount = 0
  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'PUT') coinUpdateCount += 1
    await route.fulfill({ json: coin })
  })
  await page.route('**/api/coins/1/move', async (route) => {
    moveRequestCount += 1
    await route.fulfill({ json: movedCoin })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Kolekcja').selectOption('2')
  await page.getByRole('button', { name: 'Zapisz kolekcję' }).click()

  await expect.poll(() => moveRequestCount).toBe(1)
  expect(coinUpdateCount).toBe(0)
  await expect(page.getByLabel('Kolekcja')).toHaveValue('2')
})

test('zapis kolekcji nie ostrzega przy anulowaniu bez zmian danych monety', async ({ page }) => {
  await mockCoinEditApi(page)
  let dialogCount = 0
  page.on('dialog', async (dialog) => {
    dialogCount += 1
    await dialog.dismiss()
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Kolekcja').selectOption('2')
  await page.getByRole('button', { name: 'Zapisz kolekcję' }).click()
  await expect(page.getByLabel('Kolekcja')).toHaveValue('2')
  await page.getByRole('button', { name: 'Anuluj' }).click()

  await expect(page).toHaveURL('/monety/2')
  expect(dialogCount).toBe(0)
})

test('zapis danych monety nie wykonuje move', async ({ page }) => {
  await mockCoinEditApi(page)
  let moveRequestCount = 0
  await page.route('**/api/coins/1/move', async (route) => {
    moveRequestCount += 1
    await route.fulfill({ json: movedCoin })
  })
  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'PUT') await route.fulfill({ json: coin })
    else await route.fulfill({ json: coin })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Opis').fill('Nowy opis')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

  await expect(page).toHaveURL('/monety/1')
  expect(moveRequestCount).toBe(0)
})

test('po przeniesieniu kolekcji zapis danych używa nowego id monety', async ({ page }) => {
  await mockCoinEditApi(page)
  let movedCoinUpdate: Record<string, unknown> | null = null
  await page.route('**/api/coins/1/move', async (route) => await route.fulfill({ json: movedCoin }))
  await page.route('**/api/coins/2', async (route) => {
    if (route.request().method() === 'PUT') {
      movedCoinUpdate = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ json: movedCoin })
      return
    }
    await route.fulfill({ json: movedCoin })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Kolekcja').selectOption('2')
  await page.getByRole('button', { name: 'Zapisz kolekcję' }).click()
  await page.getByLabel('Opis').fill('Nowy opis')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

  await expect(page).toHaveURL('/monety/2')
  expect(movedCoinUpdate).toMatchObject({ country_id: 1, collection_id: 2, description: 'Nowy opis' })
})

test('tworzy kolekcję z edycji monety i zapisuje jej przypisanie', async ({ page }) => {
  await mockCoinEditApi(page)

  let createdCollectionRequest: Record<string, unknown> | null = null
  let moveRequest: Record<string, unknown> | null = null

  await page.route('**/api/collections', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({ json: collections })
      return
    }

    createdCollectionRequest = route.request().postDataJSON() as Record<string, unknown>

    await route.fulfill({
      status: 201,
      json: {
        id: 3,
        name: 'Nowa kolekcja',
        description: 'Nowy opis',
        created_at: '2026-09-18T00:00:00',
        updated_at: '2026-09-18T00:00:00',
      },
    })
  })

  await page.route('**/api/coins/1/move', async (route) => {
    moveRequest = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ json: { ...movedCoin, collection_id: 3 } })
  })

  await page.goto('/monety/1/edytuj')

  await page.getByRole('button', { name: 'Dodaj kolekcję' }).click()
  await page.getByLabel('Nazwa nowej kolekcji').fill('Nowa kolekcja')
  await page.locator('.editor').getByLabel('Opis').fill('Nowy opis')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()

  await expect(page.getByLabel('Kolekcja')).toHaveValue('3')
  expect(createdCollectionRequest).toEqual({
    name: 'Nowa kolekcja',
    description: 'Nowy opis',
  })

  await page.getByRole('button', { name: 'Zapisz kolekcję' }).click()

  await expect.poll(() => moveRequest).toEqual({
    target_collection_id: 3,
  })
  await expect(page.getByLabel('Kolekcja')).toHaveValue('3')
})

test('zapisuje wybraną istniejącą kategorię z edycji monety', async ({ page }) => {
  await mockCoinEditApi(page)

  let assignedCategoryIds: number[] = []
  let attachRequestCount = 0

  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ json: categories })
  })
  await page.route('**/api/coins/1/categories', async (route) => {
    await route.fulfill({
      json: categories.filter((category) => assignedCategoryIds.includes(category.id)),
    })
  })
  await page.route('**/api/coins/1/categories/2', async (route) => {
    if (route.request().method() === 'POST') {
      attachRequestCount += 1
      assignedCategoryIds = [2]
      await route.fulfill({ json: categories[1] })
      return
    }
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Wybierz kategorie').selectOption('2')
  await page.getByRole('button', { name: 'Zapisz kategorię' }).click()

  await expect.poll(() => attachRequestCount).toBe(1)
  await expect(page.getByText('Kategoria 2')).toBeVisible()
})

test('tworzy kategorię z edycji monety i przypisuje ją do monety', async ({ page }) => {
  await mockCoinEditApi(page)

  let createdCategoryRequest: Record<string, unknown> | null = null
  let attachRequestCount = 0
  const createdCategory = {
    id: 3,
    name: 'Nowa kategoria',
    description: 'Nowy opis',
    created_at: '2026-09-18T00:00:00',
    updated_at: '2026-09-18T00:00:00',
  }
  let assignedCategoryIds: number[] = []

  await page.route('**/api/categories', async (route) => {
    if (route.request().method() === 'POST') {
      createdCategoryRequest = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 201, json: createdCategory })
      return
    }

    await route.fulfill({
      json: [...categories, ...(assignedCategoryIds.includes(3) ? [createdCategory] : [])],
    })
  })
  await page.route('**/api/coins/1/categories', async (route) => {
    await route.fulfill({
      json: assignedCategoryIds.map((categoryId) =>
        categoryId === 3 ? createdCategory : categories.find((category) => category.id === categoryId),
      ).filter(Boolean),
    })
  })
  await page.route('**/api/coins/1/categories/3', async (route) => {
    attachRequestCount += 1
    assignedCategoryIds = [3]
    await route.fulfill({ json: createdCategory })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByRole('button', { name: 'Dodaj kategorię' }).click()
  await page.getByLabel('Nazwa nowej kategorii').fill('Nowa kategoria')
  await page.locator('.editor').getByLabel('Opis').fill('Nowy opis')
  await page.locator('.editor').getByRole('button', { name: 'Dodaj', exact: true }).click()

  await expect.poll(() => createdCategoryRequest).toEqual({
    name: 'Nowa kategoria',
    description: 'Nowy opis',
  })
  await expect.poll(() => attachRequestCount).toBe(1)
  await expect(page.getByText('Nowa kategoria')).toBeVisible()
})
