import { expect, test, type Page } from '@playwright/test'

type Asset = {
  id: number
  filename: string
  original_filename: string
  mime_type: string
  file_size_bytes: number
  width: number
  height: number
  alt_text: string
  created_at: string
}

const asset: Asset = {
  id: 17,
  filename: '17.jpg',
  original_filename: 'mapa.jpg',
  mime_type: 'image/jpeg',
  file_size_bytes: 1234,
  width: 1200,
  height: 800,
  alt_text: 'Mapa Polski',
  created_at: '2026-10-04T00:00:00Z',
}

async function mockDependencies(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => route.abort())
  for (const name of ['countries', 'issuers', 'denominations', 'mints', 'materials', 'states', 'eras']) {
    await page.route(`**/api/dictionaries/${name}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
  }
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/collections', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

async function mockStory(page: Page, content = ''): Promise<void> {
  await mockDependencies(page)
  const response = {
    id: 1,
    parent_id: null,
    title: 'Asset test',
    slug: 'asset-test',
    content,
    sort_order: 0,
    created_at: '2026-10-04T00:00:00Z',
    updated_at: '2026-10-04T00:00:00Z',
    path: 'asset-test',
    embedded_coins: [],
    embedded_assets: content.includes('{{ image:17 }}') ? [{ id: 17, asset }] : [],
  }
  await page.route('**/api/story/pages/tree', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
  await page.route('**/api/story/pages', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(response) })
  })
  await page.route('**/api/story/pages/path/asset-test', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) })
  })
  await page.route('**/api/story/pages/1', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) })
  })
  await page.route('**/api/story/assets', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataBuffer()
      const requestText = body ? body.toString('latin1') : ''
      const uploadedAsset = requestText.includes('mapa.png')
        ? { ...asset, original_filename: 'mapa.png', filename: '17.png', mime_type: 'image/png' }
        : asset
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(uploadedAsset),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([asset]) })
  })
  await page.route('**/api/story/assets/17/file', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from([]) })
  })
  await page.route('**/api/story/assets/17/thumbnail', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from([]) })
  })
}

test('picker Opowieści pokazuje assety i wstawia referencję obrazu', async ({ page }) => {
  await mockStory(page)
  await page.goto('/opowiesc/edytuj/nowa')
  await page.getByLabel('Tytuł').fill('Asset picker')
  const textarea = page.getByLabel('Treść Markdown')
  await textarea.fill('Przed ')
  await textarea.evaluate((element) => (element as HTMLTextAreaElement).setSelectionRange(7, 7))
  await page.getByRole('button', { name: 'Wstaw obraz' }).click()
  await expect(page.getByRole('dialog', { name: 'Wybierz asset' })).toBeVisible()
  await expect(page.getByRole('button', { name: /#17 — mapa\.jpg/ })).toBeVisible()
  await page.getByRole('button', { name: /#17 — mapa\.jpg/ }).click()
  await expect(textarea).toHaveValue('Przed {{ image:17 }}')
})

test('StoryRenderer renderuje osadzony asset obrazu', async ({ page }) => {
  await mockStory(page, 'Treść {{ image:17 }}')
  await page.goto('/opowiesc/asset-test')
  await expect(page.locator('.story-renderer .story-asset img')).toHaveAttribute('src', '/api/story/assets/17/file')
  await expect(page.locator('.story-renderer .story-asset img')).toHaveAttribute('alt', 'Mapa Polski')
})


async function dropFile(page: Page, filename: string, mimeType: string): Promise<void> {
  await page.locator('.asset-picker .image-drop-zone').evaluate((element, data) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File(['test-image'], data.filename, { type: data.mimeType }))
    element.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer,
    }))
  }, { filename, mimeType })
}

test('Wstaw obraz przyjmuje JPG przez drag & drop i wstawia referencję', async ({ page }) => {
  await mockStory(page)
  await page.goto('/opowiesc/edytuj/nowa')
  const textarea = page.getByLabel('Treść Markdown')
  await textarea.fill('Przed ')
  await textarea.evaluate((element) => (element as HTMLTextAreaElement).setSelectionRange(7, 7))
  await page.getByRole('button', { name: 'Wstaw obraz' }).click()
  await expect(page.getByRole('dialog', { name: 'Wybierz asset' })).toBeVisible()

  await dropFile(page, 'mapa.jpg', 'image/jpeg')

  await expect(textarea).toHaveValue('Przed {{ image:17 }}')
})

test('Wstaw obraz przyjmuje PNG przez drag & drop i wstawia referencję', async ({ page }) => {
  await mockStory(page)
  await page.goto('/opowiesc/edytuj/nowa')
  const textarea = page.getByLabel('Treść Markdown')
  await textarea.fill('Przed ')
  await textarea.evaluate((element) => (element as HTMLTextAreaElement).setSelectionRange(7, 7))
  await page.getByRole('button', { name: 'Wstaw obraz' }).click()
  await expect(page.getByRole('dialog', { name: 'Wybierz asset' })).toBeVisible()

  await dropFile(page, 'mapa.png', 'image/png')

  await expect(textarea).toHaveValue('Przed {{ image:17 }}')
})
