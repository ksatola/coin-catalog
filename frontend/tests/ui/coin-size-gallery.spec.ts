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

  await page.goto('/monety')
  await page.getByRole('button', { name: '◉ Rozmiar' }).click()

  const sizes = page.locator('.coin-size-tile .missing-image')
  await expect(sizes).toHaveCount(2)

  const initialSizes = await sizes.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().width),
  )
  expect(initialSizes).toEqual([400, 200])

  await page.getByRole('button', { name: 'Skala 50%' }).click()

  const halfSizes = await sizes.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().width),
  )
  expect(halfSizes).toEqual([200, 100])
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

  await page.goto('/monety')
  await page.getByRole('button', { name: '◉ Rozmiar' }).click()

  const sizes = page.locator('.coin-size-tile .missing-image')
  await expect(sizes).toHaveCount(2)
  await expect.poll(() => sizes.nth(0).evaluate((element) => element.getBoundingClientRect().width)).toBe(400)

  await page.locator('.infinite-scroll-sentinel').scrollIntoViewIfNeeded()

  await expect(sizes).toHaveCount(3)
  await expect.poll(() => sizes.nth(0).evaluate((element) => element.getBoundingClientRect().width)).toBe(200)
  await expect.poll(() => sizes.nth(1).evaluate((element) => element.getBoundingClientRect().width)).toBe(100)
  await expect.poll(() => sizes.nth(2).evaluate((element) => element.getBoundingClientRect().width)).toBe(400)
})
