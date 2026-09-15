import { expect, test, type Page } from '@playwright/test'

type Category = {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
  parent_ids: number[]
  child_ids: number[]
}

const initialCategories: Category[] = [
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
  {
    id: 3,
    name: 'PRL',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    parent_ids: [],
    child_ids: [],
  },
  {
    id: 4,
    name: 'III RP',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    parent_ids: [],
    child_ids: [],
  },
]

function cloneCategories(): Category[] {
  return initialCategories.map((category) => ({
    ...category,
    parent_ids: [...category.parent_ids],
    child_ids: [...category.child_ids],
  }))
}

function hasPath(state: Category[], fromId: number, toId: number): boolean {
  const visited = new Set<number>()
  const stack = [fromId]

  while (stack.length > 0) {
    const currentId = stack.pop()!
    if (currentId === toId) return true
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const current = state.find((category) => category.id === currentId)
    if (current) stack.push(...current.child_ids)
  }

  return false
}

async function mockCategoryApi(page: Page): Promise<void> {
  const state = cloneCategories()
  let nextId = 5

  await page.route('**/api/categories', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(state),
      })
      return
    }

    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as {
        name: string
        description: string | null
      }
      const category: Category = {
        id: nextId++,
        name: body.name,
        description: body.description,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        parent_ids: [],
        child_ids: [],
      }
      state.push(category)
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(category),
      })
      return
    }

    await route.continue()
  })

  await page.route('**/api/categories/*', async (route) => {
    const method = route.request().method()
    const parts = new URL(route.request().url()).pathname.split('/').filter(Boolean)

    if (parts.length === 5 && parts[3] === 'parents') {
      const childId = Number(parts[2])
      const parentId = Number(parts[4])
      const child = state.find((category) => category.id === childId)
      const parent = state.find((category) => category.id === parentId)

      if (!child || !parent) {
        await route.fulfill({ status: 404, body: '' })
        return
      }

      if (method === 'POST') {
        if (childId === parentId || hasPath(state, childId, parentId)) {
          await route.fulfill({ status: 409, body: '' })
          return
        }
        if (!child.parent_ids.includes(parentId)) child.parent_ids.push(parentId)
        if (!parent.child_ids.includes(childId)) parent.child_ids.push(childId)
        await route.fulfill({ status: 201, body: '' })
        return
      }

      if (method === 'DELETE') {
        child.parent_ids = child.parent_ids.filter((id) => id !== parentId)
        parent.child_ids = parent.child_ids.filter((id) => id !== childId)
        await route.fulfill({ status: 204, body: '' })
        return
      }
    }

    const categoryId = Number(parts[2])
    const category = state.find((item) => item.id === categoryId)

    if (!category) {
      await route.fulfill({ status: 404, body: '' })
      return
    }

    if (method === 'PUT') {
      const body = route.request().postDataJSON() as {
        name: string
        description: string | null
      }
      category.name = body.name
      category.description = body.description
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(category),
      })
      return
    }

    if (method === 'DELETE') {
      if (categoryId === 2 || category.parent_ids.length > 0 || category.child_ids.length > 0) {
        await route.fulfill({ status: 409, body: '' })
        return
      }
      state.splice(state.indexOf(category), 1)
      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(category),
    })
  })
}

function categoryItem(page: Page, name: string) {
  return page
    .locator('.category-list li')
    .filter({ has: page.getByRole('button', { name, exact: true }) })
}

test('widok kategorii pokazuje relacje rodziców i dzieci dla wszystkich kategorii', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')

  await expect(categoryItem(page, 'Polska')).toContainText('Parents: —')
  await expect(categoryItem(page, 'Polska')).toContainText('Children: II RP')
  await expect(categoryItem(page, 'II RP')).toContainText('Parents: Polska')
  await expect(categoryItem(page, 'II RP')).toContainText('Children: —')
  await expect(categoryItem(page, 'PRL')).toContainText('Parents: —')
  await expect(categoryItem(page, 'PRL')).toContainText('Children: —')
  await expect(categoryItem(page, 'III RP')).toContainText('Parents: —')
  await expect(categoryItem(page, 'III RP')).toContainText('Children: —')
})

test('widok kategorii pozwala wybrać istniejącą kategorię i edytować jej dane', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')

  await expect(page.getByRole('heading', { name: 'Kategorie' })).toBeVisible()
  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edytuj kategorię' })).toBeVisible()
  await expect(page.getByLabel('Nazwa')).toHaveValue('Polska')
})

test('utworzenie kategorii zapisuje nazwę i opis', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await page.getByRole('button', { name: '+ Nowa kategoria' }).click()

  await page.getByLabel('Nazwa').fill('Monety obiegowe')
  await page.getByLabel('Opis').fill('Monety przeznaczone do obiegu')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()

  const created = categoryItem(page, 'Monety obiegowe')
  await expect(created).toBeVisible()
  await expect(created).toContainText('Parents: —')
  await expect(created).toContainText('Children: —')
})

