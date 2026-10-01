import { expect, test } from '@playwright/test'

const coin1 = {
  id: 1, country_id: 1, issuer_id: null, denomination_id: 2, from_year: 1900, from_era_id: 3, to_year: 1901, to_era_id: 3,
  mint_id: null, material_id: null, state_id: null, description: 'Moneta testowa', weight: null, diameter: null,
  has_video: false, source: null, is_deleted: false,
}
const coin2 = { ...coin1, id: 2, description: 'Druga moneta' }
const images = new Map([
  [1, [{ id: 101, coin_id: 1, filename: '000001 - awers.jpg', kind: 'avers', sort_order: 0, revision: 1 }]],
  [2, [{ id: 102, coin_id: 2, filename: '000002 - awers.jpg', kind: 'avers', sort_order: 0, revision: 1 }]],
])
const dictionaries = {
  countries: [{ id: 1, name: 'Kraj testowy' }], issuers: [], denominations: [{ id: 2, name: 'Nominał testowy' }],
  mints: [], materials: [], states: [], eras: [{ id: 3, name: 'AD' }],
}

const validJpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z',
  'base64',
)

async function mockApi(
  page: import('@playwright/test').Page,
  coinCount = 2,
  blockCoinsResponse = false,
): Promise<() => void> {
  let releaseCoinsResponse = (): void => undefined
  const coinsResponseBlocked = new Promise<void>((resolve) => {
    releaseCoinsResponse = resolve
  })
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []) })
  })
  await page.route('**/api/categories', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/coins*', async (route) => {
    const url = new URL(route.request().url())
    const search = url.searchParams.get('search')
    const coins = Array.from({ length: coinCount }, (_, index) => ({
      ...coin1,
      id: index + 1,
      description: `Moneta testowa ${index + 1}`,
      images: images.get(index + 1) ?? [],
    }))
    const payload = search ? coins.filter((item) => item.id !== 2) : coins
    if (blockCoinsResponse) {
      await coinsResponseBlocked
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        url.searchParams.has('limit')
          ? { items: payload, next_cursor: null, has_more: false }
          : payload,
      ),
    })
  })
  await page.route('**/api/coins/*/images/*/thumbnail*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: validJpeg })
  })
  await page.route('**/api/coins/*/images', async (route) => {
    const coinId = Number(new URL(route.request().url()).pathname.split('/')[3])
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(images.get(coinId) ?? []) })
  })

  return releaseCoinsResponse
}

