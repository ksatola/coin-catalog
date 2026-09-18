import { expect, test, type Page } from '@playwright/test'

const dictionaries = {
  countries: [{ id: 1, name: 'Polska' }],
  issuers: [],
  denominations: [{ id: 1, name: '1 złoty' }],
  mints: [],
  materials: [],
  states: [],
  eras: [{ id: 1, name: 'AD' }],
}

const coin = {
  id: 1,
  country_id: 1,
  issuer_id: null,
  denomination_id: 1,
  from_year: 1900,
  from_era_id: 1,
  to_year: 1901,
  to_era_id: 1,
  mint_id: null,
  material_id: null,
  collection_id: 1,
  state_id: null,
  description: 'Moneta testowa',
  weight: null,
  diameter: null,
  collection_number: 'KC-001',
  has_video: false,
  source: null,
  is_deleted: false,
}

const images = [
  { id: 10, kind: 'avers', filename: 'avers.jpg' },
  { id: 11, kind: 'rewers', filename: 'rewers.jpg' },
]

async function mockDictionaries(page: Page): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []),
    })
  })
}

test('Dodaj monetę: pole numeru kolekcji przyjmuje wartość', async ({ page }) => {
  await mockDictionaries(page)
  await page.goto('/dodaj')
  await expect(page.locator('h1')).toHaveText('Dodaj monetę')

  const collectionNumber = page.getByLabel('Numer kolekcji')
  await collectionNumber.fill('KC-001')
  await expect(collectionNumber).toHaveValue('KC-001')
})

test('Edytuj monetę: ładuje i wysyła zmieniony numer kolekcji', async ({ page }) => {
  await mockDictionaries(page)
  let requestBody: Record<string, unknown> | null = null

  await page.route('**/api/coins/1/images', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(images),
    })
  })

  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(coin),
      })
      return
    }

    if (route.request().method() === 'PUT') {
      requestBody = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...coin, collection_number: 'KC-002' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.goto('/monety/1/edytuj')
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()
  await expect(page.getByLabel('Numer kolekcji')).toHaveValue('KC-001')
  await page.getByLabel('Numer kolekcji').fill('KC-002')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

  await expect.poll(() => requestBody).not.toBeNull()
  expect(requestBody?.collection_number).toBe('KC-002')
})
