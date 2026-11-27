import { expect, test, type Page } from '@playwright/test'

const sourceCoinId = 505
const duplicateCoinId = 506
const sourceCoin = {
  id: sourceCoinId,
  collection_id: 2,
  country_id: 1,
  issuer_id: 2,
  denomination_id: 3,
  from_year: 1900,
  from_era_id: 1,
  to_year: 1901,
  to_era_id: 1,
  mint_id: 4,
  material_id: 5,
  state_id: 6,
  description: 'Opis kopiowanej monety',
  avers_description: 'Opis awersu',
  revers_description: 'Opis rewersu',
  literature: 'Literatura źródłowa',
  acquisition_method_id: 7,
  acquisition_method_text: 'Zakup na aukcji',
  purchase_price: 123.45,
  purchase_date: '2026-08-19',
  weight: 12.34,
  diameter: 28.5,
  collection_number: 'A-17',
  source: 'https://example.com/coin',
  has_video: true,
  is_deleted: false,
}
const collections = [
  { id: 1, name: 'Kolekcja domyślna', description: null },
  { id: 2, name: 'Kolekcja źródłowa', description: null },
]
const categories = [
  { id: 11, name: 'Kategoria pierwsza', description: null, created_at: '', updated_at: '' },
  { id: 12, name: 'Kategoria druga', description: null, created_at: '', updated_at: '' },
]
const dictionaries: Record<string, Array<{ id: number; name: string }>> = {
  countries: [{ id: 1, name: 'Kraj testowy' }],
  issuers: [{ id: 2, name: 'Emitent testowy' }],
  denominations: [{ id: 3, name: 'Nominał testowy' }],
  mints: [{ id: 4, name: 'Mennica testowa' }],
  materials: [{ id: 5, name: 'Srebro' }],
  states: [{ id: 6, name: 'Stan testowy' }],
  eras: [{ id: 1, name: 'Współczesna' }],
  acquisition_methods: [{ id: 7, name: 'Aukcja' }],
}

async function dropJpeg(page: Page, zoneIndex: number, filename: string): Promise<void> {
  await page.locator('.image-drop-zone').nth(zoneIndex).evaluate((element, name) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File(['new-image'], name, { type: 'image/jpeg' }))
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  }, filename)
}

async function mockDuplicateApi(page: Page) {
  const requests = {
    sourceImageLists: 0,
    sourceImageFiles: 0,
    sourceUpdates: 0,
    createdPayload: null as Record<string, unknown> | null,
    categoryAssignments: [] as number[],
    imageUploads: [] as string[],
  }

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1) ?? ''
    await route.fulfill({ json: dictionaries[name] ?? [] })
  })
  await page.route('**/api/collections', async (route) => {
    await route.fulfill({ json: collections })
  })
  await page.route('**/api/collections/*', async (route) => {
    await route.fulfill({ json: collections.find((item) => item.id === Number(new URL(route.request().url()).pathname.split('/').at(-1))) ?? collections[1] })
  })
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ json: categories })
  })
  await page.route(`**/api/coins/${sourceCoinId}/categories`, async (route) => {
    await route.fulfill({ json: categories })
  })
  await page.route(`**/api/coins/${sourceCoinId}/images/*/file`, async (route) => {
    requests.sourceImageFiles += 1
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) })
  })
  await page.route(`**/api/coins/${sourceCoinId}/images`, async (route) => {
    requests.sourceImageLists += 1
    await route.fulfill({ json: [
      { id: 1, coin_id: sourceCoinId, filename: 'oryginal-awers.jpg', kind: 'avers', sort_order: 0 },
      { id: 2, coin_id: sourceCoinId, filename: 'oryginal-rewers.jpg', kind: 'rewers', sort_order: 0 },
    ] })
  })
  await page.route(`**/api/coins/${sourceCoinId}/navigation**`, async (route) => {
    await route.fulfill({ json: { previous_id: null, next_id: null } })
  })
  await page.route(`**/api/coins/${sourceCoinId}`, async (route) => {
    if (route.request().method() === 'PUT') requests.sourceUpdates += 1
    await route.fulfill({ json: sourceCoin })
  })
  await page.route('**/api/coins', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({ json: [] })
      return
    }
    requests.createdPayload = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ status: 201, json: { ...sourceCoin, id: duplicateCoinId } })
  })
  await page.route(`**/api/coins/${duplicateCoinId}/images**`, async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === 'POST') {
      requests.imageUploads.push(url.searchParams.get('kind') ?? '')
      await route.fulfill({ status: 201, json: {} })
      return
    }
    await route.fulfill({ json: [] })
  })
  await page.route(`**/api/coins/${duplicateCoinId}/categories/*`, async (route) => {
    const categoryId = Number(new URL(route.request().url()).pathname.split('/').at(-1))
    requests.categoryAssignments.push(categoryId)
    await route.fulfill({ status: 200, json: categories.find((category) => category.id === categoryId) })
  })
  await page.route(`**/api/coins/${duplicateCoinId}/categories`, async (route) => {
    await route.fulfill({ json: categories.filter((category) => requests.categoryAssignments.includes(category.id)) })
  })
  await page.route(`**/api/coins/${duplicateCoinId}/navigation**`, async (route) => {
    await route.fulfill({ json: { previous_id: null, next_id: null } })
  })
  await page.route(`**/api/coins/${duplicateCoinId}`, async (route) => {
    await route.fulfill({ json: { ...sourceCoin, id: duplicateCoinId } })
  })

  return requests
}

