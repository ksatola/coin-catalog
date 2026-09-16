import { expect, test, type Page } from '@playwright/test'

type Collection = {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
  coin_count: number
  archived_coin_count: number
  image_count: number
  file_size_bytes: number
  category_count: number
  coins_without_images_count: number
  last_modified_at: string
}

const initialCollections: Collection[] = [
  {
    id: 1,
    name: 'Monety polskie',
    description: 'Kolekcja podstawowa',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    coin_count: 428,
    archived_coin_count: 12,
    image_count: 791,
    file_size_bytes: 3 * 1024 * 1024 * 1024,
    category_count: 17,
    coins_without_images_count: 4,
    last_modified_at: '2026-09-16T10:42:00Z',
  },
]

function cloneCollections(): Collection[] {
  return initialCollections.map((collection) => ({ ...collection }))
}

async function mockCollectionApi(page: Page): Promise<void> {
  const state = cloneCollections()
  let nextId = 2

  await page.route('**/api/collections', async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(state),
      })
      return
    }

    if (method === 'POST') {
      const body = route.request().postDataJSON() as { name: string; description: string | null }
      const collection: Collection = {
        id: nextId++,
        name: body.name.trim(),
        description: body.description,
        created_at: '2026-09-16T11:00:00Z',
        updated_at: '2026-09-16T11:00:00Z',
        coin_count: 0,
        archived_coin_count: 0,
        image_count: 0,
        file_size_bytes: 0,
        category_count: 0,
        coins_without_images_count: 0,
        last_modified_at: '2026-09-16T11:00:00Z',
      }
      state.push(collection)
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(collection) })
      return
    }

    await route.fallback()
  })

  await page.route('**/api/collections/*', async (route) => {
    const method = route.request().method()
    const pathname = new URL(route.request().url()).pathname
    const parts = pathname.split('/').filter(Boolean)
    const id = Number(parts[2])
    const collection = state.find((item) => item.id === id)

    if (!collection) {
      await route.fulfill({ status: 404, body: '' })
      return
    }

    if (parts.length === 4 && parts[3] === 'stats' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(collection),
      })
      return
    }

    if (method === 'PUT') {
      const body = route.request().postDataJSON() as { name: string; description: string | null }
      collection.name = body.name.trim()
      collection.description = body.description
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collection) })
      return
    }

    if (method === 'DELETE') {
      state.splice(state.indexOf(collection), 1)
      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.fallback()
  })
}

test.describe('collections', () => {
  test('displays persisted collection statistics', async ({ page }) => {
    await mockCollectionApi(page)
    await page.goto('/kolekcje')

    await expect(page.getByRole('heading', { name: 'Kolekcje' })).toBeVisible()
    await page.getByRole('button', { name: 'Monety polskie' }).click()
    await expect(page.getByText('428', { exact: true })).toBeVisible()
    await expect(page.getByText('791', { exact: true })).toBeVisible()
    await expect(page.getByText('17', { exact: true })).toBeVisible()
    await expect(page.getByText('4', { exact: true })).toBeVisible()
    await expect(page.getByText('3.0 GB')).toBeVisible()
    await expect(page.getByText('16 września 2026, 12:42')).toBeVisible()
  })

  test('creates, edits and deletes a collection', async ({ page }) => {
    await mockCollectionApi(page)
    await page.goto('/kolekcje')

    await page.getByRole('button', { name: 'Nowa kolekcja' }).first().click()
    await page.getByLabel('Nazwa').fill('Nowa kolekcja')
    await page.getByLabel('Opis').fill('Testowy opis')
    await page.getByRole('button', { name: 'Dodaj', exact: true }).click()

    await expect(page.getByRole('button', { name: 'Nowa kolekcja' }).first()).toBeVisible()
    await expect(page.getByDisplayValue('Nowa kolekcja')).toBeVisible()
    await expect(page.getByDisplayValue('Testowy opis')).toBeVisible()

    await page.getByLabel('Nazwa').fill('Zmieniona kolekcja')
    await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Zmieniona kolekcja' })).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Usuń kolekcję' }).click()
    await expect(page.getByRole('button', { name: 'Zmieniona kolekcja' })).toHaveCount(0)
  })
})
