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