test('pokazuje stan ładowania zamiast pustego katalogu przed pierwszą odpowiedzią', async ({ page }) => {
  const releaseCoinsResponse = await mockApi(page, 2, true)

  await page.goto('/monety', { waitUntil: 'commit' })
  await expect(page.getByRole('status')).toHaveText('Ładowanie monet…')
  releaseCoinsResponse()

  await expect(page.getByRole('link', { name: 'Moneta #1' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByText('Brak monet')).toHaveCount(0)
})


test('powrót z widoku szczegółowego przywraca pozycję przewijania katalogu', async ({ page }) => {
  await mockApi(page, 20)

  await page.route('**/api/coins/20/navigation*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ previous_id: 19, next_id: null }),
    })
  })
  await page.route('**/api/coins/20', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...coin1, id: 20, description: 'Moneta testowa 20', images: images.get(2) ?? [] }),
    })
  })

  await page.goto('/monety')
  await expect(page.getByRole('link', { name: 'Moneta #20' })).toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 700))
  const catalogScrollY = await page.evaluate(() => window.scrollY)
  expect(catalogScrollY).toBeGreaterThan(0)

  await page.getByRole('link', { name: 'Moneta #20' }).click()
  await expect(page).toHaveURL(/\/monety\/20$/)

  await page.goBack()
  await expect(page).toHaveURL(/\/monety$/)
  await expect(page.getByRole('link', { name: 'Moneta #20' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(catalogScrollY)
})


test('wyczyszczenie filtrów odświeża zdjęcia monet w galerii', async ({ page }) => {
  await mockApi(page)
  await page.goto('/monety')

  await expect(page.getByRole('link', { name: 'Moneta #2' })).toBeVisible()
  await expect(page.getByAltText('Awers monety #2')).toBeVisible()

  await page.getByRole('button', { name: '⚙ Filtry' }).click()
  await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('test')
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()

  await expect(page.getByRole('link', { name: 'Moneta #1' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Moneta #2' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Wyczyść filtry' }).click()

  const grid = page.locator('.image-grid')
  await expect(grid.getByRole('link', { name: 'Moneta #1' })).toBeVisible()
  await expect(grid.getByRole('link', { name: 'Moneta #2' })).toBeVisible()
  await expect(grid.getByAltText('Awers monety #1')).toBeVisible()
  await expect(grid.getByAltText('Awers monety #2')).toBeVisible()
})

test('katalog używa miniaturek z revision i lazy loading', async ({ page }) => {
  await mockApi(page)
  await page.goto('/monety')

  const image = page.getByAltText('Awers monety #1')
  await expect(image).toHaveAttribute('loading', 'lazy')
  await expect(image).toHaveAttribute('src', /\/api\/coins\/1\/images\/101\/thumbnail\?v=1$/)
})

test('wyszukiwanie zachowuje pozycję przewijania katalogu', async ({ page }) => {
  await mockApi(page, 20)
  await page.goto('/monety')

  const search = page.getByPlaceholder('Szukaj monet, np. polska grosz')
  await expect(page.getByRole('link', { name: 'Moneta #20' })).toBeVisible()
  await search.focus()
  await page.evaluate(() => window.scrollTo(0, 700))

  const before = await page.evaluate(() => window.scrollY)
  await search.evaluate((element) => {
    const input = element as HTMLInputElement
    input.value = 'test'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })

  await page.waitForTimeout(400)
  await expect(page.getByRole('link', { name: 'Moneta #2', exact: true })).toHaveCount(0)

  const after = await page.evaluate(() => window.scrollY)
  expect(after).toBe(before)
})


test('diagnostyka mapowania monet, obrazów i requestów plików', async ({ page }) => {
  const imageResponses = new Map<string, number>()
  const imageFailures = new Map<string, string>()
  const fixtureCoins = [1, 2, 3].map((id) => ({
    ...coin1,
    id,
    description: `Moneta testowa ${id}`,
    images: [
      { id: id * 100 + 1, coin_id: id, filename: `coin-${id}-avers.jpg`, kind: 'avers', sort_order: 0, revision: 1 },
      { id: id * 100 + 2, coin_id: id, filename: `coin-${id}-rewers.jpg`, kind: 'rewers', sort_order: 1, revision: 1 },
    ],
  }))
  const expectedImages = fixtureCoins.flatMap((coin) =>
    (coin.images ?? []).map((image) => ({
      coinId: coin.id,
      imageId: image.id,
      kind: image.kind,
      src: `/api/coins/${coin.id}/images/${image.id}/thumbnail?v=1`,
    })),
  )

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []),
    })
  })
  await page.route('**/api/collections', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/coins*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: fixtureCoins, next_cursor: null, has_more: false }),
    })
  })
  await page.route('**/api/coins/*/images/*/thumbnail*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: validJpeg })
  })

  page.on('response', (response) => {
    if (response.url().includes('/api/coins/') && response.url().includes('/images/') && response.url().includes('/thumbnail')) {
      imageResponses.set(response.url(), response.status())
    }
  })
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/coins/') && request.url().includes('/images/') && request.url().includes('/thumbnail')) {
      imageFailures.set(request.url(), request.failure()?.errorText ?? 'unknown')
    }
  })

  await page.goto('/monety?has_image=true&sort_by=id&sort_order=asc')
  const renderedImages = page.locator('.image-grid img')
  await expect(renderedImages).toHaveCount(expectedImages.length)
  await expect.poll(async () => renderedImages.evaluateAll((elements) =>
    elements.filter((element) => {
      const image = element as HTMLImageElement
      return image.complete && image.naturalWidth > 0
    }).length,
  )).toBe(expectedImages.length)

  const rendered = await renderedImages.evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement
      const match = image.src.match(/\/api\/coins\/(\d+)\/images\/(\d+)\/thumbnail\?v=1$/)
      return {
        coinId: match ? Number(match[1]) : null,
        imageId: match ? Number(match[2]) : null,
      }
    }),
  )
  const expectedKeys = expectedImages.map((image) => `${image.coinId}:${image.imageId}`).sort()
  const renderedKeys = rendered.map((image) => `${image.coinId}:${image.imageId}`).sort()

  expect(renderedKeys).toEqual(expectedKeys)
  expect([...imageResponses.values()]).toEqual(Array(expectedImages.length).fill(200))
  expect(imageFailures).toEqual(new Map())
})