test('kopiuje dane monety i kategorie, ale wymaga nowych zdjęć i tworzy nowy rekord', async ({ page }) => {
  const requests = await mockDuplicateApi(page)

  await page.goto(`/monety/${sourceCoinId}`)
  await expect(page.getByRole('heading', { name: `Szczegóły monety #${sourceCoinId}` })).toBeVisible()

  const actionButtons = page.locator('.detail-actions button')
  await expect(actionButtons).toHaveText(['Edytuj', 'Kopiuj', 'Archiwizuj'])
  await expect.poll(() => requests.sourceImageLists).toBe(1)
  const imageListRequestsBeforeCopy = requests.sourceImageLists
  const imageFileRequestsBeforeCopy = requests.sourceImageFiles

  await page.getByRole('button', { name: 'Kopiuj', exact: true }).click()
  await expect(page).toHaveURL(`/dodaj?copy_from=${sourceCoinId}`)

  await expect(page.getByLabel('Wybierz kolekcję')).toHaveValue(String(sourceCoin.collection_id))
  await expect(page.getByLabel('Kraj', { exact: true })).toHaveValue(String(sourceCoin.country_id))
  await expect(page.getByLabel('Nominał', { exact: true })).toHaveValue(String(sourceCoin.denomination_id))
  await expect(page.getByLabel('Era od')).toHaveValue(String(sourceCoin.from_era_id))
  await expect(page.getByLabel('Rok od')).toHaveValue(String(sourceCoin.from_year))
  await expect(page.getByLabel('Era do')).toHaveValue(String(sourceCoin.to_era_id))
  await expect(page.getByLabel('Rok do')).toHaveValue(String(sourceCoin.to_year))
  await expect(page.getByLabel('Numer w kolekcji')).toHaveValue(sourceCoin.collection_number)
  await expect(page.getByLabel('Opis', { exact: true })).toHaveValue(sourceCoin.description)
  await expect(page.getByRole('textbox', { name: 'Awers' })).toHaveValue(sourceCoin.avers_description)
  await expect(page.getByRole('textbox', { name: 'Rewers' })).toHaveValue(sourceCoin.revers_description)
  await expect(page.getByLabel('Literatura')).toHaveValue(sourceCoin.literature)
  await expect(page.getByLabel('Cena zakupu')).toHaveValue('123.45')
  await expect(page.getByRole('textbox', { name: 'Data zakupu' })).toHaveValue(sourceCoin.purchase_date)
  await expect(page.locator('#acquisition-method-text')).toHaveValue(sourceCoin.acquisition_method_text)
  await expect(page.getByLabel('Wybierz kategorie').locator('option:checked')).toHaveCount(2)
  await expect(page.getByText('oryginal-awers.jpg')).toHaveCount(0)
  await expect(page.getByText('oryginal-rewers.jpg')).toHaveCount(0)
  expect(requests.sourceImageLists).toBe(imageListRequestsBeforeCopy)
  expect(requests.sourceImageFiles).toBe(imageFileRequestsBeforeCopy)

  await dropJpeg(page, 0, 'nowy-awers.jpg')
  await dropJpeg(page, 1, 'nowy-rewers.jpg')
  await page.getByRole('button', { name: 'Dodaj monetę' }).click()

  await expect(page).toHaveURL(`/monety/${duplicateCoinId}`)
  expect(requests.createdPayload).toMatchObject({
    country_id: sourceCoin.country_id,
    issuer_id: sourceCoin.issuer_id,
    denomination_id: sourceCoin.denomination_id,
    collection_id: sourceCoin.collection_id,
    purchase_price: sourceCoin.purchase_price,
    purchase_date: sourceCoin.purchase_date,
    description: sourceCoin.description,
    collection_number: sourceCoin.collection_number,
  })
  expect(requests.createdPayload).not.toHaveProperty('id')
  expect(requests.categoryAssignments).toEqual([11, 12])
  expect(requests.imageUploads).toEqual(['avers', 'rewers'])
  expect(requests.sourceUpdates).toBe(0)
})
