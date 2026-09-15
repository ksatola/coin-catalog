import { expect, test, type Page } from '@playwright/test'

const dictionaries = { countries: [{ id: 1, name: 'Polska' }], issuers: [], denominations: [], mints: [], materials: [], states: [], eras: [] }
const categories = [{ id: 1, name: 'Monety', description: null, parent_ids: [], child_ids: [], created_at: '', updated_at: '' }]
const coin = { id: 1, country_id: 1, issuer_id: null, denomination_id: 1, from_year: 1900, from_era_id: 1, to_year: 1901, to_era_id: 1, mint_id: null, material_id: null, state_id: null, description: 'Polski grosz', weight: null, diameter: null, has_video: false, source: null, is_deleted: false }

async function mockCatalog(page: Page): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = route.request().url().split('/').pop() ?? ''
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []) })
  })
  await page.route('**/api/categories', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) }))
  await page.route('**/api/coins*', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([coin]) }))
}

async function openAdvancedFilters(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: '⚙ Filtry' })
  if (await toggle.isVisible()) await toggle.click()
}

async function advancedSearch(page: Page): Promise<import('@playwright/test').Locator> {
  return page.getByRole('searchbox', { name: 'Szukaj', exact: true })
}

test('zachowuje filtry Monety po przejściu do Dodaj monetę i z powrotem', async ({ page }) => {
  await mockCatalog(page)
  await page.goto('/monety')
  await openAdvancedFilters(page)
  await (await advancedSearch(page)).fill('polska grosz')
  await page.getByRole('checkbox', { name: 'Uwzględniaj podkategorie' }).uncheck()
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()
  await page.getByRole('link', { name: 'Dodaj monetę' }).click()
  await page.getByRole('link', { name: 'Monety' }).click()
  await openAdvancedFilters(page)
  await expect(await advancedSearch(page)).toHaveValue('polska grosz')
  await expect(page.getByRole('checkbox', { name: 'Uwzględniaj podkategorie' })).not.toBeChecked()
})

test('zachowuje filtry Archiwum po przejściu do Dodaj monetę i z powrotem', async ({ page }) => {
  await mockCatalog(page)
  await page.goto('/archiwum')
  await openAdvancedFilters(page)
  await (await advancedSearch(page)).fill('polska grosz')
  await page.getByRole('checkbox', { name: 'Uwzględniaj podkategorie' }).uncheck()
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()
  await page.getByRole('link', { name: 'Dodaj monetę' }).click()
  await page.getByRole('link', { name: 'Archiwum' }).click()
  await openAdvancedFilters(page)
  await expect(await advancedSearch(page)).toHaveValue('polska grosz')
  await expect(page.getByRole('checkbox', { name: 'Uwzględniaj podkategorie' })).not.toBeChecked()
})
