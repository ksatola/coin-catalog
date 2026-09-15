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
  { id: 1, name: 'Polska', description: 'Monety polskie', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', parent_ids: [], child_ids: [2] },
  { id: 2, name: 'II RP', description: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', parent_ids: [1], child_ids: [] },
  { id: 3, name: 'PRL', description: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', parent_ids: [], child_ids: [] },
  { id: 4, name: 'III RP', description: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', parent_ids: [], child_ids: [] },
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
  while (stack.length) {
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
  const coinCategoryIds = new Set([2])
  let nextId = 5

  await page.route('**/api/categories', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state) })
      return
    }
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name: string; description: string | null }
      const category: Category = {
        id: nextId++, name: body.name.trim(), description: body.description,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', parent_ids: [], child_ids: [],
      }
      state.push(category)
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(category) })
      return
    }
    await route.fallback()
  })

  await page.route('**/api/categories/**', async (route) => {
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
        if (hasPath(state, parentId, childId)) {
          await route.fulfill({ status: 409, body: '' })
          return
        }
        if (!child.parent_ids.includes(parentId)) child.parent_ids.push(parentId)
        if (!parent.child_ids.includes(childId)) parent.child_ids.push(childId)
        await route.fulfill({ status: 201, body: '' })
        return
      }
      if (method === 'DELETE') {
        if (!child.parent_ids.includes(parentId)) {
          await route.fulfill({ status: 404, body: '' })
          return
        }
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
      const body = route.request().postDataJSON() as { name: string; description: string | null }
      category.name = body.name.trim()
      category.description = body.description
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(category) })
      return
    }
    if (method === 'DELETE') {
      if (category.parent_ids.length || category.child_ids.length || coinCategoryIds.has(categoryId)) {
        await route.fulfill({ status: 409, body: '' })
        return
      }
      state.splice(state.indexOf(category), 1)
      await route.fulfill({ status: 204, body: '' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(category) })
  })
}

function categoryButton(page: Page, name: string) {
  return page.locator('.category-menu button').filter({ hasText: name }).first()
}

async function selectCategory(page: Page, name: string): Promise<void> {
  await categoryButton(page, name).click()
  await expect(page.getByRole('heading', { name: 'Edytuj kategorię' })).toBeVisible()
}

async function expectRelations(page: Page, name: string, parents: string, children: string): Promise<void> {
  await selectCategory(page, name)
  const cards = page.locator('.relation-card')
  const parentCard = cards.nth(0)
  const childCard = cards.nth(1)

  if (parents === '—') await expect(parentCard.getByText('Brak rodziców.')).toBeVisible()
  else for (const parent of parents.split(', ')) await expect(parentCard.getByText(parent, { exact: true })).toBeVisible()

  if (children === '—') await expect(childCard.getByText('Brak dzieci.')).toBeVisible()
  else for (const child of children.split(', ')) await expect(childCard.getByText(child, { exact: true })).toBeVisible()
}

test('widok kategorii pokazuje relacje rodziców i dzieci dla wszystkich kategorii', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await expectRelations(page, 'Polska', '—', 'II RP')
  await expectRelations(page, 'II RP', 'Polska', '—')
  await expectRelations(page, 'PRL', '—', '—')
  await expectRelations(page, 'III RP', '—', '—')
})

test('widok kategorii pozwala wybrać istniejącą kategorię i edytować jej dane', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await selectCategory(page, 'Polska')
  await expect(page.getByLabel('Nazwa')).toHaveValue('Polska')
})

test('utworzenie kategorii zapisuje nazwę i opis', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await page.getByRole('button', { name: 'Nowa kategoria', exact: true }).click()
  await page.getByLabel('Nazwa').fill('Monety obiegowe')
  await page.getByLabel('Opis').fill('Monety przeznaczone do obiegu')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(categoryButton(page, 'Monety obiegowe')).toBeVisible()
  await expectRelations(page, 'Monety obiegowe', '—', '—')
})

test('utworzenie kategorii pozwala od razu przypisać wielu rodziców', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await page.getByRole('button', { name: 'Nowa kategoria', exact: true }).click()
  await page.getByLabel('Nazwa').fill('Monety okolicznościowe')
  await page.getByLabel('Wybierz rodziców').selectOption(['1', '3'])
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expectRelations(page, 'Monety okolicznościowe', 'Polska, PRL', '—')
  await expectRelations(page, 'Polska', '—', 'II RP, Monety okolicznościowe')
  await expectRelations(page, 'PRL', '—', 'Monety okolicznościowe')
})