test('utworzenie kategorii pozwala od razu przypisać wielu rodziców', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await page.getByRole('button', { name: '+ Nowa kategoria' }).click()

  await page.getByLabel('Nazwa').fill('Monety okolicznościowe')
  await page.getByLabel('Wybierz rodziców').selectOption(['1', '3'])
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()

  const created = categoryItem(page, 'Monety okolicznościowe')
  await expect(created).toContainText('Parents: Polska, PRL')
  await expect(categoryItem(page, 'Polska')).toContainText('Children: II RP, Monety okolicznościowe')
  await expect(categoryItem(page, 'PRL')).toContainText('Children: Monety okolicznościowe')
})

test('pusta nazwa kategorii jest odrzucana przez walidację formularza', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await page.getByRole('button', { name: '+ Nowa kategoria' }).click()

  await expect(page.getByLabel('Nazwa')).toHaveAttribute('required', '')
  await expect(categoryItem(page, 'Monety obiegowe')).not.toBeVisible()
})

test('edycja kategorii aktualizuje nazwę i opis', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'PRL').getByRole('button', { name: 'PRL', exact: true }).click()

  await page.getByLabel('Nazwa').fill('PRL - monety')
  await page.getByLabel('Opis').fill('Monety okresu PRL')
  await page.getByRole('button', { name: 'Zapisz' }).click()

  await expect(categoryItem(page, 'PRL - monety')).toBeVisible()
})

test('anulowanie edycji wraca do formularza nowej kategorii', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()
  await page.getByRole('button', { name: 'Anuluj' }).click()

  await expect(page.getByRole('heading', { name: 'Nowa kategoria' })).toBeVisible()
  await expect(page.getByLabel('Nazwa')).toHaveValue('')
})

test('istniejąca kategoria pozwala przypisać wielu rodziców', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()

  const parentSelect = page.locator('.relation-controls select').nth(0)
  await parentSelect.selectOption(['3', '4'])
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()

  await expect(categoryItem(page, 'Polska')).toContainText('Parents: PRL, III RP')
  await expect(categoryItem(page, 'PRL')).toContainText('Children: Polska')
  await expect(categoryItem(page, 'III RP')).toContainText('Children: Polska')
})

test('istniejąca kategoria pozwala przypisać wielu dzieci', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()

  const childSelect = page.locator('.relation-controls select').nth(1)
  await childSelect.selectOption(['3', '4'])
  await page.getByRole('button', { name: 'Dodaj dzieci' }).click()

  await expect(categoryItem(page, 'Polska')).toContainText('Children: II RP, PRL, III RP')
  await expect(categoryItem(page, 'PRL')).toContainText('Parents: Polska')
  await expect(categoryItem(page, 'III RP')).toContainText('Parents: Polska')
})

test('usunięcie rodzica aktualizuje relacje w widoku kategorii', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'II RP').getByRole('button', { name: 'II RP', exact: true }).click()

  await page.locator('.editor li').filter({ hasText: 'Polska' }).getByRole('button', { name: 'Usuń' }).click()
  await expect(categoryItem(page, 'II RP')).toContainText('Parents: —')
  await expect(categoryItem(page, 'Polska')).toContainText('Children: —')
})

test('usunięcie dziecka aktualizuje relacje w widoku kategorii', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()

  const childRelation = page.locator('.editor li').filter({ hasText: 'II RP' })
  await childRelation.getByRole('button', { name: 'Usuń' }).click()

  await expect(categoryItem(page, 'Polska')).toContainText('Children: —')
  await expect(categoryItem(page, 'II RP')).toContainText('Parents: —')
})

test('próba utworzenia cyklu pokazuje błąd i nie zapisuje relacji', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')

  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()
  const parentSelect = page.locator('.relation-controls select').nth(0)
  await parentSelect.selectOption('3')
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()

  await categoryItem(page, 'PRL').getByRole('button', { name: 'PRL', exact: true }).click()
  await expect(page.getByText('Nie można dodać rodzica, ponieważ relacja utworzyłaby cykl.')).not.toBeVisible()

  const prlParentSelect = page.locator('.relation-controls select').nth(0)
  await prlParentSelect.selectOption('1')
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()

  await expect(page.getByText('Nie można dodać rodzica, ponieważ relacja utworzyłaby cykl.')).toBeVisible()
  await expect(categoryItem(page, 'PRL')).toContainText('Parents: Polska')
})

test('kategoria posiadająca relacje nie może zostać usunięta', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()

  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Usuń' }).last().click()

  await expect(page.getByText('Nie można usunąć kategorii, ponieważ jest używana.')).toBeVisible()
  await expect(categoryItem(page, 'Polska')).toBeVisible()
})

test('kategoria używana przez monetę nie może zostać usunięta', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'II RP').getByRole('button', { name: 'II RP', exact: true }).click()

  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Usuń' }).last().click()

  await expect(page.getByText('Nie można usunąć kategorii, ponieważ jest używana.')).toBeVisible()
  await expect(categoryItem(page, 'II RP')).toBeVisible()
})
