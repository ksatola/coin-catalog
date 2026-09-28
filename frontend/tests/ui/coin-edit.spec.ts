import { expect, test } from '@playwright/test'

const dictionaries = {
  countries: [{ id: 1, name: 'Kraj testowy A' }, { id: 2, name: 'Kraj testowy B' }],
  issuers: [{ id: 1, name: 'Emitent testowy' }],
  denominations: [{ id: 1, name: 'Nominał testowy' }],
  mints: [{ id: 1, name: 'Mennica testowa' }],
  materials: [],
  states: [{ id: 1, name: 'Stan testowy' }],
  eras: [{ id: 1, name: 'Era testowa' }],
  acquisition_methods: [{ id: 1, name: 'Dom Aukcyjny Testowy' }],
}

const collections = [
  { id: 1, name: 'Kolekcja 1', description: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
  { id: 2, name: 'Kolekcja 2', description: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
]

const categories = [
  { id: 1, name: 'Kategoria 1', description: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
  { id: 2, name: 'Kategoria 2', description: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
]

const coin = {
  id: 1,
  country_id: 1,
  issuer_id: 1,
  denomination_id: 1,
  from_year: 2000,
  from_era_id: 1,
  to_year: 2000,
  to_era_id: 1,
  mint_id: 1,
  material_id: null,
  state_id: 1,
  description: 'Opis monety',
  avers_description: 'Opis awersu',
  revers_description: 'Opis rewersu',
  literature: 'Literatura testowa',
  acquisition_method_id: 1,
  acquisition_method_text: null,
  purchase_price: 250,
  purchase_date: '2026-09-28',
  weight: null,
  diameter: null,
  collection_number: '1',
  source: 'https://example.com/moneta',
  has_video: false,
  archived: false,
  collection_id: 1,
}

const movedCoin = { ...coin, id: 2, collection_id: 2 }

const coinImages = [
  { id: 1, coin_id: 1, filename: 'avers.jpg', kind: 'avers', sort_order: 0, file_size_bytes: 1000, created_at: '2026-01-01T00:00:00' },
  { id: 2, coin_id: 1, filename: 'rewers.jpg', kind: 'rewers', sort_order: 0, file_size_bytes: 1000, created_at: '2026-01-01T00:00:00' },
]

const movedCoinImages = coinImages.map((image) => ({ ...image, coin_id: 2 }))

async function mockCoinEditApi(page: Parameters<typeof test>[0]['page']): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() as keyof typeof dictionaries
    await route.fulfill({ json: dictionaries[name] ?? [] })
  })
  await page.route('**/api/categories*', async (route) => await route.fulfill({ json: [] }))
  await page.route('**/api/collections', async (route) => await route.fulfill({ json: collections }))
  await page.route('**/api/coins/1/images', async (route) => await route.fulfill({ json: coinImages }))
  await page.route('**/api/coins/2/images', async (route) => await route.fulfill({ json: movedCoinImages }))
  await page.route('**/api/coins/1', async (route) => await route.fulfill({ json: coin }))
  await page.route('**/api/coins/2', async (route) => await route.fulfill({ json: movedCoin }))
  await page.route('**/api/coins/1/move', async (route) => await route.fulfill({ json: movedCoin }))
}

test('zmiana kolekcji zapisuje się niezależnie od danych monety', async ({ page }) => {
  await mockCoinEditApi(page)
  let coinUpdateCount = 0
  let moveRequestCount = 0
  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'PUT') coinUpdateCount += 1
    await route.fulfill({ json: coin })
  })
  await page.route('**/api/coins/1/move', async (route) => {
    moveRequestCount += 1
    await route.fulfill({ json: movedCoin })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Kolekcja').selectOption('2')
  await page.getByRole('button', { name: 'Zapisz kolekcję' }).click()

  await expect.poll(() => moveRequestCount).toBe(1)
  expect(coinUpdateCount).toBe(0)
  await expect(page.getByLabel('Kolekcja')).toHaveValue('2')
})

