import { expect, test, type Page } from '@playwright/test'

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
}

type StoryPageTree = Omit<StoryPage, 'content' | 'created_at' | 'updated_at'> & {
  children: StoryPageTree[]
}

function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\\u0300-\\u036f]/g, '')
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

function toResponse(page: StoryPage, pages: StoryPage[]): StoryPage {
  return { ...page, path: buildPath(page, pages) }
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

async function mockStoryApi(page: Page): Promise<void> {
  const pages: StoryPage[] = []
  let nextId = 1

  const fulfillJson = async (route: Parameters<Page['route']>[1], status: number, body: unknown): Promise<void> => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  }

  await page.route('**/api/story/pages', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await fulfillJson(route, 200, pages.map((item) => toResponse(item, pages)))
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
        await fulfillJson(route, 409, { detail: 'A story page with the same title or slug already exists at the destination' })
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
      }
      pages.push(storyPage)
      await fulfillJson(route, 201, toResponse(storyPage, pages))
      return
    }

    await route.fallback()
  })

  await page.route('**/api/story/pages/**', async (route) => {
    const method = route.request().method()
    const pathname = new URL(route.request().url()).pathname
    const suffix = pathname.replace(/^.*\\/api\\/story\\/pages\\/?/, '')

    if (suffix === 'tree' && method === 'GET') {
      await fulfillJson(route, 200, buildTree(pages))
      return
    }

    if (suffix.startsWith('path/') && method === 'GET') {
      const requestedPath = decodeURIComponent(suffix.slice('path/'.length))
      const storyPage = pages.find((item) => buildPath(item, pages) === requestedPath)
      if (!storyPage) {
        await fulfillJson(route, 404, { detail: 'Story page not found' })
        return
      }
      await fulfillJson(route, 200, toResponse(storyPage, pages))
      return
    }

    const parts = suffix.split('/')
    const id = Number(parts[0])
    const storyPage = pages.find((item) => item.id === id)

    if (!storyPage) {
      await fulfillJson(route, 404, { detail: 'Story page not found' })
      return
    }

    if (parts.length === 1 && method === 'GET') {
      await fulfillJson(route, 200, toResponse(storyPage, pages))
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
      await fulfillJson(route, 200, toResponse(storyPage, pages))
      return
    }

    if (parts.length === 1 && method === 'DELETE') {
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
      await fulfillJson(route, 200, toResponse(storyPage, pages))
      return
    }

    if (parts[1] === 'move' && method === 'POST') {
      const body = route.request().postDataJSON() as { parent_id: number | null }
      storyPage.parent_id = body.parent_id
      const siblings = pages.filter((item) => item.parent_id === body.parent_id && item.id !== storyPage.id)
      storyPage.sort_order = siblings.length ? Math.max(...siblings.map((item) => item.sort_order)) + 1 : 0
      await fulfillJson(route, 200, toResponse(storyPage, pages))
      return
    }

    await route.fallback()
  })
}

test('Opowieść allows creating and navigating a page', async ({ page }) => {
  await mockStoryApi(page)

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
  await mockStoryApi(page)

  const title = 'Markdown E2E ' + Date.now()
  const content = '# Nagłówek\\n\\nPierwszy **ważny** akapit.\\n\\n- jeden\\n- dwa\\n\\n{{ coin:123 }}\\n\\n<script>alert("nie wykonuj")</script>'

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
  await mockStoryApi(page)

  await page.goto('/opowiesc/edytuj/nowa')
  await page.getByLabel('Tytuł').fill('Podgląd E2E')
  await page.getByLabel('Treść Markdown').fill('# Podgląd\\n\\n**Ważny** tekst.')

  const preview = page.locator('.preview-pane')
  await expect(preview.getByRole('heading', { name:'Podgląd', exact:true })).toBeVisible()
  await expect(preview.locator('strong')).toHaveText('Ważny')
})
