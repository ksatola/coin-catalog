import { expect, test, type Page } from '@playwright/test'

type StoryEmbeddedCoin = {
  id: number
  coin: {
    id: number
    collection_number: string | null
    from_year: number | null
    to_year: number | null
    images: { id: number; kind: 'avers' | 'rewers'; revision: number }[]
  } | null
  deleted: boolean
}

type StoryPage = {
  id: number
  parent_id: number | null
  title: string
  slug: string
  content: string
  sort_order: number
  created_at: string
  updated_at: string
  path: string
  embedded_coins: StoryEmbeddedCoin[]
}

type StoryPageTree = Omit<StoryPage, 'content' | 'created_at' | 'updated_at' | 'embedded_coins'> & {
  children: StoryPageTree[]
}

function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'strona'
}

function buildPath(page: StoryPage, pages: StoryPage[]): string {
  const parts = [page.slug]
  let current = page
  while (current.parent_id !== null) {
    const parent = pages.find((item) => item.id === current.parent_id)
    if (!parent) throw new Error('Missing story parent in test state')
    parts.push(parent.slug)
    current = parent
  }
  return parts.reverse().join('/')
}

function embeddedCoins(content: string): StoryEmbeddedCoin[] {
  const ids = [...content.matchAll(/\{\{\s*coin:(\d+)\s*\}\}/g)]
    .map((match) => Number(match[1]))
    .filter((id, index, all) => all.indexOf(id) === index)

  return ids.map((id) => {
    if (id === 123) {
      return {
        id,
        coin: {
          id,
          collection_number: 'K-123',
          from_year: 1930,
          to_year: 1930,
          images: [{ id: 1231, kind: 'avers', revision: 2 }, { id: 1232, kind: 'rewers', revision: 3 }],
        },
        deleted: false,
      }
    }
    return { id, coin: null, deleted: true }
  })
}

function toResponse(page: StoryPage, pages: StoryPage[]): StoryPage {
  return { ...page, path: buildPath(page, pages), embedded_coins: embeddedCoins(page.content) }
}

function buildTree(pages: StoryPage[]): StoryPageTree[] {
  const childrenOf = (parentId: number | null): StoryPageTree[] =>
    pages
      .filter((page) => page.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((page) => ({
        id: page.id,
        parent_id: page.parent_id,
        title: page.title,
        slug: page.slug,
        sort_order: page.sort_order,
        path: buildPath(page, pages),
        children: childrenOf(page.id),
      }))

  return childrenOf(null)
}

async function mockStoryApi(page: Page, initialPages: StoryPage[] = []): Promise<void> {
  const pages = initialPages.map((item) => ({ ...item }))
  let nextId = pages.reduce((max, item) => Math.max(max, item.id), 0) + 1

  await page.route('**/api/story/pages', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pages.map((item) => toResponse(item, pages))),
      })
      return
    }

    if (method === 'POST') {
      const body = route.request().postDataJSON() as {
        title: string
        parent_id: number | null
        content: string
      }
      const title = body.title.trim()
      const slug = slugify(title)
      const siblings = pages.filter((item) => item.parent_id === body.parent_id)
      if (siblings.some((item) => item.title === title || item.slug === slug)) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'A story page with the same title or slug already exists at the destination' }),
        })
        return
      }

      const siblingOrders = siblings.map((item) => item.sort_order)
      const storyPage: StoryPage = {
        id: nextId++,
        parent_id: body.parent_id,
        title,
        slug,
        content: body.content,
        sort_order: siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0,
        created_at: '2026-10-03T00:00:00Z',
        updated_at: '2026-10-03T00:00:00Z',
        path: '',
        embedded_coins: [],
      }
      pages.push(storyPage)
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(toResponse(storyPage, pages)),
      })
      return
    }

    await route.fallback()
  })

  await page.route('**/api/story/pages/**', async (route) => {
    const method = route.request().method()
    const pathname = new URL(route.request().url()).pathname
    const suffix = pathname.replace(/^.*\/api\/story\/pages\/?/, '')

    if (suffix === 'tree' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildTree(pages)),
      })
      return
    }

    if (suffix.startsWith('path/') && method === 'GET') {
      const requestedPath = decodeURIComponent(suffix.slice('path/'.length))
      const storyPage = pages.find((item) => buildPath(item, pages) === requestedPath)
      if (!storyPage) {
        await route.fulfill({ status: 404, body: '' })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toResponse(storyPage, pages)),
      })
      return
    }

    const parts = suffix.split('/')
    const id = Number(parts[0])
    const storyPage = pages.find((item) => item.id === id)

    if (!storyPage) {
      await route.fulfill({ status: 404, body: '' })
      return
    }

    if (parts.length === 1 && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toResponse(storyPage, pages)),
      })
      return
    }

    if (parts.length === 1 && method === 'PUT') {
      const body = route.request().postDataJSON() as {
        title: string
        parent_id: number | null
        content: string
      }
      storyPage.title = body.title.trim()
      storyPage.parent_id = body.parent_id
      storyPage.content = body.content
      storyPage.slug = slugify(storyPage.title)
      storyPage.updated_at = '2026-10-03T00:00:00Z'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toResponse(storyPage, pages)),
      })
      return
    }

    if (parts.length === 1 && method === 'DELETE') {
      if (pages.some((item) => item.parent_id === storyPage.id)) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Page has children' }),
        })
        return
      }
      pages.splice(pages.indexOf(storyPage), 1)
      await route.fulfill({ status: 204, body: '' })
      return
    }

    if (parts[1] === 'reorder' && method === 'POST') {
      const body = route.request().postDataJSON() as { direction: 'up' | 'down' }
      const siblings = pages
        .filter((item) => item.parent_id === storyPage.parent_id)
        .sort((a, b) => a.sort_order - b.sort_order)
      const index = siblings.findIndex((item) => item.id === storyPage.id)
      const targetIndex = body.direction === 'up' ? index - 1 : index + 1
      if (targetIndex >= 0 && targetIndex < siblings.length) {
        const other = siblings[targetIndex]
        ;[storyPage.sort_order, other.sort_order] = [other.sort_order, storyPage.sort_order]
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toResponse(storyPage, pages)),
      })
      return
    }

    if (parts[1] === 'move' && method === 'POST') {
      const body = route.request().postDataJSON() as { parent_id: number | null }
      storyPage.parent_id = body.parent_id
      const siblings = pages.filter((item) => item.parent_id === body.parent_id && item.id !== storyPage.id)
      storyPage.sort_order = siblings.length ? Math.max(...siblings.map((item) => item.sort_order)) + 1 : 0
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toResponse(storyPage, pages)),
      })
      return
    }

    await route.fallback()
  })
}

