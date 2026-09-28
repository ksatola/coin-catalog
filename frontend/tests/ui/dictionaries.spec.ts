import { expect, test } from '@playwright/test'

test('zarządza słownikiem sposobów nabycia', async ({ page }) => {
  let nextId = 100
  const items = [{ id: 1, name: 'Dom aukcyjny' }]

  await page.route('**/api/dictionaries/*', async (route) => {
    const url = new URL(route.request().url())
    const parts = url.pathname.split('/').filter(Boolean)
    const itemId = parts.length === 4 ? Number(parts[3]) : null

    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(items),
      })
      return
    }

    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name: string }
      const item = { id: nextId++, name: body.name }
      items.push(item)
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(item),
      })
      return
    }

    if (route.request().method() === 'PUT' && itemId !== null) {
      const body = route.request().postDataJSON() as { name: string }
      const item = items.find((entry) => entry.id === itemId)
      if (!item) {
        await route.fulfill({ status: 404, body: 'Not found' })
        return
      }
      item.name = body.name
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(item),
      })
      return
    }

    if (route.request().method() === 'DELETE' && itemId !== null) {
      const index = items.findIndex((entry) => entry.id === itemId)
      if (index >= 0) {
        items.splice(index, 1)
      }
      await route.fulfill({ status: 204 })
      return
    }

    await route.fulfill({ status: 405, body: 'Method not allowed' })
  })

  await page.goto('/slowniki')

  await expect(
    page.getByRole('button', { name: 'Sposoby nabycia' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Sposoby nabycia' }).click()
  await expect(page.getByRole('heading', { name: 'Sposoby nabycia' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Dom aukcyjny' })).toBeVisible()

  await page.getByPlaceholder('Nazwa').fill('Zakup od kolekcjonera')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Zakup od kolekcjonera' })).toBeVisible()

  const createdRow = page.locator('tr', { hasText: 'Zakup od kolekcjonera' })
  await createdRow.getByRole('button', { name: 'Edytuj' }).click()
  await page.getByPlaceholder('Nazwa').fill('Zakup prywatny')
  await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Zakup prywatny' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Zakup od kolekcjonera' })).toHaveCount(0)

  page.once('dialog', (dialog) => dialog.accept())
  const updatedRow = page.locator('tr', { hasText: 'Zakup prywatny' })
  await updatedRow.getByRole('button', { name: 'Usuń' }).click()
  await expect(page.getByRole('cell', { name: 'Zakup prywatny' })).toHaveCount(0)
})