test('pusta lub biała nazwa kategorii nie jest zapisywana', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await page.getByRole('button', { name: 'Nowa kategoria', exact: true }).click()
  await page.getByLabel('Nazwa').fill('   ')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(page.getByText('Nazwa nie może być pusta.')).toBeVisible()
})

test('edycja kategorii aktualizuje nazwę i opis', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await selectCategory(page, 'PRL')
  await page.getByLabel('Nazwa').fill('PRL - monety')
  await page.getByLabel('Opis').fill('Monety okresu PRL')
  await page.getByRole('button', { name: 'Zapisz' }).click()
  await expect(categoryButton(page, 'PRL - monety')).toBeVisible()
})

test('anulowanie edycji wraca do formularza nowej kategorii', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await selectCategory(page, 'Polska')
  await page.getByRole('button', { name: 'Anuluj' }).click()
  await expect(page.getByRole('heading', { name: 'Nowa kategoria' })).toBeVisible()
  await expect(page.getByLabel('Nazwa')).toHaveValue('')
})

test('istniejąca kategoria pozwala przypisać wielu rodziców', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await selectCategory(page, 'Polska')
  await page.locator('.relation-controls select').nth(0).selectOption(['3', '4'])
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()
  await expectRelations(page, 'Polska', 'PRL, III RP', 'II RP')
  await expectRelations(page, 'PRL', '—', 'Polska')
  await expectRelations(page, 'III RP', '—', 'Polska')
})

test('istniejąca kategoria pozwala przypisać wielu dzieci', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await selectCategory(page, 'Polska')
  await page.locator('.relation-controls select').nth(1).selectOption(['3', '4'])
  await page.getByRole('button', { name: 'Dodaj dzieci' }).click()
  await expectRelations(page, 'Polska', '—', 'II RP, PRL, III RP')
  await expectRelations(page, 'PRL', 'Polska', '—')
  await expectRelations(page, 'III RP', 'Polska', '—')
})

test('usunięcie rodzica aktualizuje relacje w widoku kategorii', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await selectCategory(page, 'II RP')
  await page.locator('.relation-card').nth(0).locator('.relation-item').filter({ hasText: 'Polska' }).getByRole('button', { name: 'Usuń', exact: true }).click()
  await expectRelations(page, 'II RP', '—', '—')
  await expectRelations(page, 'Polska', '—', 'II RP')
})

test('usunięcie dziecka aktualizuje relacje w widoku kategorii', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await selectCategory(page, 'Polska')
  await page.locator('.relation-card').nth(1).locator('.relation-item').filter({ hasText: 'II RP' }).getByRole('button', { name: 'Usuń', exact: true }).click()
  await expectRelations(page, 'Polska', '—', '—')
  await expectRelations(page, 'II RP', '—', '—')
})

test('utworzenie relacji pośrednio tworzącej cykl jest odrzucane przez aplikację', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await selectCategory(page, 'Polska')
  await page.locator('.relation-controls select').nth(0).selectOption('3')
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()
  await selectCategory(page, 'PRL')
  await page.locator('.relation-controls select').nth(0).selectOption('4')
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()
  await selectCategory(page, 'Polska')
  await page.locator('.relation-controls select').nth(0).selectOption('4')
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/categories/1/parents/4') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()
  await expect((await responsePromise).status()).toBe(409)
  await expect(page.getByText('Nie można dodać rodzica, ponieważ relacja utworzyłaby cykl.')).toBeVisible()
})

test('kategoria posiadająca relacje nie może zostać usunięta', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await selectCategory(page, 'Polska')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Usuń kategorię' }).click()
  await expect(page.getByText('Nie można usunąć kategorii, ponieważ jest używana.')).toBeVisible()
  await expect(categoryButton(page, 'Polska')).toBeVisible()
})

test('kategoria przypisana do monety nie może zostać usunięta', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await selectCategory(page, 'II RP')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Usuń kategorię' }).click()
  await expect(page.getByText('Nie można usunąć kategorii, ponieważ jest używana.')).toBeVisible()
  await expect(categoryButton(page, 'II RP')).toBeVisible()
})
