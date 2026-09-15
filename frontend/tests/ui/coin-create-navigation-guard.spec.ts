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
  { id: 10, name: 'Monety', description: null, parent_ids: [], child_ids: [], created_at: '', updated_at: '' },
]

async function mockCreateView(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []),
    })
  })

  await page.route('**/api/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(categories),
    })
  })
}

test('niezmieniony formularz dodawania monety nie pyta przy nawigacji', async ({ page }) => {
  await mockCreateView(page)
  let dialogCount = 0
  page.on('dialog', async (dialog) => {
    dialogCount += 1
    await dialog.dismiss()
  })

  await page.goto('/dodaj')
  await page.getByRole('link', { name: 'Monety' }).click()

  await expect(page).toHaveURL('/monety')
  expect(dialogCount).toBe(0)
})

test('odrzucenie potwierdzenia pozostawia dane formularza dodawania monety', async ({ page }) => {
  await mockCreateView(page)
  let dialogMessage = ''

  page.once('dialog', async (dialog) => {
    dialogMessage = dialog.message()
    await dialog.dismiss()
  })

  await page.goto('/dodaj')
  await page.getByLabel('Opis').fill('Niezapisane dane')
  await page.getByRole('link', { name: 'Monety' }).click()

  await expect(page).toHaveURL('/dodaj')
  await expect(page.getByLabel('Opis')).toHaveValue('Niezapisane dane')
  expect(dialogMessage).toBe('Masz niezapisane dane formularza. Czy na pewno chcesz opuścić stronę i je utracić?')
})

test('potwierdzenie opuszczenia usuwa niezapisany formularz i pozwala nawigować', async ({ page }) => {
  await mockCreateView(page)
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm')
    await dialog.accept()
  })

  await page.goto('/dodaj')
  await page.getByLabel('Opis').fill('Dane do utraty')
  await page.getByRole('link', { name: 'Monety' }).click()

  await expect(page).toHaveURL('/monety')
  await page.getByRole('link', { name: 'Dodaj monetę' }).click()
  await expect(page).toHaveURL('/dodaj')
  await expect(page.getByLabel('Opis')).toHaveValue('')
})
