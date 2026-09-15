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

const coin = {
  id: 1,
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
  description: 'Polski grosz',
  weight: null,
  diameter: null,
  has_video: false,
  source: null,
  is_deleted: false,
}

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
  await page.route('**/api/coins/1/images', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/coins/1/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coin) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coin) })
  })
}

test('Edytuj monetę: dropdowny działają od razu po wejściu bez dodawania zdjęcia', async ({ page }) => {
  await mockEditApis(page)
  await page.goto('/monety/1/edytuj')
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()

  const country = page.getByLabel('Kraj').locator('select')
  const denomination = page.getByLabel('Nominał').locator('select')

  await expect(country.locator('option')).toHaveCount(3)
  await expect(denomination.locator('option')).toHaveCount(3)
  await country.selectOption('2')
  await denomination.selectOption('3')

  await expect(country).toHaveValue('2')
  await expect(denomination).toHaveValue('3')
})

test('Widok monety: nie pozwala zmieniać ani dodawać kategorii', async ({ page }) => {
  await mockEditApis(page)
  await page.goto('/monety/1')
  await expect(page.getByRole('heading', { name: 'Szczegóły monety #1' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Kategorie' })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Edytuj' })).toBeVisible()
})

test('Edytuj monetę: udostępnia zarządzanie kategoriami', async ({ page }) => {
  await mockEditApis(page)
  await page.goto('/monety/1/edytuj')
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Kategorie' })).toBeVisible()
  await expect(page.getByLabel('Wybierz kategorie')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dodaj kategorie' })).toBeDisabled()
})
