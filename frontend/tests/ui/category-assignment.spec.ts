import { expect, test } from '@playwright/test'

test('moneta pozwala przypisać i usunąć kategorię', async ({ page }) => {
  const coin = {
    id: 404,
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

  const allCategories = [
    {
      id: 1,
      name: 'Polska',
      description: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      parent_ids: [],
      child_ids: [],
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
  let assigned = [allCategories[0]]

  await page.route('**/api/dictionaries/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/api/coins/404', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.route('**/api/coins/404/images', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/api/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(allCategories),
    })
  })

  await page.route('**/api/coins/404/categories', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(assigned),
      })
      return
    }

    assigned = [allCategories[0], allCategories[1]]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(allCategories[1]),
    })
  })

  await page.route('**/api/coins/404/categories/*', async (route) => {
    assigned = assigned.filter((category) => category.id !== 2)
    await route.fulfill({ status: 204, body: '' })
  })

  await page.goto('/monety/404')

  await expect(page.getByRole('heading', { name: 'Kategorie' })).toBeVisible()
  await expect(page.locator('.category-assignment').getByText('Polska', { exact: true })).toBeVisible()

  await page.locator('.category-form select').selectOption('2')
  await page.getByRole('button', { name: 'Dodaj kategorię' }).click()

  const categoryItem = page
    .locator('.category-assignment .category-list li')
    .filter({ hasText: 'II RP' })
  await expect(categoryItem).toBeVisible()

  await categoryItem.getByRole('button', { name: 'Usuń', exact: true }).click()

  await expect(categoryItem).not.toBeVisible()
})