function storyPage(overrides: Partial<StoryPage>): StoryPage {
  return {
    id: 1,
    parent_id: null,
    title: 'Strona testowa',
    slug: 'strona-testowa',
    content: 'Treść',
    sort_order: 0,
    created_at: '2026-10-03T00:00:00Z',
    updated_at: '2026-10-03T00:00:00Z',
    path: 'strona-testowa',
    embedded_coins: [],
    ...overrides,
  }
}

test('Opowieść allows creating and navigating a page', async ({ page }) => {
  await mockStoryApi(page)

  const title = 'Monety polskie E2E'
  await page.goto('/opowiesc/edytuj/nowa')
  await page.getByLabel('Tytuł').fill(title)
  await page.getByLabel('Treść Markdown').fill('Pierwszy akapit.')
  await page.getByRole('button', { name:'Zapisz' }).click()

  await expect(page.getByRole('heading', { name:title })).toBeVisible()
  await expect(page.getByText('Pierwszy akapit.')).toBeVisible()
  await expect(page.getByRole('button', { name:title })).toBeVisible()
})

test('Opowieść renders Markdown and real coin embeds without executing raw HTML', async ({ page }) => {
  await mockStoryApi(page)

  const title = 'Markdown E2E'
  const content = '# Nagłówek\n\nPierwszy **ważny** akapit.\n\n- jeden\n- dwa\n\n{{ coin:123 }}\n\n{{ coin:999 }}\n\n<script>alert("nie wykonuj")</script>'

  await page.goto('/opowiesc/edytuj/nowa')
  await page.getByLabel('Tytuł').fill(title)
  await page.getByLabel('Treść Markdown').fill(content)
  await page.getByRole('button', { name:'Zapisz' }).click()

  await expect(page.getByRole('heading', { name:'Nagłówek', exact:true })).toBeVisible()
  await expect(page.locator('strong')).toHaveText('ważny')
  await expect(page.locator('.reader .story-renderer ul li')).toHaveText(['jeden', 'dwa'])
  await expect(page.getByRole('link', { name:'Moneta #123' })).toHaveAttribute('href', '/monety/123')
  await expect(page.locator('.story-coin img')).toHaveAttribute('src', /\/api\/coins\/123\/images\/1231\/thumbnail\?v=2/)
  await expect(page.getByText('⚠ Moneta została usunięta')).toBeVisible()
  await expect(page.locator('.reader .story-renderer script')).toHaveCount(0)
  await expect(page.getByText('<script>alert("nie wykonuj")</script>')).toBeVisible()
})

