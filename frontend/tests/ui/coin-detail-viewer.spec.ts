import { expect, test } from '@playwright/test'

const coinId = 404

const coin = {
  id: coinId,
  country_id: 1,
  issuer_id: null,
  denomination_id: 1,
  from_year: 1900,
  from_era_id: 1,
  to_year: 1901,
  to_era_id: 1,
  mint_id: null,
  material_id: null,
  state_id: null,
  description: 'Moneta testowa',
  weight: null,
  diameter: null,
  has_video: false,
  source: null,
  is_deleted: false,
}

const dictionaries: Record<string, Array<{ id: number; name: string }>> = {
  countries: [{ id: 1, name: 'Polska' }],
  issuers: [],
  denominations: [{ id: 1, name: '1 złoty' }],
  mints: [],
  materials: [],
  states: [],
  eras: [{ id: 1, name: 'AD' }],
}

const images = [
  {
    id: 10,
    coin_id: coinId,
    filename: '000404 - awers.jpg',
    kind: 'avers',
    sort_order: 0,
  },
  {
    id: 11,
    coin_id: coinId,
    filename: '000404 - rewers.jpg',
    kind: 'rewers',
    sort_order: 1,
  },
]

test('podpis i licznik w viewerze mają szerokość obrazu', async ({ page }) => {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = route.request().url().split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name] ?? []),
    })
  })

  await page.route(`**/api/coins/${coinId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.route(`**/api/coins/${coinId}/images`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(images),
    })
  })

  await page.route(`**/api/coins/${coinId}/images/*/file`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#ddd"/></svg>',
    })
  })

  await page.route(`**/api/coins/${coinId}/categories`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.goto(`/monety/${coinId}`)
  await expect(page.getByRole('heading', { name: `Szczegóły monety #${coinId}` })).toBeVisible()

  await page.getByRole('button', { name: 'Awers monety' }).click()

  const viewer = page.getByRole('dialog', { name: 'Podgląd zdjęcia' })
  const imageFrame = viewer.locator('.viewer-image-frame')
  const image = imageFrame.locator('img')
  const caption = imageFrame.locator('figcaption')

  await expect(image).toHaveJSProperty('naturalWidth', 400)
  await expect(image).toHaveJSProperty('naturalHeight', 300)
  await expect(caption).toContainText('000404 - awers.jpg')
  await expect(caption).toContainText('1 / 2')

  const imageBox = await image.boundingBox()
  const frameBox = await imageFrame.boundingBox()
  const captionBox = await caption.boundingBox()

  expect(imageBox).not.toBeNull()
  expect(frameBox).not.toBeNull()
  expect(captionBox).not.toBeNull()

  expect(Math.abs((frameBox?.width ?? 0) - (imageBox?.width ?? 0))).toBeLessThan(1)
  expect(Math.abs((captionBox?.width ?? 0) - (imageBox?.width ?? 0))).toBeLessThan(1)
  expect(Math.abs((captionBox?.x ?? 0) - (imageBox?.x ?? 0))).toBeLessThan(1)
  expect(
    Math.abs(
      (captionBox?.x ?? 0) + (captionBox?.width ?? 0) -
      ((imageBox?.x ?? 0) + (imageBox?.width ?? 0)),
    ),
  ).toBeLessThan(1)
})