test('zapis kolekcji nie ostrzega przy anulowaniu bez zmian danych monety', async ({ page }) => {
  await mockCoinEditApi(page)
  let dialogCount = 0
  page.on('dialog', async (dialog) => {
    dialogCount += 1
    await dialog.dismiss()
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Kolekcja').selectOption('2')
  await page.getByRole('button', { name: 'Zapisz kolekcję' }).click()
  await expect(page.getByLabel('Kolekcja')).toHaveValue('2')
  await page.getByRole('button', { name: 'Anuluj' }).click()

  await expect(page).toHaveURL('/monety/2')
  expect(dialogCount).toBe(0)
})

test('zapis danych monety nie wykonuje move', async ({ page }) => {
  await mockCoinEditApi(page)
  let moveRequestCount = 0
  await page.route('**/api/coins/1/move', async (route) => {
    moveRequestCount += 1
    await route.fulfill({ json: movedCoin })
  })
  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'PUT') await route.fulfill({ json: coin })
    else await route.fulfill({ json: coin })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Opis').fill('Nowy opis')
  await page.getByRole('textbox', { name: 'Awers' }).fill('Nowy opis awersu')
  await page.getByRole('textbox', { name: 'Rewers' }).fill('Nowy opis rewersu')
  await page.getByRole('textbox', { name: 'Literatura' }).fill('Nowa literatura')
  await page.getByLabel('Wartość ze słownika').selectOption('1')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

  await expect(page).toHaveURL('/monety/1')
  expect(moveRequestCount).toBe(0)
})

test('zapisuje dane zakupu', async ({ page }) => {
  await mockCoinEditApi(page)
  let updatePayload: Record<string, unknown> | null = null
  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'PUT') {
      updatePayload = route.request().postDataJSON() as Record<string, unknown>
    }
    await route.fulfill({ json: coin })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Cena zakupu').fill('175.50')
  await expect(page.getByRole('button', { name: 'Otwórz kalendarz daty zakupu' })).toBeVisible()
  await page.getByLabel('Data zakupu').getByRole('textbox').fill('2026-09-27')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

  await expect.poll(() => updatePayload).toMatchObject({
    purchase_price: 175.5,
    purchase_date: '2026-09-27',
  })
})

test('waliduje ręcznie wpisaną datę zakupu', async ({ page }) => {
  await mockCoinEditApi(page)
  let updatePayload: Record<string, unknown> | null = null
  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'PUT') {
      updatePayload = route.request().postDataJSON() as Record<string, unknown>
    }
    await route.fulfill({ json: coin })
  })

  await page.goto('/monety/1/edytuj')
  const dateInput = page.getByLabel('Data zakupu').getByRole('textbox')
  await dateInput.fill('2026-02-29')
  await expect(page.getByText('Data zakupu musi mieć format YYYY-MM-DD i być poprawną datą.')).toBeVisible()
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

  expect(updatePayload).toBeNull()
  await expect(page.getByText('Popraw datę zakupu.')).toBeVisible()

  await dateInput.fill('2026-09-27')
  await expect(page.getByText('Data zakupu musi mieć format YYYY-MM-DD i być poprawną datą.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

  await expect.poll(() => updatePayload).toMatchObject({
    purchase_date: '2026-09-27',
  })
})

