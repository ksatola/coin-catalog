import { expect, test } from '@playwright/test'

const dictionaries = {
  countries: [{ id: 1, name: 'Polska' }],
  issuers: [],
  denominations: [{ id: 2, name: '1 grosz' }],
  mints: [],
  materials: [],
  states: [],
  eras: [{ id: 3, name: 'AD' }],
}

const categories = [
  {
    id: 10,
    name: 'Monety',
    description: null,
    parent_ids: [],
    child_ids: [],
    created_at: '',
    updated_at: '',
  },
]

test('dodaje słownik i kategorię bez utraty danych formularza', async ({ page }) => {
  let nextDictionaryId = 100
  let nextCategoryId = 200

  await page.route('**/api/dictionaries/*', async (route) => {
    const url = new URL(route.request().url())
    const name = url.pathname.split('/').pop() ?? ''

    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name: string }
      const item = { id: nextDictionaryId++, name: body.name }

      dictionaries[name as keyof typeof dictionaries].push(item)

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(item),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        dictionaries[name as keyof typeof dictionaries] ?? [],
      ),
    })
  })

  await page.route('**/api/categories', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as {
        name: string
        description: string | null
      }

      const category = {
        id: nextCategoryId++,
        name: body.name,
        description: body.description,
        parent_ids: [],
        child_ids: [],
        created_at: '',
        updated_at: '',
      }

      categories.push(category)

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(category),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(categories),
    })
  })

  await page.goto('/dodaj')

  await page.getByLabel('Rok od').fill('1900')
  await page.getByLabel('Rok do').fill('1901')
  await page.getByLabel('Opis').fill(
    'Dane wpisane przed utworzeniem słownika',
  )

  await page.getByRole('button', { name: 'Dodaj kraj' }).click()
  await page.getByRole('textbox', { name: 'Nowy wpis w kraj' }).fill('Czechy')

  await page
    .getByRole('textbox', { name: 'Nowy wpis w kraj' })
    .locator('xpath=../..')
    .getByRole('button', { name: 'Dodaj', exact: true })
    .click()

  await expect(page.getByLabel('Kraj', { exact: true })).toHaveValue('100')
  await expect(page.getByLabel('Rok od')).toHaveValue('1900')
  await expect(page.getByLabel('Rok do')).toHaveValue('1901')
  await expect(page.getByLabel('Opis')).toHaveValue(
    'Dane wpisane przed utworzeniem słownika',
  )

  await page.getByRole('button', { name: 'Dodaj kategorię' }).click()
  await page.getByLabel('Nazwa nowej kategorii').fill('Kategoria testowa')
  await page.getByRole('button', { name: 'Dodaj' }).last().click()

  const categorySelect = page.getByLabel('Wybierz kategorie')
  const createdCategory = categorySelect.getByRole('option', {
    name: 'Kategoria testowa',
    exact: true,
  })

  await expect(createdCategory).toHaveCount(1)
  await expect(createdCategory).toBeSelected()

  await expect(page.getByLabel('Rok od')).toHaveValue('1900')
  await expect(page.getByLabel('Rok do')).toHaveValue('1901')
  await expect(page.getByLabel('Opis')).toHaveValue(
    'Dane wpisane przed utworzeniem słownika',
  )
})