test('równoległe odświeżenia katalogu nie pozwalają starszej odpowiedzi nadpisać nowszej', async ({ page }) => {
  let requestNumber = 0

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []),
    })
  })
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/coins*', async (route) => {
    requestNumber += 1
    const currentRequest = requestNumber
    const responseCoins = currentRequest === 1
      ? [{ ...coin1, id: 1, description: 'Stara odpowiedź', images: images.get(1) ?? [] }]
      : [{ ...coin1, id: 2, description: 'Nowsza odpowiedź', images: images.get(2) ?? [] }]

    await new Promise((resolve) => setTimeout(resolve, currentRequest === 1 ? 300 : 20))

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        new URL(route.request().url()).searchParams.has('limit')
          ? { items: responseCoins, next_cursor: null, has_more: false }
          : responseCoins,
      ),
    })
  })
  await page.route('**/api/coins/*/images/*/thumbnail*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: validJpeg })
  })

  await page.goto('/monety')

  const search = page.getByPlaceholder('Szukaj monet, np. polska grosz')
  await search.fill('test')
  await page.waitForTimeout(600)

  const cards = page.locator('.image-grid .coin-tile')
  await expect(cards).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Moneta #2' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Moneta #1' })).toHaveCount(0)
})

test('zmiana metadanych obrazów przy tych samych monetach aktualizuje src elementów img', async ({ page }) => {
  let responseVersion = 0

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []),
    })
  })
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/coins*', async (route) => {
    responseVersion += 1
    const imageId = responseVersion === 1 ? 101 : 201
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(new URL(route.request().url()).searchParams.has('limit')
        ? {
            items: [{
              ...coin1,
              id: 1,
              images: [{
                id: imageId,
                coin_id: 1,
                filename: `coin-1-v${responseVersion}.jpg`,
                kind: 'avers',
                sort_order: 0,
                revision: 1,
              }],
            }],
            next_cursor: null,
            has_more: false,
          }
        : [{
          ...coin1,
          id: 1,
          images: [{
            id: imageId,
            coin_id: 1,
            filename: `coin-1-v${responseVersion}.jpg`,
            kind: 'avers',
            sort_order: 0,
          }],
        }]),
    })
  })
  await page.route('**/api/coins/*/images/*/thumbnail*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: validJpeg })
  })

  await page.goto('/monety')

  const image = page.getByAltText('Awers monety #1')
  await expect(image).toHaveAttribute('src', '/api/coins/1/images/101/thumbnail?v=1')
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)

  await page.getByPlaceholder('Szukaj monet, np. polska grosz').fill('test')
  await expect.poll(() => image.getAttribute('src')).toBe('/api/coins/1/images/201/thumbnail?v=1')
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
})

