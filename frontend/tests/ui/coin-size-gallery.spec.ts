import { expect, test } from '@playwright/test'

const baseCoin = {
  id: 1,
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
  description: null,
  weight: null,
  diameter: 20,
  has_video: false,
  source: null,
  is_deleted: false,
}

const validJpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z',
  'base64',
)

test('widok rozmiarów zachowuje proporcje średnic i skalę', async ({ page }) => {
  const coins = [
    { ...baseCoin, id: 1, diameter: 20, images: [] },
    { ...baseCoin, id: 2, diameter: 10, images: [] },
  ]

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    const dictionaries: Record<string, unknown[]> = {
      countries: [{ id: 1, name: 'Kraj testowy' }],
      issuers: [{ id: 2, name: 'Emitent testowy' }],
      denominations: [{ id: 3, name: '1 zł' }],
      mints: [{ id: 4, name: 'Mennica testowa' }],
      materials: [{ id: 5, name: 'Srebro' }],
      states: [{ id: 6, name: 'II' }],
      eras: [{ id: 7, name: 'AD' }],
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name] ?? []) })
  })

  await page.route('**/api/collections', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/coins*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: coins, next_cursor: null, has_more: false }),
    })
  })

  await page.addInitScript(() => localStorage.setItem('coin-catalog:size-gallery-calibration:coins', '10'))
  await page.goto('/monety')
  await page.getByRole('button', { name: '◉ Rozmiar' }).click()

  const tiles = page.locator('.coin-size-tile')
  await expect(tiles).toHaveCount(2)
  await expect(page.locator('.coin-size-tile .missing-image')).toHaveCount(2)

  const initialSizes = await tiles.evaluateAll((elements) =>
    elements.map((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('--coin-size'))),
  )
  expect(initialSizes[0]).toBeCloseTo(200, 5)
  expect(initialSizes[1]).toBeCloseTo(100, 5)

  await page.getByRole('button', { name: 'Skala 50%' }).click()

  const halfSizes = await tiles.evaluateAll((elements) =>
    elements.map((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('--coin-size'))),
  )
  expect(halfSizes[0]).toBeCloseTo(100, 5)
  expect(halfSizes[1]).toBeCloseTo(50, 5)
})

test('kalibracja ekranu ustawia rzeczywistą skalę 100%', async ({ page }) => {
  const coin = { ...baseCoin, diameter: 20, images: [] }

  await page.route('**/api/collections', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/coins*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [coin], next_cursor: null, has_more: false }),
    })
  })

  await page.addInitScript(() => localStorage.setItem('coin-catalog:size-gallery-scale:coins', '100'))
  await page.goto('/monety')
  await page.getByRole('button', { name: '◉ Rozmiar' }).click()
  await page.getByRole('button', { name: '⚙ Kalibruj ekran' }).click()

  const dialog = page.getByRole('dialog', { name: 'Kalibracja ekranu' })
  await expect(dialog).toBeVisible()

  const input = dialog.getByLabel('Piksele CSS na 1 mm')
  await input.fill('10')
  await dialog.getByRole('button', { name: 'Zapisz kalibrację' }).click()

  await expect(page.getByRole('button', { name: 'Skala 100%, skalibrowana' })).toBeVisible()
  const tile = page.locator('.coin-size-tile')
  const renderedSize = () => tile.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).getPropertyValue('--coin-size')),
  )
  await expect.poll(renderedSize).toBeCloseTo(200, 5)

  await page.getByRole('button', { name: 'Skala 125%' }).click()
  await expect.poll(renderedSize).toBeCloseTo(250, 5)
  await page.getByRole('button', { name: 'Skala 150%' }).click()
  await expect.poll(renderedSize).toBeCloseTo(300, 5)
  await page.getByRole('button', { name: 'Skala 200%' }).click()
  await expect.poll(renderedSize).toBeCloseTo(400, 5)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Skala 100%, skalibrowana' })).toBeVisible()
  await expect.poll(renderedSize).toBeCloseTo(200, 5)
})

test('widok rozmiarów przeskalowuje wcześniej załadowane monety po infinite scroll', async ({ page }) => {
  const firstPage = [
    { ...baseCoin, id: 1, diameter: 20, images: [] },
    { ...baseCoin, id: 2, diameter: 10, images: [] },
  ]
  const secondPage = [
    { ...baseCoin, id: 3, diameter: 40, images: [] },
  ]

  await page.route('**/api/collections', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/coins*', async (route) => {
    const url = new URL(route.request().url())
    const payload = url.searchParams.has('cursor')
      ? { items: secondPage, next_cursor: null, has_more: false }
      : { items: firstPage, next_cursor: 'next-page', has_more: true }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })

  await page.addInitScript(() => localStorage.setItem('coin-catalog:size-gallery-calibration:coins', '10'))
  await page.goto('/monety')
  await page.getByRole('button', { name: '◉ Rozmiar' }).click()

  const tiles = page.locator('.coin-size-tile')
  await expect(tiles).toHaveCount(3)
  await expect(page.locator('.coin-size-tile .missing-image')).toHaveCount(3)
  const renderedSize = (index: number) => tiles.nth(index).evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).getPropertyValue('--coin-size')),
  )
  await expect.poll(() => renderedSize(0)).toBeCloseTo(200, 5)
  await expect.poll(() => renderedSize(1)).toBeCloseTo(100, 5)
  await expect.poll(() => renderedSize(2)).toBeCloseTo(400, 5)
})


test('widok rozmiarów pokazuje informacje z widoku Grid po najechaniu na monetę', async ({ page }) => {
  const coin = {
    ...baseCoin,
    id: 7,
    diameter: 20,
    country_id: 1,
    issuer_id: 2,
    denomination_id: 3,
    mint_id: 4,
    material_id: 5,
    state_id: 6,
    from_year: 1900,
    from_era_id: 7,
    to_year: 1901,
    to_era_id: 7,
    weight: 12.34,
    has_video: true,
    collection_number: 'A-123',
    images: [],
  }

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    const dictionaries: Record<string, unknown[]> = {
      countries: [{ id: 1, name: 'Kraj testowy' }],
      issuers: [{ id: 2, name: 'Emitent testowy' }],
      denominations: [{ id: 3, name: '1 zł' }],
      mints: [{ id: 4, name: 'Mennica testowa' }],
      materials: [{ id: 5, name: 'Srebro' }],
      states: [{ id: 6, name: 'II' }],
      eras: [{ id: 7, name: 'AD' }],
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name] ?? []) })
  })
  await page.route('**/api/collections', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/coins*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [coin], next_cursor: null, has_more: false }),
    })
  })

  await page.goto('/monety')
  await page.getByRole('button', { name: '◉ Rozmiar' }).click()

  const tile = page.locator('.coin-size-tile')
  const tooltip = tile.locator('.coin-tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip.locator('div')).toHaveText([
    '#7 | A-123',
    '1900 AD – 1901 AD',
    'Kraj: Kraj testowy',
    'Emitent: Emitent testowy',
    'Nominał: 1 zł',
    'Mennica: Mennica testowa',
    'Materiał: Srebro',
    'Stan: II',
    'Waga: 12.34 g',
    'Średnica: 20.00 mm',
    'Video',
  ])
})
