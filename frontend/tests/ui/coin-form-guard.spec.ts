import { expect, test, type Page } from '@playwright/test'

const dictionaries = {
  countries: [{ id: 1, name: 'Polska' }],
  issuers: [],
  denominations: [{ id: 2, name: '1 grosz' }],
  mints: [],
  materials: [],
  states: [],
  eras: [{ id: 3, name: 'AD' }],
}

const categories = [{ id: 10, name: 'Monety', description: null, parent_ids: [], child_ids: [], created_at: '', updated_at: '' }]

const coin = {
  id: 1,
  country_id: 1,
  issuer_id: null,
  denomination_id: 2,
  from_year: 1900,
  from_era_id: 3,
  to_year: 1901,
  to_era_id: 3,
  mint_id: null,
  material_id: null,
  state_id: null,
  description: 'Polski grosz',
  weight: null,
  diameter: null,
  has_video: false,
  source: null,
  is_deleted: false,
}

async function mockFormApis(page: Page): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []),
    })
  })

  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) })
  })

  await page.route('**/api/coins/1/images', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.route('**/api/coins/1', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coin) })
  })
}

test.describe('guard niezapisanych zmian formularza monety', () => {
  test('Nowa moneta: nawigacja po zmianie pyta i respektuje anulowanie oraz potwierdzenie', async ({ page }) => {
    await mockFormApis(page)
    await page.goto('/dodaj')
    await page.getByLabel('Opis').fill('Niezapisane dane')

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toContain('Masz niezapisane dane formularza')
      await dialog.dismiss()
    })
    await page.getByRole('link', { name: 'Monety' }).click()
    await expect(page).toHaveURL(/\/dodaj$/)

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })
    await page.getByRole('link', { name: 'Monety' }).click()
    await expect(page).toHaveURL(/\/monety$/)
  })

  test('Nowa moneta: przycisk Anuluj również podlega guardowi', async ({ page }) => {
    await mockFormApis(page)
    await page.goto('/dodaj')
    await page.getByLabel('Opis').fill('Niezapisane dane')

    page.once('dialog', async (dialog) => await dialog.dismiss())
    await page.getByRole('button', { name: 'Anuluj' }).click()
    await expect(page).toHaveURL(/\/dodaj$/)

    page.once('dialog', async (dialog) => await dialog.accept())
    await page.getByRole('button', { name: 'Anuluj' }).click()
    await expect(page).toHaveURL(/\/monety$/)
  })

  test('Edytuj monetę: nawigacja po zmianie pyta i respektuje anulowanie oraz potwierdzenie', async ({ page }) => {
    await mockFormApis(page)
    await page.goto('/monety/1/edytuj')
    await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()
    await page.getByLabel('Opis').fill('Zmieniony opis')

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toContain('Masz niezapisane dane formularza')
      await dialog.dismiss()
    })
    await page.getByRole('link', { name: 'Monety' }).click()
    await expect(page).toHaveURL(/\/monety$/)
  })

  test('Edytuj monetę: przycisk Anuluj podlega guardowi', async ({ page }) => {
    await mockFormApis(page)
    await page.goto('/monety/1/edytuj')
    await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()
    await page.getByLabel('Opis').fill('Zmieniony opis')

    page.once('dialog', async (dialog) => await dialog.dismiss())
    await page.getByRole('button', { name: 'Anuluj' }).click()
    await expect(page).toHaveURL(/\/monety\/1\/edytuj$/)

    page.once('dialog', async (dialog) => await dialog.accept())
    await page.getByRole('button', { name: 'Anuluj' }).click()
    await expect(page).toHaveURL(/\/monety\/1$/)
  })
})
