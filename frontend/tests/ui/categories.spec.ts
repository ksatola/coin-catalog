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
  let categoryCreateRequests = 0

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
      categoryCreateRequests += 1
      const body = route.request().postDataJSON() as {
        name: string
        description: string | null
      }
      const category: Category = {
        id: nextId++,
        name: body.name.trim(),
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
        if (hasPath(state, childId, parentId)) {
          await route.fulfill({ status: 409, body: '' })
          return
        }
        if (!child.parent_ids.includes(parentId)) child.parent_ids.push(parentId)
        if (!parent.child_ids.includes(childId)) parent.child_ids.push(childId)
        await route.fulfill({ status: 201, body: '' })
        return
      }

      if (method === 'DELETE') {
        const relationExists = child.parent_ids.includes(parentId)
        if (!relationExists) {
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
      const body = route.request().postDataJSON() as {
        name: string
        description: string | null
      }
      category.name = body.name.trim()
      category.description = body.description
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(category),
      })
      return
    }

    if (method === 'DELETE') {
      const hasRelations = category.parent_ids.length > 0 || category.child_ids.length > 0
      const isUsedByCoin = coinCategoryIds.has(categoryId)
      if (hasRelations || isUsedByCoin) {
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

  await page.route('**/api/categories', async (route) => {
    if (route.request().method() === 'POST') {
      categoryCreateRequests += 1
    }
    await route.fallback()
  })

  await page.addInitScript(() => {
    Object.defineProperty(window, '__categoryCreateRequests', {
      configurable: true,
      get: () => undefined,
    })
  })

  void categoryCreateRequests
}

function categoryItem(page: Page, name: string) {
  return page.locator('.category-list li').filter({
    has: page.getByRole('button', { name, exact: true }),
  })
}

function relationLine(page: Page, name: string, index: number) {
  return categoryItem(page, name).locator('.category-relations > div').nth(index)
}

async function expectRelations(
  page: Page,
  name: string,
  parents: string,
  children: string,
): Promise<void> {
  await expect(relationLine(page, name, 0)).toHaveText(`Parents:${parents}`)
  await expect(relationLine(page, name, 1)).toHaveText(`Children:${children}`)
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
  await expect(categoryItem(page, 'Monety obiegowe')).toBeVisible()
  await expectRelations(page, 'Monety obiegowe', '—', '—')
})

test('utworzenie kategorii pozwala od razu przypisać wielu rodziców', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await page.getByRole('button', { name: '+ Nowa kategoria' }).click()
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
  await page.getByRole('button', { name: '+ Nowa kategoria' }).click()
  await page.getByLabel('Nazwa').fill('   ')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(page.getByText('Nazwa nie może być pusta.')).toBeVisible()
  await expect(categoryItem(page, '   ')).not.toBeVisible()
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
  await page.locator('.relation-controls select').nth(0).selectOption(['3', '4'])
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()
  await expectRelations(page, 'Polska', 'PRL, III RP', 'II RP')
  await expectRelations(page, 'PRL', '—', 'Polska')
  await expectRelations(page, 'III RP', '—', 'Polska')
})

test('istniejąca kategoria pozwala przypisać wielu dzieci', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()
  await page.locator('.relation-controls select').nth(1).selectOption(['3', '4'])
  await page.getByRole('button', { name: 'Dodaj dzieci' }).click()
  await expectRelations(page, 'Polska', '—', 'II RP, PRL, III RP')
  await expectRelations(page, 'PRL', 'Polska', '—')
  await expectRelations(page, 'III RP', 'Polska', '—')
})

test('usunięcie rodzica aktualizuje relacje w widoku kategorii', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'II RP').getByRole('button', { name: 'II RP', exact: true }).click()
  await page.locator('.editor li').filter({ hasText: 'Polska' }).getByRole('button', { name: 'Usuń', exact: true }).click()
  await expectRelations(page, 'II RP', '—', '—')
  await expectRelations(page, 'Polska', '—', '—')
})

test('usunięcie dziecka aktualizuje relacje w widoku kategorii', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()
  await page.locator('.editor li').filter({ hasText: 'II RP' }).getByRole('button', { name: 'Usuń', exact: true }).click()
  await expectRelations(page, 'Polska', '—', '—')
  await expectRelations(page, 'II RP', '—', '—')
})

test('utworzenie relacji pośrednio tworzącej cykl jest odrzucane', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')

  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()
  await page.locator('.relation-controls select').nth(0).selectOption('3')
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()

  await categoryItem(page, 'PRL').getByRole('button', { name: 'PRL', exact: true }).click()
  await page.locator('.relation-controls select').nth(0).selectOption('4')
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()

  await categoryItem(page, 'III RP').getByRole('button', { name: 'III RP', exact: true }).click()
  await page.locator('.relation-controls select').nth(0).selectOption('1')
  await page.getByRole('button', { name: 'Dodaj rodziców' }).click()

  await expect(page.getByText('Nie można dodać rodzica, ponieważ relacja utworzyłaby cykl.')).toBeVisible()
  await expectRelations(page, 'Polska', 'PRL', 'II RP')
  await expectRelations(page, 'PRL', 'III RP', 'Polska')
  await expectRelations(page, 'III RP', '—', 'PRL')
})

test('kategoria posiadająca relacje nie może zostać usunięta', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'Polska').getByRole('button', { name: 'Polska', exact: true }).click()
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Usuń', exact: true }).click()
  await expect(page.getByText('Nie można usunąć kategorii, ponieważ jest używana.')).toBeVisible()
  await expect(categoryItem(page, 'Polska')).toBeVisible()
})

test('kategoria przypisana do monety nie może zostać usunięta', async ({ page }) => {
  await mockCategoryApi(page)
  await page.goto('/kategorie')
  await categoryItem(page, 'II RP').getByRole('button', { name: 'II RP', exact: true }).click()
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Usuń', exact: true }).click()
  await expect(page.getByText('Nie można usunąć kategorii, ponieważ jest używana.')).toBeVisible()
  await expect(categoryItem(page, 'II RP')).toBeVisible()
})
