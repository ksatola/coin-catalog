import { expect, test } from '@playwright/test'

test('Opowieść allows creating and navigating a page', async ({ page }) => {
  await page.goto('/opowiesc/edytuj/nowa')
  await page.getByLabel('Tytuł').fill('Monety polskie')
  await page.getByLabel('Treść Markdown').fill('Pierwszy akapit.')
  await page.getByRole('button', { name:'Zapisz' }).click()
  await expect(page.getByRole('heading', { name:'Monety polskie' })).toBeVisible()
  await expect(page.getByText('Pierwszy akapit.')).toBeVisible()
  await expect(page.getByRole('button', { name:'Monety polskie' })).toBeVisible()
})
