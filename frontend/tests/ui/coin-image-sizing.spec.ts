import { expect, test, type Page } from '@playwright/test'

const coin = {
  id: 901,
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
  weight: 5,
  diameter: 20,
  collection_number: 'TEST-901',
  source: null,
  has_video: false,
  archived: false,
  collection_id: 1,
  images: [
    { id: 9011, coin_id: 901, filename: 'avers-wide.svg', kind: 'avers', sort_order: 0, revision: 1 },
    { id: 9012, coin_id: 901, filename: 'rewers-tall.svg', kind: 'rewers', sort_order: 0, revision: 1 },
  ],
}

async function mockCatalog(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    if (path === '/api/coins') {
      await route.fulfill({ json: { items: [coin], next_cursor: null, has_more: false } })
      return
    }
    if (path === '/api/collections') {
      await route.fulfill({ json: [{ id: 1, name: 'Kolekcja testowa' }] })
      return
    }
    if (path.startsWith('/api/dictionaries/')) {
      await route.fulfill({ json: path.endsWith('/countries') ? [{ id: 1, name: 'Kraj testowy' }] : [] })
      return
    }
    if (path.endsWith('/thumbnail')) {
      const wide = path.includes('9011')
      const svg = wide
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160"><rect width="300" height="160" fill="#ddd"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="300"><rect width="160" height="300" fill="#ddd"/></svg>'
      await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg })
      return
    }

    await route.fulfill({ json: [] })
  })
}

test('Lista zachowuje proporcje poziomej i pionowej miniatury w ramce', async ({ page }) => {
  await mockCatalog(page)
  await page.goto('/monety')
  await page.getByRole('button', { name: /Lista/ }).click()

  const obverse = page.getByAltText('Awers monety #901')
  const reverse = page.getByAltText('Rewers monety #901')
  await expect(obverse).toBeVisible()
  await expect(reverse).toBeVisible()
  await expect(obverse).toHaveCSS('object-fit', 'contain')
  await expect(reverse).toHaveCSS('object-fit', 'contain')

  const intrinsicSizes = await Promise.all([obverse, reverse].map((image) =>
    image.evaluate((element) => {
      const img = element as HTMLImageElement
      return { width: img.naturalWidth, height: img.naturalHeight }
    }),
  ))
  expect(intrinsicSizes).toEqual([{ width: 300, height: 160 }, { width: 160, height: 300 }])

  const boxes = await Promise.all([obverse, reverse].map((image) =>
    image.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }),
  ))
  for (const box of boxes) {
    expect(box.width).toBeGreaterThan(0)
    expect(box.height).toBeGreaterThan(0)
  }
})

test('Rozmiar utrzymuje skalowanie i odstęp między stronami z separatorem pośrodku', async ({ page }) => {
  await mockCatalog(page)
  await page.goto('/monety')
  await page.getByRole('button', { name: /Rozmiar/ }).click()

  const tile = page.getByRole('link', { name: 'Moneta #901' })
  const obverse = page.getByAltText('Awers monety #901')
  const reverse = page.getByAltText('Rewers monety #901')
  await expect(obverse).toBeVisible()
  await expect(reverse).toBeVisible()

  const initial = await tile.evaluate((element) => {
    const style = getComputedStyle(element)
    const first = element.querySelectorAll('.coin-side')[0]!
    const second = element.querySelectorAll('.coin-side')[1]!
    const divider = getComputedStyle(second, '::before')
    return {
      gap: style.columnGap,
      coinSize: style.getPropertyValue('--coin-size').trim(),
      dividerWidth: divider.width,
      dividerColor: divider.backgroundColor,
      firstWidth: first.getBoundingClientRect().width,
      secondWidth: second.getBoundingClientRect().width,
    }
  })

  expect(initial.gap).toBe('12px')
  expect(initial.dividerWidth).toBe('1px')
  expect(initial.firstWidth).toBe(initial.secondWidth)
  expect(initial.coinSize).toBe('75.5906px')

  await page.getByRole('button', { name: 'Skala 50%' }).click()
  await expect.poll(() => tile.evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--coin-size').trim(),
  )).toBe('37.7953px')
})
