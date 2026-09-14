import { test, expect } from '@playwright/test'

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

async function mockCommonApi(page: Parameters<typeof test>[0]['page']) {
  let avers = oldImage
  const uploaded: Array<{ kind: string; replace: boolean; filename: string }> = []

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
      body: JSON.stringify([avers, rewersImage]),
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
    const request = route.request()
    const url = new URL(request.url())
    const kind = url.searchParams.get('kind') ?? ''
    const replace = url.searchParams.get('replace') === 'true'
    const filename = request.postData()?.includes('nowy-awers')
      ? 'nowy-awers.jpg'
      : 'uploaded.jpg'

    uploaded.push({ kind, replace, filename })
    if (kind === 'avers') {
      avers = { ...avers, filename: '000404 - awers.jpg' }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...avers,
        filename: '000404 - awers.jpg',
        kind,
      }),
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

async function dropJpeg(page: Parameters<typeof test>[0]['page'], filename: string) {
  await page.locator('.image-drop-zone').first().evaluate((element, name) => {
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

  expect(uploaded).toEqual([
    { kind: 'avers', replace: true, filename: 'uploaded.jpg' },
  ])
})

test('anulowanie edycji nie zapisuje podmiany awersu', async ({ page }) => {
  const { uploaded } = await mockCommonApi(page)
  let updates = 0

  await page.route(`**/api/coins/${coinId}`, async (route) => {
    if (route.request().method() === 'PUT') {
      updates += 1
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
  await page.getByRole('button', { name: 'Anuluj' }).click()
  await page.waitForURL(`/monety/${coinId}`)

  expect(updates).toBe(0)
  expect(uploaded).toHaveLength(0)
  await expect(page.getByAltText('Awers monety')).toBeVisible()
})
