import { expect, test } from '@playwright/test'

const coinId = 505
const coin = { id: coinId, country_id: 1, issuer_id: null, denomination_id: 1, from_year: 1900, from_era_id: 1, to_year: 1901, to_era_id: 1, mint_id: null, material_id: null, state_id: null, description: 'Moneta testowa', weight: null, diameter: null, has_video: false, source: null, is_deleted: false }
const categories = [
  { id: 1, name: 'Polska', description: null, created_at: '', updated_at: '' },
  { id: 2, name: 'II RP', description: null, created_at: '', updated_at: '' },
  { id: 3, name: 'PRL', description: null, created_at: '', updated_at: '' },
]
const dictionaries: Record<string, Array<{ id: number; name: string }>> = {
  countries: [{ id: 1, name: 'Polska' }], issuers: [], denominations: [{ id: 1, name: '1 złoty' }],
  mints: [], materials: [], states: [], eras: [{ id: 1, name: 'Współczesna' }],
}

async function fillRequiredFields(page: import('@playwright/test').Page): Promise<void> {
  await page.getByLabel('Kraj', { exact: true }).selectOption('1')
  await page.getByLabel('Nominał', { exact: true }).selectOption('1')
  await page.getByLabel('Era od', { exact: true }).selectOption('1')
  await page.getByLabel('Rok od', { exact: true }).fill('1900')
  await page.getByLabel('Era do', { exact: true }).selectOption('1')
  await page.getByLabel('Rok do', { exact: true }).fill('1901')
}

async function dropJpeg(page: import('@playwright/test').Page, zoneIndex: number, filename: string): Promise<void> {
  await page.locator('.image-drop-zone').nth(zoneIndex).evaluate((element, name) => {
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(new File(['test-image'], name, { type: 'image/jpeg' }))
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }))
  }, filename)
}

async function mockCreateApi(page: import('@playwright/test').Page, assignedCategoryIds: number[]): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1) ?? ''
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name] ?? []) })
  })
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) })
  })
  await page.route('**/api/coins', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(coin) })
    else await route.fallback()
  })
  await page.route(`**/api/coins/${coinId}/images?*`, async (route) => {
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
  })
  await page.route(`**/api/coins/${coinId}/images`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route(`**/api/coins/${coinId}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coin) })
  })
  await page.route(`**/api/coins/${coinId}/categories/*`, async (route) => {
    const categoryId = Number(new URL(route.request().url()).pathname.split('/').at(-1))
    assignedCategoryIds.push(categoryId)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories[categoryId - 1]) })
  })
}

test('dodanie monety pozwala przypisać kilka kategorii naraz', async ({ page }) => {
  const assignedCategoryIds: number[] = []
  await mockCreateApi(page, assignedCategoryIds)
  await page.goto('/dodaj')
  const categorySelect = page.getByLabel('Wybierz kategorie')
  await expect(categorySelect.locator('option')).toHaveCount(3)
  await categorySelect.selectOption(['1', '2', '3'])
  await fillRequiredFields(page)
  await dropJpeg(page, 0, 'awers.jpg')
  await dropJpeg(page, 1, 'rewers.jpg')
  await page.getByRole('button', { name: 'Dodaj monetę' }).click()
  await page.waitForURL(`/monety/${coinId}`)
  expect(assignedCategoryIds).toEqual([1, 2, 3])
})

test('dodanie monety pozwala jednocześnie przypisać parenta i childa', async ({ page }) => {
  const assignedCategoryIds: number[] = []
  await mockCreateApi(page, assignedCategoryIds)
  await page.goto('/dodaj')
  await page.getByLabel('Wybierz kategorie').selectOption(['1', '2'])
  await fillRequiredFields(page)
  await dropJpeg(page, 0, 'awers.jpg')
  await dropJpeg(page, 1, 'rewers.jpg')
  await page.getByRole('button', { name: 'Dodaj monetę' }).click()
  await page.waitForURL(`/monety/${coinId}`)
  expect(assignedCategoryIds).toEqual([1, 2])
})
