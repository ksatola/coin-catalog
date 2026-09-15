import { expect, test, type Page } from '@playwright/test'

const categories = [
  {
    id: 1,
    name: 'Polska',
    description: 'Monety polskie',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    parent_ids: [],
    child_ids: [2],
  },
  {
    id: 2,
    name: 'II RP',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    parent_ids: [1],
    child_ids: [],
  },
]

async function mockCategoryApi(page: Page): Promise<void> {
  await page.route('**/api/categories', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categories),
      })
      return
    }

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(categories[0]),
    })
  })

  await page.route('**/api/categories/*', async (route) => {
    const method = route.request().method()
    if (method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' })
      return
    }
    if (method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categories[0]),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(categories[1]),
    })
  })
}

test('widok kategorii pozwala wybrać istniejącą kategorię i edytować jej dane', async ({ page }) => {
  await mockCategoryApi(page)

  await page.goto('/kategorie')

  await expect(page.getByRole('heading', { name: 'Kategorie' })).toBeVisible()
  await page.getByRole('button', { name: 'Polska' }).click()

  await expect(page.getByRole('heading', { name: 'Edytuj kategorię' })).toBeVisible()
  await expect(page.getByLabel('Nazwa')).toHaveValue('Polska')
  await expect(page.locator('form').getByText('II RP')).toBeVisible()
})

test('widok kategorii pozwala rozpocząć tworzenie nowej kategorii', async ({ page }) => {
  await mockCategoryApi(page)

  await page.goto('/kategorie')
  await page.getByRole('button', { name: '+ Nowa kategoria' }).click()

  await expect(page.getByRole('heading', { name: 'Nowa kategoria' })).toBeVisible()
  await page.getByLabel('Nazwa').fill('Monety obiegowe')
  await page.getByLabel('Opis').fill('Monety przeznaczone do obiegu')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
})
