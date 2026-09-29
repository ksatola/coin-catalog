import { expect, test } from '@playwright/test'

const coins = Array.from({ length: 4 }, (_, index) => ({
  id: index + 1,
  collection_id: 1,
  country_id: 1,
  issuer_id: null,
  denomination_id: 1,
  from_year: 1900 + index,
  from_era_id: 1,
  to_year: 1900 + index,
  to_era_id: 1,
  mint_id: null,
  material_id: null,
  state_id: null,
  description: `Moneta ${index + 1}`,
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
}))

const dictionaries = {
  countries: [{ id: 1, name: 'Kraj testowy' }],
  issuers: [],
  denominations: [{ id: 1, name: 'Nominał testowy' }],
  mints: [],
  materials: [],
  states: [],
  eras: [{ id: 1, name: 'AD' }],
}

async function mockCatalog(page: import('@playwright/test').Page): Promise<URL[]> {
  const requests: URL[] = []

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
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.route('**/api/coins', async (route) => {
    const url = new URL(route.request().url())
    requests.push(url)

    if (!url.searchParams.has('limit')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(coins),
      })
      return
    }

    const cursor = url.searchParams.get('cursor')
    const items = cursor ? coins.slice(2, 4) : coins.slice(0, 2)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items,
        next_cursor: cursor ? null : 'cursor-page-2',
        has_more: !cursor,
      }),
    })
  })

  return requests
}

test('infinite scroll doładowuje kolejną porcję monet przez cursor', async ({ page }) => {
  const requests = await mockCatalog(page)

  await page.goto('/monety')

  await expect(page.getByRole('link', { name: 'Moneta #1' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Moneta #2' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Moneta #3' })).toHaveCount(0)

  await page.locator('.infinite-scroll-sentinel').scrollIntoViewIfNeeded()

  await expect(page.getByRole('link', { name: 'Moneta #3' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Moneta #4' })).toBeVisible()
  await expect(page.locator('.image-grid .coin-tile')).toHaveCount(4)

  const paginatedRequests = requests.filter((url) => url.searchParams.has('limit'))
  expect(paginatedRequests).toHaveLength(2)
  expect(paginatedRequests[0]?.searchParams.get('cursor')).toBeNull()
  expect(paginatedRequests[1]?.searchParams.get('cursor')).toBe('cursor-page-2')
})

test('nawigacja szczegółów używa endpointu previous/next z filtrami', async ({ page }) => {
  const requestedNavigation: URL[] = []

  await page.route('**/api/coins/*/navigation*', async (route) => {
    const url = new URL(route.request().url())
    requestedNavigation.push(url)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        previous_id: 1,
        next_id: 3,
      }),
    })
  })

  await page.route('**/api/coins/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/navigation')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ previous_id: 1, next_id: 3 }),
      })
      return
    }

    const coinId = Number(url.pathname.split('/').pop())
    const coin = coins.find((item) => item.id === coinId) ?? coins[1]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.goto('/monety/2?country_id=1&sort_by=id&sort_order=asc')

  await expect(page.getByRole('button', { name: '← Poprzednia' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Następna →' })).toBeEnabled()
  expect(requestedNavigation).toHaveLength(1)
  expect(requestedNavigation[0]?.searchParams.get('country_id')).toBe('1')
  expect(requestedNavigation[0]?.searchParams.get('sort_by')).toBe('id')

  await page.getByRole('button', { name: 'Następna →' }).click()
  await expect(page).toHaveURL(/\/monety\/3\?/)
})