test('zapisuje własny tekst sposobu nabycia', async ({ page }) => {
  await mockCoinEditApi(page)
  let updatePayload: Record<string, unknown> | null = null
  await page.route('**/api/coins/1', async (route) => {
    if (route.request().method() === 'PUT') {
      updatePayload = route.request().postDataJSON() as Record<string, unknown>
    }
    await route.fulfill({ json: coin })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByRole('textbox', { name: 'Własny tekst' }).fill('Zakup od prywatnego kolekcjonera')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

  await expect.poll(() => updatePayload).toMatchObject({
    acquisition_method_id: null,
    acquisition_method_text: 'Zakup od prywatnego kolekcjonera',
  })
})

test('dodaje nowy sposób nabycia do słownika', async ({ page }) => {
  await mockCoinEditApi(page)
  let createdPayload: Record<string, unknown> | null = null
  await page.route('**/api/dictionaries/acquisition_methods', async (route) => {
    if (route.request().method() === 'POST') {
      createdPayload = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 201, json: { id: 2, name: 'Nowy dom aukcyjny' } })
      return
    }
    await route.fulfill({ json: dictionaries.acquisition_methods })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByRole('button', { name: 'Dodaj sposób nabycia' }).click()
  await page.getByLabel('Nowy wpis w sposób nabycia').fill('Nowy dom aukcyjny')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()

  await expect.poll(() => createdPayload).toEqual({ name: 'Nowy dom aukcyjny' })
  await expect(page.getByLabel('Wartość ze słownika')).toHaveValue('2')
})

test('odczytuje dane zakupu w szczegółach monety', async ({ page }) => {
  await mockCoinEditApi(page)
  await page.goto('/monety/1')
  await expect(page.getByText('250.00')).toBeVisible()
  await expect(page.getByText('2026-09-28')).toBeVisible()
})

test('read-only wyświetla komplet nowych danych monety', async ({ page }) => {
  await mockCoinEditApi(page)
  await page.goto('/monety/1')

  await expect(page.getByText('Opis awersu')).toBeVisible()
  await expect(page.getByText('Opis rewersu')).toBeVisible()
  await expect(page.getByText('Literatura testowa')).toBeVisible()
  await expect(page.getByRole('link', { name: 'https://example.com/moneta' })).toBeVisible()
  await expect(page.getByText('Dom Aukcyjny Testowy')).toBeVisible()

  const information = page.getByRole('heading', { name: 'Informacje' }).locator('..')
  await expect(information.getByText('Kolekcja 1')).toBeVisible()
  await expect(information.getByText('Kraj testowy A')).toBeVisible()
  await expect(information.getByText('Emitent testowy')).toBeVisible()
  await expect(information.getByText('Mennica testowa')).toBeVisible()
  await expect(information.getByText('Nominał testowy')).toBeVisible()
  await expect(information.getByText('2000 Era testowa – 2000 Era testowa')).toBeVisible()
  await expect(information.getByText('Stan testowy')).toBeVisible()

  const rows = information.locator('.details-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0).locator('.detail-item')).toHaveCount(4)
  await expect(rows.nth(1).locator('.detail-item')).toHaveCount(6)
  await expect(rows.nth(0).locator('.detail-item-issuer-wide')).toHaveCSS('grid-column', 'span 3')
})

test('pozwala zapisać monetę bez datowania', async ({ page }) => {
  await mockCoinEditApi(page)
  const undatedCoin = { ...coin, from_year: null, from_era_id: null, to_year: null, to_era_id: null }
  await page.route('**/api/coins/1', async (route) => {
    await route.fulfill({ json: route.request().method() === 'PUT' ? undatedCoin : undatedCoin })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByRole('textbox', { name: 'Opis' }).fill('Moneta bez datowania')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

  await expect(page).toHaveURL('/monety/1')
})

test('po przeniesieniu kolekcji zapis danych używa nowego id monety', async ({ page }) => {
  await mockCoinEditApi(page)
  let movedCoinUpdate: Record<string, unknown> | null = null
  await page.route('**/api/coins/1/move', async (route) => await route.fulfill({ json: movedCoin }))
  await page.route('**/api/coins/2', async (route) => {
    if (route.request().method() === 'PUT') {
      movedCoinUpdate = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ json: movedCoin })
      return
    }
    await route.fulfill({ json: movedCoin })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Kolekcja').selectOption('2')
  await page.getByRole('button', { name: 'Zapisz kolekcję' }).click()
  await page.getByLabel('Opis').fill('Nowy opis')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

  await expect(page).toHaveURL('/monety/2')
  expect(movedCoinUpdate).toMatchObject({ country_id: 1, collection_id: 2, description: 'Nowy opis' })
})

test('tworzy kolekcję z edycji monety i zapisuje jej przypisanie', async ({ page }) => {
  await mockCoinEditApi(page)

  let createdCollectionRequest: Record<string, unknown> | null = null
  let moveRequest: Record<string, unknown> | null = null

  await page.route('**/api/collections', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({ json: collections })
      return
    }

    createdCollectionRequest = route.request().postDataJSON() as Record<string, unknown>

    await route.fulfill({
      status: 201,
      json: {
        id: 3,
        name: 'Nowa kolekcja',
        description: 'Nowy opis',
        created_at: '2026-09-18T00:00:00',
        updated_at: '2026-09-18T00:00:00',
      },
    })
  })

  await page.route('**/api/coins/1/move', async (route) => {
    moveRequest = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ json: { ...movedCoin, collection_id: 3 } })
  })

  await page.goto('/monety/1/edytuj')

  await page.getByRole('button', { name: 'Dodaj kolekcję' }).click()
  await page.getByLabel('Nazwa nowej kolekcji').fill('Nowa kolekcja')
  await page.locator('.editor').getByLabel('Opis').fill('Nowy opis')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()

  await expect(page.getByLabel('Kolekcja')).toHaveValue('3')
  expect(createdCollectionRequest).toEqual({
    name: 'Nowa kolekcja',
    description: 'Nowy opis',
  })

  await page.getByRole('button', { name: 'Zapisz kolekcję' }).click()

  await expect.poll(() => moveRequest).toEqual({
    target_collection_id: 3,
  })
  await expect(page.getByLabel('Kolekcja')).toHaveValue('3')
})

test('zapisuje wybraną istniejącą kategorię z edycji monety', async ({ page }) => {
  await mockCoinEditApi(page)

  let assignedCategoryIds: number[] = []
  let attachRequestCount = 0

  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ json: categories })
  })
  await page.route('**/api/coins/1/categories', async (route) => {
    await route.fulfill({
      json: categories.filter((category) => assignedCategoryIds.includes(category.id)),
    })
  })
  await page.route('**/api/coins/1/categories/2', async (route) => {
    if (route.request().method() === 'POST') {
      attachRequestCount += 1
      assignedCategoryIds = [2]
      await route.fulfill({ json: categories[1] })
      return
    }
  })

  await page.goto('/monety/1/edytuj')
  await page.getByLabel('Wybierz kategorie').selectOption('2')
  await page.getByRole('button', { name: 'Zapisz kategorię' }).click()

  await expect.poll(() => attachRequestCount).toBe(1)
  await expect(page.getByText('Kategoria 2')).toBeVisible()
})