test('rzeczywiste przełączanie widoków i filtrów nie gubi obrazów', async ({ page }) => {
  const fixtureCoins = [1, 2, 3].map((id) => ({
    ...coin1,
    id,
    description: id === 3 ? 'Trzecia moneta' : `Moneta testowa ${id}`,
    images: [
      { id: id * 100 + 1, coin_id: id, filename: `coin-${id}-avers.jpg`, kind: 'avers', sort_order: 0, revision: 1 },
      { id: id * 100 + 2, coin_id: id, filename: `coin-${id}-rewers.jpg`, kind: 'rewers', sort_order: 1, revision: 1 },
    ],
  }))

  const mockCatalog = async (): Promise<void> => {
    await page.route('**/api/dictionaries/*', async (route) => {
      const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []),
      })
    })
    await page.route('**/api/collections', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route('**/api/categories', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route('**/api/coins*', async (route) => {
      const search = new URL(route.request().url()).searchParams.get('search')
      const items = search ? fixtureCoins.slice(0, 2) : fixtureCoins
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, next_cursor: null, has_more: false }),
      })
    })
    await page.route('**/api/coins/*/images/*/thumbnail*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'image/jpeg', body: validJpeg })
    })
  }

  await mockCatalog()
  await page.goto('/monety?has_image=true&sort_by=id&sort_order=asc')

  const assertImages = async (expectedCount: number): Promise<void> => {
    const images = page.locator('.image-grid img')
    await expect(images).toHaveCount(expectedCount)
    await expect.poll(async () => images.evaluateAll((elements) =>
      elements.filter((element) => {
        const image = element as HTMLImageElement
        return image.complete && image.naturalWidth > 0
      }).length,
    )).toBe(expectedCount)
  }

  await assertImages(6)

  await page.getByRole('button', { name: /Grid/ }).click()
  await expect(page.locator('.grid img')).toHaveCount(6)

  await page.getByRole('button', { name: /Galeria/ }).click()
  await assertImages(6)

  await page.getByRole('button', { name: '⚙ Filtry' }).click()
  await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('test')
  await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()
  await assertImages(4)

  await page.getByRole('button', { name: 'Wyczyść filtry' }).click()
  await assertImages(6)

  await page.getByRole('button', { name: '3 monet w wierszu' }).click()
  await assertImages(6)

  await page.getByRole('button', { name: '4 monet w wierszu' }).click()
  await assertImages(6)

  await page.getByRole('button', { name: '1 monet w wierszu' }).click()
  await assertImages(6)
})
test('obrazy monet są faktycznie pobierane i dekodowane przez przeglądarkę', async ({ page }) => {
  const imageResponses = new Map<string, number>()
  const imageFailures = new Map<string, string>()

  page.on('response', (response) => {
    if (response.url().includes('/api/coins/') && response.url().includes('/images/') && response.url().includes('/thumbnail')) {
      imageResponses.set(response.url(), response.status())
    }
  })
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/coins/') && request.url().includes('/images/') && request.url().includes('/thumbnail')) {
      imageFailures.set(request.url(), request.failure()?.errorText ?? 'unknown')
    }
  })

  await mockApi(page, 20)
  await page.goto('/monety')

  const images = page.locator('.image-grid img')
  await expect(images).toHaveCount(2)
  await expect.poll(async () => images.evaluateAll((elements) =>
    elements.filter((element) => {
      const image = element as HTMLImageElement
      return image.complete && image.naturalWidth > 0
    }).length,
  )).toBe(2)

  expect([...imageResponses.values()]).toEqual([200, 200])
  expect(imageFailures.size).toBe(0)
})


test('ponawia ładowanie obrazu w widoku szczegółów po błędzie pierwszej próby', async ({ page }) => {
  let imageRequests = 0

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []),
    })
  })
  await page.route('**/api/collections/1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, name: 'Kolekcja testowa', description: null, is_archived: false }),
    })
  })
  await page.route('**/api/coins/1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...coin1,
        id: 1,
        collection_id: 1,
        collection_number: 'A-1',
        images: undefined,
      }),
    })
  })
  await page.route('**/api/coins/1/navigation*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ previous_id: null, next_id: null }),
    })
  })
  await page.route('**/api/coins/1/images', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(images.get(1) ?? []),
    })
  })
  await page.route('**/api/coins/1/images/101/file*', async (route) => {
    imageRequests += 1

    if (imageRequests === 1) {
      await route.abort('failed')
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'image/jpeg',
      body: validJpeg,
    })
  })

  await page.goto('/monety/1')

  const image = page.getByAltText('Awers monety')
  await expect.poll(() => imageRequests).toBe(2)
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(image).toHaveAttribute('src', '/api/coins/1/images/101/file?image_retry=1')
})

test('ponawia ładowanie obrazu po błędzie pierwszej próby', async ({ page }) => {
  let imageRequests = 0

  await mockApi(page, 1)
  await page.route('**/api/coins/1/images/101/thumbnail*', async (route) => {
    imageRequests += 1

    if (imageRequests === 1) {
      await route.abort('failed')
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'image/jpeg',
      body: validJpeg,
    })
  })

  await page.goto('/monety')

  const image = page.getByAltText('Awers monety #1')
  await expect.poll(() => imageRequests).toBe(2)
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(image).toHaveAttribute('src', '/api/coins/1/images/101/thumbnail?v=1&image_retry=1')
})
