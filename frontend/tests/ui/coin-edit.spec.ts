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
  source: null,
  archived: false,
  collection_id: 1,
}

const movedCoin = { ...coin, id: 2, collection_id: 2 }

async function mockCoinEditApi(page: Parameters<typeof test>[0]['page']): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() as keyof typeof dictionaries
    await route.fulfill({ json: dictionaries[name] ?? [] })
  })
  await page.route('**/api/categories*', async (route) => await route.fulfill({ json: [] }))
  await page.route('**/api/collections', async (route) => await route.fulfill({ json: collections }))
  await page.route('**/api/coins/1/images', async (route) => await route.fulfill({ json: [] }))
  await page.route('**/api/coins/2/images', async (route) => await route.fulfill({ json: [] }))
  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ json: coin })
    else await route.fulfill({ json: coin })
  })
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
