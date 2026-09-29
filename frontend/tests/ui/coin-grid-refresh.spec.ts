import { expect, test } from '@playwright/test'

const coin1 = {
  id: 1, country_id: 1, issuer_id: null, denomination_id: 2, from_year: 1900, from_era_id: 3, to_year: 1901, to_era_id: 3,
  mint_id: null, material_id: null, state_id: null, description: 'Moneta testowa', weight: null, diameter: null,
  has_video: false, source: null, is_deleted: false,
}
const coin2 = { ...coin1, id: 2, description: 'Druga moneta' }
const images = new Map([
  [1, [{ id: 101, coin_id: 1, filename: '000001 - awers.jpg', kind: 'avers', sort_order: 0 }]],
  [2, [{ id: 102, coin_id: 2, filename: '000002 - awers.jpg', kind: 'avers', sort_order: 0 }]],
])
const dictionaries = {
  countries: [{ id: 1, name: 'Kraj testowy' }], issuers: [], denominations: [{ id: 2, name: 'Nominał testowy' }],
  mints: [], materials: [], states: [], eras: [{ id: 3, name: 'AD' }],
}

const validJpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z',
  'base64',
)

async function mockApi(page: import('@playwright/test').Page, coinCount = 2): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name as keyof typeof dictionaries] ?? []) })
  })
  await page.route('**/api/categories', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/coins*', async (route) => {
    const search = new URL(route.request().url()).searchParams.get('search')
    const coins = Array.from({ length: coinCount }, (_, index) => ({
      ...coin1,
      id: index + 1,
      description: `Moneta testowa ${index + 1}`,
      images: images.get(index + 1) ?? [],
    }))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(search ? coins.filter((item) => item.id !== 2) : coins) })
  })
  await page.route('**/api/coins/*/images/*/file', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: validJpeg })
  })
  await page.route('**/api/coins/*/images', async (route) => {
    const coinId = Number(new URL(route.request().url()).pathname.split('/')[3])
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(images.get(coinId) ?? []) })
  })
}

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

  page.on('response', (response) => {
    if (
      response.url().includes('/api/coins/')
      && response.url().includes('/images/')
      && response.url().endsWith('/file')
    ) {
      imageResponses.set(response.url(), response.status())
    }
  })

  page.on('requestfailed', (request) => {
    if (
      request.url().includes('/api/coins/')
      && request.url().includes('/images/')
      && request.url().endsWith('/file')
    ) {
      imageFailures.set(request.url(), request.failure()?.errorText ?? 'unknown')
    }
  })

  const coinsResponse = await page.request.get(
    'http://127.0.0.1:8000/coins?status=active&has_image=true&sort_by=id&sort_order=asc',
  )
  expect(coinsResponse.ok()).toBe(true)

  const coins = await coinsResponse.json() as Array<{
    id: number
    images?: Array<{ id: number; kind: string }>
  }>

  const expectedImages = coins.flatMap((coin) =>
    (coin.images ?? [])
      .filter((image) => image.kind === 'avers' || image.kind === 'rewers')
      .map((image) => ({
        coinId: coin.id,
        imageId: image.id,
        kind: image.kind,
        src: `/api/coins/${coin.id}/images/${image.id}/file`,
      })),
  )

  expect(expectedImages.length).toBeGreaterThan(0)

  await page.goto('/monety?has_image=true&sort_by=id&sort_order=asc')

  const renderedImages = await page.locator('.image-grid img').evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement
      const match = image.src.match(/\/api\/coins\/(\d+)\/images\/(\d+)\/file$/)
      return {
        src: image.currentSrc || image.src,
        coinId: match ? Number(match[1]) : null,
        imageId: match ? Number(match[2]) : null,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      }
    }),
  )

  expect(renderedImages.length).toBe(expectedImages.length)

  const expectedByKey = new Map(
    expectedImages.map((image) => [`${image.coinId}:${image.imageId}`, image]),
  )
  const renderedByKey = new Map(
    renderedImages
      .filter((image) => image.coinId !== null && image.imageId !== null)
      .map((image) => [`${image.coinId}:${image.imageId}`, image]),
  )

  const missingFromDom = expectedImages.filter(
    (image) => !renderedByKey.has(`${image.coinId}:${image.imageId}`),
  )
  const unexpectedInDom = renderedImages.filter(
    (image) => image.coinId === null
      || image.imageId === null
      || !expectedByKey.has(`${image.coinId}:${image.imageId}`),
  )

  const imageLoadStates = await page.locator('.image-grid img').evaluateAll(async (elements) => {
    const results = await Promise.all(elements.map(async (element) => {
      const image = element as HTMLImageElement
      const src = image.currentSrc || image.src

      if (image.complete) {
        return {
          src,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          event: image.naturalWidth > 0 ? 'already-loaded' : 'already-failed',
        }
      }

      const event = await new Promise<'load' | 'error' | 'timeout'>((resolve) => {
        const onLoad = () => {
          cleanup()
          resolve('load')
        }
        const onError = () => {
          cleanup()
          resolve('error')
        }
        const timeout = window.setTimeout(() => {
          cleanup()
          resolve('timeout')
        }, 10_000)
        const cleanup = () => {
          window.clearTimeout(timeout)
          image.removeEventListener('load', onLoad)
          image.removeEventListener('error', onError)
        }

        image.addEventListener('load', onLoad, { once: true })
        image.addEventListener('error', onError, { once: true })
      })

      return {
        src,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        event,
      }
    }))

    return results
  })

  const missingRequests = expectedImages.filter(
    (image) => !imageResponses.has(new URL(image.src, 'http://127.0.0.1:5173').href),
  )

  const non200Responses = [...imageResponses.entries()].filter(([, status]) => status !== 200)
  const failedLoads = imageLoadStates.filter(
    (image) => image.event !== 'load' && image.event !== 'already-loaded',
  )

  expect(missingFromDom, JSON.stringify(missingFromDom, null, 2)).toEqual([])
  expect(unexpectedInDom, JSON.stringify(unexpectedInDom, null, 2)).toEqual([])
  expect(failedLoads, JSON.stringify(failedLoads, null, 2)).toEqual([])
  expect(missingRequests, JSON.stringify(missingRequests, null, 2)).toEqual([])
  expect(non200Responses, JSON.stringify(non200Responses, null, 2)).toEqual([])
  expect([...imageFailures.entries()], JSON.stringify([...imageFailures.entries()], null, 2)).toEqual([])
  expect(imageResponses.size).toBe(expectedImages.length)
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
      body: JSON.stringify(responseCoins),
    })
  })
  await page.route('**/api/coins/*/images/*/file', async (route) => {
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
test('obrazy monet są faktycznie pobierane i dekodowane przez przeglądarkę', async ({ page }) => {
  const imageResponses = new Map<string, number>()
  const imageFailures = new Map<string, string>()

  page.on('response', (response) => {
    if (response.url().includes('/api/coins/') && response.url().includes('/images/') && response.url().endsWith('/file')) {
      imageResponses.set(response.url(), response.status())
    }
  })
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/coins/') && request.url().includes('/images/') && request.url().endsWith('/file')) {
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