test('tworzy kategorię z edycji monety i przypisuje ją do monety', async ({ page }) => {
  await mockCoinEditApi(page)

  let createdCategoryRequest: Record<string, unknown> | null = null
  let attachRequestCount = 0
  const createdCategory = {
    id: 3,
    name: 'Nowa kategoria',
    description: 'Nowy opis',
    created_at: '2026-09-18T00:00:00',
    updated_at: '2026-09-18T00:00:00',
  }
  let assignedCategoryIds: number[] = []

  await page.route('**/api/categories', async (route) => {
    if (route.request().method() === 'POST') {
      createdCategoryRequest = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 201, json: createdCategory })
      return
    }

    await route.fulfill({
      json: [...categories, ...(assignedCategoryIds.includes(3) ? [createdCategory] : [])],
    })
  })
  await page.route('**/api/coins/1/categories', async (route) => {
    await route.fulfill({
      json: assignedCategoryIds.map((categoryId) =>
        categoryId === 3 ? createdCategory : categories.find((category) => category.id === categoryId),
      ).filter(Boolean),
    })
  })
  await page.route('**/api/coins/1/categories/3', async (route) => {
    attachRequestCount += 1
    assignedCategoryIds = [3]
    await route.fulfill({ json: createdCategory })
  })

  await page.goto('/monety/1/edytuj')
  await page.getByRole('button', { name: 'Dodaj kategorię' }).click()
  await page.getByLabel('Nazwa nowej kategorii').fill('Nowa kategoria')
  await page.locator('.editor').getByLabel('Opis').fill('Nowy opis')
  await page.locator('.editor').getByRole('button', { name: 'Dodaj', exact: true }).click()

  await expect.poll(() => createdCategoryRequest).toEqual({
    name: 'Nowa kategoria',
    description: 'Nowy opis',
  })
  await expect.poll(() => attachRequestCount).toBe(1)
  await expect(page.getByText('Nowa kategoria')).toBeVisible()
})
