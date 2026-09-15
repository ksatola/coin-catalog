import { expect, test } from '@playwright/test'

const coinId = 505

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

const categories = [
  {
    id: 1,
    name: 'Polska',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'II RP',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'PRL',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

const dictionaries: Record<string, Array<{ id: number; name: string }>> = {
  countries: [{ id: 1, name: 'Polska' }],
  issuers: [],
  denominations: [{ id: 1, name: '1 złoty' }],
  mints: [],
  materials: [],
  states: [],
  eras: [{ id: 1, name: 'Współczesna' }],
}

test('dodanie monety pozwala przypisać kilka kategorii naraz', async ({ page }) => {
  const assignedCategoryIds: number[] = []

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1) ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name] ?? []),
    })
  })

  await page.route('**/api/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(categories),
    })
  })

  await page.route('**/api/coins', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.route(`**/api/coins/${coinId}/images?*`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, coin_id: coinId }),
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
      body: JSON.stringify([]),
    })
  })

  await page.route(`**/api/coins/${coinId}/categories/*`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    const categoryId = Number(new URL(route.request().url()).pathname.split('/').at(-1))
    assignedCategoryIds.push(categoryId)
    const category = categories.find((item) => item.id === categoryId)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(category),
    })
  })

  await page.goto('/dodaj')

  const categorySelect = page.locator('.category-assignment select')
  await expect(categorySelect.locator('option')).toHaveCount(3)
  await categorySelect.selectOption(['1', '2', '3'])

  await page.getByLabel('Kraj').selectOption('1')
  await page.getByLabel('Nominał').selectOption('1')
  await page.getByLabel('Era od').selectOption('1')
  await page.getByLabel('Rok od').fill('1900')
  await page.getByLabel('Era do').selectOption('1')
  await page.getByLabel('Rok do').fill('1901')

  async function dropJpeg(zoneIndex: number, filename: string): Promise<void> {
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

  await dropJpeg(0, 'awers.jpg')
  await dropJpeg(1, 'rewers.jpg')

  await page.getByRole('button', { name: 'Dodaj monetę' }).click()
  await page.waitForURL(`/monety/${coinId}`)

  expect(assignedCategoryIds).toEqual([1, 2, 3])
})

test('dodanie monety pozwala jednocześnie przypisać parenta i childa', async ({ page }) => {
  const assignedCategoryIds: number[] = []

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1) ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name] ?? []),
    })
  })

  await page.route('**/api/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(categories),
    })
  })

  await page.route('**/api/coins', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.route(`**/api/coins/${coinId}/images?*`, async (route) => {
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
  })

  await page.route(`**/api/coins/${coinId}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coin) })
  })

  await page.route(`**/api/coins/${coinId}/images`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.route(`**/api/coins/${coinId}/categories/*`, async (route) => {
    const categoryId = Number(new URL(route.request().url()).pathname.split('/').at(-1))
    assignedCategoryIds.push(categoryId)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories[categoryId - 1]) })
  })

  await page.goto('/dodaj')
  await page.locator('.category-assignment select').selectOption(['1', '2'])

  await page.getByLabel('Kraj').selectOption('1')
  await page.getByLabel('Nominał').selectOption('1')
  await page.getByLabel('Era od').selectOption('1')
  await page.getByLabel('Rok od').fill('1900')
  await page.getByLabel('Era do').selectOption('1')
  await page.getByLabel('Rok do').fill('1901')

  async function dropJpeg(zoneIndex: number, filename: string): Promise<void> {
    await page.locator('.image-drop-zone').nth(zoneIndex).evaluate((element, name) => {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(new File(['test-image'], name, { type: 'image/jpeg' }))
      element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }))
    }, filename)
  }

  await dropJpeg(0, 'awers.jpg')
  await dropJpeg(1, 'rewers.jpg')
  await page.getByRole('button', { name: 'Dodaj monetę' }).click()
  await page.waitForURL(`/monety/${coinId}`)

  expect(assignedCategoryIds).toEqual([1, 2])
})