test('edytor Opowieści pokazuje podgląd Markdown', async ({ page }) => {
  await mockStoryApi(page)

  await page.goto('/opowiesc/edytuj/nowa')
  await page.getByLabel('Tytuł').fill('Podgląd E2E')
  await page.getByLabel('Treść Markdown').fill('# Podgląd\n\n**Ważny** tekst.')

  const preview = page.locator('.preview-pane')
  await expect(preview.locator(':scope > h2')).toHaveText('Podgląd')
  await expect(preview.locator('strong')).toHaveText('Ważny')
})

test('Opowieść pozwala usunąć stronę-liść', async ({ page }) => {
  await mockStoryApi(page, [storyPage({
    title: 'Strona do usunięcia',
    slug: 'strona-do-usuniecia',
    path: 'strona-do-usuniecia',
  })])

  await page.goto('/opowiesc/strona-do-usuniecia')
  await expect(page.getByRole('heading', { name: 'Strona do usunięcia' })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Usuń stronę' }).click()

  await expect(page).toHaveURL('/opowiesc')
  await expect(page.getByRole('button', { name: 'Strona do usunięcia' })).toHaveCount(0)
})

test('Opowieść nie pozwala usunąć strony posiadającej podstrony', async ({ page }) => {
  await mockStoryApi(page, [
    storyPage({
      title: 'Strona nadrzędna',
      slug: 'strona-nadrzedna',
      path: 'strona-nadrzedna',
    }),
    storyPage({
      id: 2,
      parent_id: 1,
      title: 'Podstrona',
      slug: 'podstrona',
      sort_order: 0,
      path: 'strona-nadrzedna/podstrona',
    }),
  ])

  await page.goto('/opowiesc/strona-nadrzedna')
  await expect(page.getByRole('heading', { name: 'Strona nadrzędna' })).toBeVisible()

  const parentRow = page.locator('.node-row').filter({ has: page.getByRole('button', { name: 'Strona nadrzędna' }) })
  page.once('dialog', (dialog) => dialog.accept())
  await parentRow.getByRole('button', { name: 'Usuń stronę' }).click()

  await expect(page.getByText('Nie można usunąć strony, która ma podstrony.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Strona nadrzędna' })).toBeVisible()
})

test('picker Opowieści wstawia monetę z katalogu w miejscu kursora', async ({ page }) => {
  await mockStoryApi(page)
  await page.route('**/api/coins*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: 123, collection_number: 'A-123' }], next_cursor: null, has_more: false }) })
  })
  await page.goto('/opowiesc/edytuj/nowa')
  await page.getByLabel('Tytuł').fill('Picker test')
  await page.getByLabel('Treść Markdown').fill('Przed ')
  const textarea = page.getByLabel('Treść Markdown')
  await textarea.evaluate((element) => (element as HTMLTextAreaElement).setSelectionRange(7, 7))
  await page.getByRole('button', { name: 'Wstaw monetę' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Wstaw' }).click()
  await expect(textarea).toHaveValue('Przed {{ coin:123 }}')
})

test('picker Opowieści pokazuje monety zaznaczone w widoku Monety', async ({ page }) => {
  await mockStoryApi(page)
  await page.route('**/api/coins*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: 12 }, { id: 27 }], next_cursor: null, has_more: false }) })
  })
  await page.goto('/monety')
  await expect(page.getByRole('checkbox', { name: 'Wybierz monetę #12' })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Wybierz monetę #12' }).check()
  await page.getByRole('checkbox', { name: 'Wybierz monetę #27' }).check()
  await page.getByRole('button', { name: 'Dodaj do Opowieści' }).click()
  await page.waitForURL('/opowiesc/edytuj/nowa')
  await page.getByRole('button', { name: 'Wstaw monetę' }).click()
  await page.getByRole('button', { name: /Wybrane w widoku Monety \(2\)/ }).click()
  await expect(page.getByRole('button', { name: 'Wstaw' })).toHaveCount(2)
})
