  await expect(page.getByAltText('Awers')).toBeVisible()

  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()
  await page.waitForURL(`/monety/${coinId}`)

  await expect(page.getByRole('heading', { name: `Szczegóły monety #${coinId}` })).toBeVisible()
  await expect(page.getByAltText('Awers monety')).toBeVisible()

  await page.getByRole('link', { name: 'Monety' }).click()
  await page.waitForURL('/monety')
  await expect(page.getByText(`#${coinId}`)).toBeVisible()
  await expect(page.getByAltText(`Awers monety #${coinId}`)).toBeVisible()

  expect(coinUpdates).toBe(1)
  expect(uploaded).toEqual([
    { kind: 'avers', replace: true },
  ])
})

test('anulowanie edycji nie zapisuje podmiany awersu', async ({ page }) => {
  const { uploaded } = await mockCommonApi(page)
  let updates = 0

  await page.route(`**/api/coins/${coinId}`, async (route) => {
    if (route.request().method() === 'PUT') {
      updates += 1
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.goto(`/monety/${coinId}/edytuj`)
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()

  await dropJpeg(page, 'nowy-awers.jpg')
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm')
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Anuluj' }).click()
  await page.waitForURL(`/monety/${coinId}`)

  expect(updates).toBe(0)
  expect(uploaded).toHaveLength(0)
  await expect(page.getByAltText('Awers monety')).toBeVisible()
})

test('podmiana rewersu zostaje wysłana jako zastąpienie', async ({ page }) => {
  const { uploaded } = await mockCommonApi(page)
  let coinUpdates = 0

  await page.route(`**/api/coins/${coinId}`, async (route) => {
    if (route.request().method() === 'PUT') {
      coinUpdates += 1
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coin),
    })
  })

  await page.goto(`/monety/${coinId}/edytuj`)
  await expect(page.getByRole('heading', { name: 'Edytuj monetę' })).toBeVisible()

  await dropJpeg(page, 'nowy-rewers.jpg')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()
  await page.waitForURL(`/monety/${coinId}`)

  expect(coinUpdates).toBe(1)
  expect(uploaded).toContainEqual({ kind: 'rewers', replace: true })
})
