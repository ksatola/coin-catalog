import { expect, test } from '@playwright/test'

test('Opowieść allows creating and navigating a page', async ({ page }) => {
  const title = 'Monety polskie E2E ' + Date.now()
  await page.goto('/opowiesc/edytuj/nowa')
  await page.getByLabel('Tytuł').fill(title)
  await page.getByLabel('Treść Markdown').fill('Pierwszy akapit.')
  await page.getByRole('button', { name:'Zapisz' }).click()

  await expect(page.getByRole('heading', { name:title })).toBeVisible()
  await expect(page.getByText('Pierwszy akapit.')).toBeVisible()
  await expect(page.getByRole('button', { name:title })).toBeVisible()
})

test('Opowieść renders Markdown and coin references without executing raw HTML', async ({ page }) => {
  const title = 'Markdown E2E ' + Date.now()
  const content = '# Nagłówek\n\nPierwszy **ważny** akapit.\n\n- jeden\n- dwa\n\n{{ coin:123 }}\n\n<script>alert("nie wykonuj")</script>'

  await page.goto('/opowiesc/edytuj/nowa')
  await page.getByLabel('Tytuł').fill(title)
  await page.getByLabel('Treść Markdown').fill(content)
  await page.getByRole('button', { name:'Zapisz' }).click()

  await expect(page.getByRole('heading', { name:'Nagłówek', exact:true })).toBeVisible()
  await expect(page.locator('strong')).toHaveText('ważny')
  await expect(page.locator('ul li')).toHaveText(['jeden', 'dwa'])
  await expect(page.locator('[data-coin-id="123"]')).toHaveText('Moneta #123')
  await expect(page.locator('script')).toHaveCount(0)
  await expect(page.getByText('<script>alert("nie wykonuj")</script>')).toBeVisible()
})

test('edytor Opowieści pokazuje podgląd Markdown', async ({ page }) => {
  await page.goto('/opowiesc/edytuj/nowa')
  await page.getByLabel('Tytuł').fill('Podgląd E2E')
  await page.getByLabel('Treść Markdown').fill('# Podgląd\n\n**Ważny** tekst.')

  const preview = page.locator('.preview-pane')
  await expect(preview.getByRole('heading', { name:'Podgląd', exact:true })).toBeVisible()
  await expect(preview.locator('strong')).toHaveText('Ważny')
})


test('Opowieść pozwala usunąć stronę-liść', async ({ page }) => {
  let deleted = false

  await page.route('**/api/story/pages/tree', async (route) => {
    const tree = deleted ? [] : [{
      id: 1,
      parent_id: null,
      title: 'Strona do usunięcia',
      slug: 'strona-do-usuniecia',
      sort_order: 0,
      path: 'strona-do-usuniecia',
      children: [],
    }]
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tree) })
  })

  await page.route('**/api/story/pages/path/strona-do-usuniecia', async (route) => {
    if (deleted) {
      await route.fulfill({ status: 404, body: '' })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        parent_id: null,
        title: 'Strona do usunięcia',
        slug: 'strona-do-usuniecia',
        content: 'Treść',
        sort_order: 0,
        created_at: '2026-10-03T00:00:00Z',
        updated_at: '2026-10-03T00:00:00Z',
        path: 'strona-do-usuniecia',
      }),
    })
  })

  await page.route('**/api/story/pages/1', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback()
      return
    }
    deleted = true
    await route.fulfill({ status: 204, body: '' })
  })

  await page.goto('/opowiesc/strona-do-usuniecia')
  await expect(page.getByRole('heading', { name: 'Strona do usunięcia' })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Usuń stronę' }).click()

  await expect(page).toHaveURL('/opowiesc')
  await expect(page.getByRole('button', { name: 'Strona do usunięcia' })).toHaveCount(0)
})

test('Opowieść nie pozwala usunąć strony posiadającej podstrony', async ({ page }) => {
  await page.route('**/api/story/pages/tree', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 1,
        parent_id: null,
        title: 'Strona nadrzędna',
        slug: 'strona-nadrzedna',
        sort_order: 0,
        path: 'strona-nadrzedna',
        children: [{
          id: 2,
          parent_id: 1,
          title: 'Podstrona',
          slug: 'podstrona',
          sort_order: 0,
          path: 'strona-nadrzedna/podstrona',
          children: [],
        }],
      }]),
    })
  })

  await page.route('**/api/story/pages/path/strona-nadrzedna', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        parent_id: null,
        title: 'Strona nadrzędna',
        slug: 'strona-nadrzedna',
        content: 'Treść',
        sort_order: 0,
        created_at: '2026-10-03T00:00:00Z',
        updated_at: '2026-10-03T00:00:00Z',
        path: 'strona-nadrzedna',
      }),
    })
  })

  await page.route('**/api/story/pages/1', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback()
      return
    }
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ detail: 'Page has children' }) })
  })

  await page.goto('/opowiesc/strona-nadrzedna')
  await expect(page.getByRole('heading', { name: 'Strona nadrzędna' })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Usuń stronę' }).click()

  await expect(page.getByText('Nie można usunąć strony, która ma podstrony.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Strona nadrzędna' })).toBeVisible()
})
