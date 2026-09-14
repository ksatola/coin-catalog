import { expect, test, type Page } from '@playwright/test'

const coinId = 404
const oldImage = {
  id: 10,
  coin_id: coinId,
  filename: '000404 - awers.jpg',
  kind: 'avers',
  sort_order: 0,
}
const rewersImage = {
  id: 11,
  coin_id: coinId,
  filename: '000404 - rewers.jpg',
  kind: 'rewers',
  sort_order: 1,
}

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
  eras: [{ id: 1, name: 'Współczesna' }],
}

type UploadCall = {
  kind: string
  replace: boolean
}

async function mockCommonApi(page: Page) {
  const uploaded: UploadCall[] = []

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
      body: JSON.stringify([oldImage, rewersImage]),
    })
  })

  await page.route(`**/api/coins/${coinId}/images/*/file`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/jpeg',
      body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    })
  })

  await page.route(`**/api/coins/${coinId}/images?*`, async (route) => {
    const url = new URL(route.request().url())
    uploaded.push({
      kind: url.searchParams.get('kind') ?? '',
      replace: url.searchParams.get('replace') === 'true',
    })

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(oldImage),
    })
  })

  await page.route('**/api/coins', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([coin]),
    })
  })

  return { uploaded }
}

async function dropJpeg(
  page: Page,
  filename: string,
  zoneIndex = 0,
): Promise<void> {
  await page.locator('.image-drop-zone').nth(zoneIndex).evaluate((element, name) => {
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(new File(['test-image'], name, { type: 'image/jpeg' }))
    element.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }))
  }, filename)
}

test('podmiana awersu zostaje zapisana i widoczna po powrocie do listy', async ({ page }) => {
  const { uploaded } = await mockCommonApi(page)
  let coinUpdates = 0

  await page.route(`**/api/coins/${coinId}`, async (route) => {
    if (route.request().method() === 'PUT') {
      coinUpdates += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(coin),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.goto(`/monety/${coinId}/edytuj`)
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()

  await dropJpeg(page, 'nowy-awers.jpg')
  await expect(page.getByAltText('Awers')).toBeVisible()

  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()
  await page.waitForURL(`/monety/${coinId}`)

  await expect(page.getByRole('heading', { name: `Szczegóły monety #${coinId}` })).toBeVisible()
  await expect(page.getByAltText('Awers monety')).toBeVisible()

  await page.getByRole('link', { name: 'Monety' }).click()
  await page.waitForURL('/monety')
  await expect(page.getByText(`#${coinId}`)).toBeVisible()
  await expect(page.getByAltText(`Awers monety #${coinId}`)).toBeVisible()

  expect(coinUpdates).toBe(1)
  expect(uploaded).toEqual([
    { kind: 'avers', replace: true },
  ])
})

test('anulowanie edycji nie zapisuje podmiany awersu', async ({ page }) => {
  const { uploaded } = await mockCommonApi(page)
  let updates = 0

  await page.route(`**/api/coins/${coinId}`, async (route) => {
    if (route.request().method() === 'PUT') {
      updates += 1
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.goto(`/monety/${coinId}/edytuj`)
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()

  await dropJpeg(page, 'nowy-awers.jpg')
  await page.getByRole('button', { name: 'Anuluj' }).click()
  await page.waitForURL(`/monety/${coinId}`)

  expect(updates).toBe(0)
  expect(uploaded).toHaveLength(0)
  await expect(page.getByAltText('Awers monety')).toBeVisible()
})

test('podmiana rewersu zostaje wysłana jako zastąpienie', async ({ page }) => {
  const { uploaded } = await mockCommonApi(page)
  let coinUpdates = 0

  await page.route(`**/api/coins/${coinId}`, async (route) => {
    if (route.request().method() === 'PUT') {
      coinUpdates += 1
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.goto(`/monety/${coinId}/edytuj`)
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()

  await dropJpeg(page, 'nowy-rewers.jpg', 1)
  await expect(page.getByAltText('Rewers')).toBeVisible()

  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()
  await page.waitForURL(`/monety/${coinId}`)

  await expect(page.getByAltText('Rewers monety')).toBeVisible()
  expect(coinUpdates).toBe(1)
  expect(uploaded).toEqual([
    { kind: 'rewers', replace: true },
  ])
})

test('dodanie zdjęcia dodatkowego zostaje wysłane bez zastępowania', async ({ page }) => {
  const { uploaded } = await mockCommonApi(page)
  let coinUpdates = 0

  await page.route(`**/api/coins/${coinId}`, async (route) => {
    if (route.request().method() === 'PUT') {
      coinUpdates += 1
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.goto(`/monety/${coinId}/edytuj`)
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()

  await dropJpeg(page, 'dodatkowe.jpg', 2)
  await expect(page.getByAltText('dodatkowe.jpg')).toBeVisible()

  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()
  await page.waitForURL(`/monety/${coinId}`)

  expect(coinUpdates).toBe(1)
  expect(uploaded).toEqual([
    { kind: 'additional', replace: false },
  ])
})
