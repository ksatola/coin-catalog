import { expect, test, type Page } from '@playwright/test'

const makeCoin = (id: number) => ({
  id,
  collection_id: 1,
  country_id: null,
  issuer_id: null,
  denomination_id: null,
  from_year: 1900,
  from_era_id: null,
  to_year: 1900,
  to_era_id: null,
  mint_id: null,
  material_id: null,
  state_id: null,
  description: `Moneta testowa ${id}`,
  weight: null,
  diameter: null,
  has_video: false,
  source: null,
  is_deleted: false,
  images: [],
})

async function mockCatalog(page: Page): Promise<() => number> {
  let catalogListRequests = 0
  const coins = Array.from({ length: 150 }, (_, index) => makeCoin(index + 1))

  await page.route('**/api/collections', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/coins*', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path === '/api/coins') catalogListRequests += 1
    if (path.endsWith('/navigation')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ previous_id: null, next_id: null }),
      })
      return
    }

    const detailMatch = path.match(/\/api\/coins\/(\d+)$/)
    if (detailMatch) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(coins[Number(detailMatch[1]) - 1]),
      })
      return
    }

    const cursor = url.searchParams.get('cursor')
    const start = cursor === 'page-2' ? 50 : cursor === 'page-3' ? 100 : 0
    const items = coins.slice(start, start + 50)
    const nextCursor = start === 0 ? 'page-2' : start === 50 ? 'page-3' : null
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items, next_cursor: nextCursor, has_more: nextCursor !== null }),
    })
  })
  return () => catalogListRequests
}

test('filtry i ustawienia prezentacji są niezależne między kartami', async ({ page }) => {
  await mockCatalog(page)
  await page.goto('/monety')

  const secondTab = await page.context().newPage()
  await mockCatalog(secondTab)
  await secondTab.goto('/monety')

  await page.getByRole('button', { name: '3 monet w wierszu' }).click()
  await expect(page.getByRole('button', { name: '3 monet w wierszu' })).toHaveAttribute('aria-pressed', 'true')
  await expect(secondTab.getByRole('button', { name: '2 monet w wierszu' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: '▦ Grid' }).click()
  await expect(page.getByRole('button', { name: '▦ Grid' })).toHaveClass(/active/)
  await expect(secondTab.getByRole('button', { name: '▦ Galeria' })).toHaveClass(/active/)

  await page.getByRole('button', { name: '◉ Rozmiar' }).click()
  await page.getByRole('button', { name: 'Skala 50%' }).click()
  await secondTab.getByRole('button', { name: '◉ Rozmiar' }).click()
  await expect(page.getByRole('button', { name: 'Skala 50%' })).toHaveClass(/active/)
  await expect(secondTab.getByRole('button', { name: 'Skala 100%, wymaga kalibracji' })).toHaveClass(/active/)

  await page.getByRole('button', { name: '▦ Grid' }).click()
  await secondTab.getByRole('button', { name: '☷ Lista' }).click()
  await expect(secondTab.getByRole('button', { name: '☷ Lista' })).toHaveClass(/active/)
  await expect(page.getByRole('button', { name: '▦ Grid' })).toHaveClass(/active/)

  await page.getByRole('button', { name: '⚙ Filtry' }).click()
  await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('polska grosz')
  await secondTab.getByRole('button', { name: '⚙ Filtry' }).click()
  await expect(secondTab.getByRole('searchbox', { name: 'Szukaj', exact: true })).toHaveValue('')

  await page.reload()
  await expect(page.getByRole('button', { name: '▦ Grid' })).toHaveClass(/active/)
  await secondTab.reload()
  await expect(secondTab.getByRole('button', { name: '☷ Lista' })).toHaveClass(/active/)
  await secondTab.close()
})

test('powrót do katalogu odtwarza scroll i doładowuje brakujące strony', async ({ page }) => {
  const getCatalogListRequestCount = await mockCatalog(page)
  await page.goto('/monety')

  const tiles = page.locator('.coin-tile')
  await expect(tiles).toHaveCount(50)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(tiles).toHaveCount(100)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(tiles).toHaveCount(150)

  const requestsBeforeDetail = getCatalogListRequestCount()
  const lastTile = tiles.nth(140)
  await lastTile.scrollIntoViewIfNeeded()
  const savedScroll = await page.evaluate(() => window.scrollY)
  await lastTile.click()
  await expect(page).toHaveURL(/\/monety\/141/)

  await page.goBack()
  await expect(tiles).toHaveCount(150)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(savedScroll - 10)
  expect(getCatalogListRequestCount()).toBe(requestsBeforeDetail)

  // The bottom navigation creates a new history entry rather than going back.
  // It should still restore the latest catalogue position.
  await tiles.nth(140).click()
  await expect(page).toHaveURL(/\/monety\/141/)
  const requestsBeforeFreshReturn = getCatalogListRequestCount()
  await page.evaluate(() => sessionStorage.setItem('coin-catalog:stale:coins', 'true'))
  await page.getByRole('link', { name: 'Monety' }).click()
  await expect(page).toHaveURL(/\/monety$/)
  await expect(tiles).toHaveCount(150)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(savedScroll - 10)
  expect(getCatalogListRequestCount()).toBeGreaterThan(requestsBeforeFreshReturn)
})
