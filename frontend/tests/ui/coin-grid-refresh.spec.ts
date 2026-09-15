import { expect, test } from '@playwright/test'

const coin1 = {
  id: 1, country_id: 1, issuer_id: null, denomination_id: 2, from_year: 1900, from_era_id: 3, to_year: 1901, to_era_id: 3,
  mint_id: null, material_id: null, state_id: null, description: 'Moneta testowa', weight: null, diameter: null,
  has_video: false, source: null, is_deleted: false,
}
const coin2 = { ...coin1, id: 2, description: 'Druga moneta' }
const images = new Map([
  [1, [{ id: 101, coin_id: 1, filename: '000001 - awers.jpg', kind: 'avers', sort_order: 0 }]],
  [2, [{ id: 102, coin_id: 2, filename: '000002 - awers.jpg', kind: 'avers', sort_order: 0 }]],
])
const dictionaries = {
  countries: [{ id: 1, name: 'Polska' }], issuers: [], denominations: [{ id: 2, name: '1 grosz' }],
  mints: [], materials: [], states: [], eras: [{ id: 3, name: 'AD' }],
}

async function mockApi(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []) })
  })
  await page.route('**/api/categories', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/coins*', async (route) => {
    const search = new URL(route.request().url()).searchParams.get('search')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(search ? [coin1] : [coin1, coin2]) })
  })
  await page.route('**/api/coins/*/images', async (route) => {
    const coinId = Number(new URL(route.request().url()).pathname.split('/')[3])
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(images.get(coinId) ?? []) })
  })
}

test('wyczyszczenie filtrów odświeża zdjęcia monet w galerii', async ({ page }) => {
  await mockApi(page)
  await page.goto('/monety')

  await expect(page.getByRole('link', { name: 'Moneta #2' })).toBeVisible()
  await expect(page.getByAltText('Awers monety #2')).toBeVisible()

  await page.getByRole('button', { name: '⚙ Filtry' }).click()
  await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('test')
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()

  await expect(page.getByRole('link', { name: 'Moneta #1' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Moneta #2' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Wyczyść filtry' }).click()

  const grid = page.locator('.image-grid')
  await expect(grid.getByRole('link', { name: 'Moneta #1' })).toBeVisible()
  await expect(grid.getByRole('link', { name: 'Moneta #2' })).toBeVisible()
  await expect(grid.getByAltText('Awers monety #1')).toBeVisible()
  await expect(grid.getByAltText('Awers monety #2')).toBeVisible()
})
