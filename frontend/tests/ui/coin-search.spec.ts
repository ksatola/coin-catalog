import { expect, test } from '@playwright/test'

const coin = {
  id: 1,
  country_id: 1,
  issuer_id: null,
  denomination_id: 1,
  from_year: 1900,
  from_era_id: 1,
  to_year: 1901,
  from_era_id: 1,
  to_year: 1901,
  to_era_id: 1,
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

const dictionaries = {
  countries: [{ id: 1, name: 'Polska' }],
  issuers: [],
  denominations: [{ id: 1, name: '1 grosz' }],
  mints: [],
  materials: [],
  states: [],
  eras: [{ id: 1, name: 'AD' }],
}

const categories = [
  { id: 1, name: 'Monety', description: null, parent_ids: [], child_ids: [2], created_at: '', updated_at: '' },
  { id: 2, name: 'Polska', description: null, parent_ids: [1], child_ids: [], created_at: '', updated_at: '' },
]

test('wyszukiwanie działa na żywo podczas pisania', async ({ page }) => {
  const coinRequests: URL[] = []

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = route.request().url().split('/').pop() ?? ''
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []) })
  })
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) })
  })
  await page.route('**/api/coins*', async (route) => {
    coinRequests.push(new URL(route.request().url()))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([coin]) })
  })

  await page.goto('/monety')
  await expect(page.getByRole('heading', { name: 'Monety' })).toBeVisible()
  const initialRequestCount = coinRequests.length

  const searchRequest = page.waitForRequest((request) => {
    const url = new URL(request.url())
    return url.pathname === '/api/coins' && url.searchParams.get('search') === 'polska grosz'
  })
  await page.getByLabel('Szukaj monet').fill('polska grosz')

  const request = await searchRequest
  const searchUrl = new URL(request.url())
  expect(searchUrl.searchParams.get('search')).toBe('polska grosz')
  expect(searchUrl.searchParams.get('status')).toBe('active')
  expect(coinRequests.length).toBeGreaterThan(initialRequestCount)
  await expect(page.getByText('#1')).toBeVisible()
})

test('wyszukiwanie wysyła tokeny niezależnie od kolejności', async ({ page }) => {
  const coinRequests: URL[] = []

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = route.request().url().split('/').pop() ?? ''
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []) })
  })
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) })
  })
  await page.route('**/api/coins*', async (route) => {
    coinRequests.push(new URL(route.request().url()))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([coin]) })
  })

  await page.goto('/monety')
  await expect(page.getByRole('heading', { name: 'Monety' })).toBeVisible()

  await page.getByLabel('Szukaj monet').fill('polska grosz')
  await expect.poll(() => coinRequests.at(-1)?.searchParams.get('search')).toBe('polska grosz')
  const searchUrl = coinRequests.at(-1)
  expect(searchUrl?.searchParams.get('status')).toBe('active')

  await page.getByLabel('Szukaj monet').fill('grosz polska')
  await expect.poll(() => coinRequests.at(-1)?.searchParams.get('search')).toBe('grosz polska')
})

test('filtr kategorii domyślnie uwzględnia podkategorie i można go wyłączyć', async ({ page }) => {
  const coinRequests: URL[] = []

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = route.request().url().split('/').pop() ?? ''
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []) })
  })
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) })
  })
  await page.route('**/api/coins*', async (route) => {
    coinRequests.push(new URL(route.request().url()))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([coin]) })
  })

  await page.goto('/monety')
  await page.locator('label').filter({ hasText: 'Kategorie' }).locator('select').first().selectOption('1')
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()

  let requestUrl = coinRequests.at(-1)
  expect(requestUrl?.searchParams.getAll('category_id')).toEqual(['1'])
  expect(requestUrl?.searchParams.get('include_category_children')).toBe('true')

  await page.getByRole('checkbox', { name: 'Uwzględniaj podkategorie' }).uncheck()
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()

  requestUrl = coinRequests.at(-1)
  expect(requestUrl?.searchParams.get('include_category_children')).toBe('false')
})

test('wyszukiwanie krótsze niż trzy znaki nie wysyła żądania', async ({ page }) => {
  const coinRequests: URL[] = []

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = route.request().url().split('/').pop() ?? ''
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []) })
  })
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) })
  })
  await page.route('**/api/coins*', async (route) => {
    coinRequests.push(new URL(route.request().url()))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([coin]) })
  })

  await page.goto('/monety')
  await expect(page.getByText('#1')).toBeVisible()
  const initialRequestCount = coinRequests.length

  await page.getByLabel('Szukaj monet').fill('ab')
  await page.waitForTimeout(350)

  expect(coinRequests.length).toBe(initialRequestCount)
  await expect(page.getByText('#1')).toBeVisible()
  await expect(page.getByText('Nie udało się pobrać monet.')).toHaveCount(0)
})
