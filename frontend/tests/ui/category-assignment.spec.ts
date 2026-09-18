import { expect, test } from '@playwright/test'

test('moneta pozwala przypisać i usunąć wiele kategorii w edycji', async ({ page }) => {
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
      child_ids: [2, 3],
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
    {
      id: 3,
      name: 'PRL',
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
      const sortedAssigned = [...assigned].sort((a, b) => a.name.localeCompare(b.name))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sortedAssigned),
      })
      return
    }

    await route.fallback()
  })

  await page.route('**/api/coins/404/categories/*', async (route) => {
    const parts = new URL(route.request().url()).pathname.split('/').filter(Boolean)
    const categoryId = Number(parts.at(-1))
    const category = allCategories.find((item) => item.id === categoryId)

    if (!category) {
      await route.fulfill({ status: 404, body: '' })
      return
    }

    if (route.request().method() === 'POST') {
      if (!assigned.some((item) => item.id === categoryId)) {
        assigned = [...assigned, category]
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(category),
      })
      return
    }

    if (route.request().method() === 'DELETE') {
      if (!assigned.some((item) => item.id === categoryId)) {
        await route.fulfill({ status: 404, body: '' })
        return
      }
      assigned = assigned.filter((item) => item.id !== categoryId)
      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.fallback()
  })

  await page.goto('/monety/404/edytuj')

  await expect(page.getByRole('heading', { name: 'Kategorie' })).toBeVisible()
  const assignment = page.locator('.category-assignment')
  await expect(assignment.getByText('Polska', { exact: true })).toBeVisible()
  await expect(assignment.locator('select option[value="1"]')).toHaveCount(0)
  await expect(assignment.locator('select option[value="2"]')).toHaveCount(1)
  await expect(assignment.locator('select option[value="3"]')).toHaveCount(1)

  await assignment.locator('select').selectOption(['2', '3'])
  await assignment.getByRole('button', { name: 'Zapisz kategorię' }).click()

  await expect(assignment.locator('.category-list li').filter({ hasText: 'II RP' })).toBeVisible()
  await expect(assignment.locator('.category-list li').filter({ hasText: 'PRL' })).toBeVisible()
  await expect(assignment.locator('select option[value="2"]')).toHaveCount(0)
  await expect(assignment.locator('select option[value="3"]')).toHaveCount(0)

  const iiRpItem = assignment.locator('.category-list li').filter({ hasText: 'II RP' })
  await iiRpItem.getByRole('button', { name: 'Usuń', exact: true }).click()

  await expect(iiRpItem).not.toBeVisible()
  await expect(assignment.locator('.category-list li').filter({ hasText: 'PRL' })).toBeVisible()
  await expect(assignment.locator('select option[value="2"]')).toHaveCount(1)
})
