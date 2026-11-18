import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir, readFile } from 'node:fs/promises'
import type { Catalog } from '../../src/domain/content'
import type { Session } from '../../src/domain/session'

async function number(page: Page, n: number) {
  await expect(page.locator('.question-surface')).toBeVisible()
  const toolbar = page.locator('.mobile-exam-toolbar')
  if (await toolbar.isVisible()) { await toolbar.getByRole('button', { name: 'Questions' }).click(); await page.getByRole('dialog').getByRole('button', { name: new RegExp(`^Question ${n},`) }).click() }
  else await page.locator('.exam-sidebar').getByRole('button', { name: new RegExp(`^Question ${n},`) }).click()
}

test('preview gagal dapat dimuat ulang; API lokal menolak akses lintas situs dan bahan tetap privat', async ({ page, request }) => {
  const cross = await request.get('/api/dev-preview/catalog', { headers: { 'Sec-Fetch-Site': 'cross-site' } })
  expect(cross.status()).toBe(403)
  const other = await request.get('/api/dev-preview/catalog', { headers: { Origin: 'https://elsewhere.test' } })
  expect(other.status()).toBe(403)
  expect((await request.get('/api/dev-preview/unknown')).status()).toBe(404)
  expect((await request.get('/content/private/drafts/gsm-akt22.json')).status()).toBe(403)
  expect((await request.get('/output/pdf/GSM-tinjauan-34-kandidat.pdf')).status()).toBe(403)
  let first = true
  await page.route('**/api/dev-preview/catalog', async route => {
    if (first) { first = false; await route.fulfill({ status: 503, body: '{}' }) }
    else await route.continue()
  })
  await page.goto('/preview')
  await expect(page.getByRole('heading', { name: 'Preview belum tersedia', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click()
  await expect(page.getByText('Preview lokal · draf belum dipublikasikan', { exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('47 questions', { exact: false })).toBeVisible()
  expect((await request.get('/api/dev-preview/catalog')).headers()['cache-control']).toBe('no-store')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'GSM', exact: true })).toBeVisible()
  await expect(page.getByText('Preview lokal · draf belum dipublikasikan', { exact: true })).toHaveCount(0)
})

test('47 soal draf dapat diacak, dipulihkan, dinilai dan diprotes tanpa mengubah sesi biasa atau persetujuan', async ({ page, request }, info) => {
  test.setTimeout(180000)
  const response = await request.get('/api/dev-preview/catalog')
  expect(response.status()).toBe(200)
  expect(response.headers()['cross-origin-resource-policy']).toBe('same-origin')
  const catalog: Catalog = await response.json()
  const module = catalog.modules[0], pkg = module.packages[0]
  expect(pkg.questions).toHaveLength(47)
  expect(pkg.approval.status).toBe('pending')
  expect(pkg.questions.filter(q => q.verification === 'ambiguous')).toHaveLength(21)
  const base = `/preview/modul/${module.id}/paket/${pkg.id}`
  const key = `cbt:draft-preview:v1:${module.id}:${pkg.id}`
  const regularKey = `cbt:v1:${module.id}:${pkg.id}`
  await page.goto(base)
  await page.evaluate(k => localStorage.setItem(k, 'regular-progress-untouched'), regularKey)
  await page.getByRole('button', { name: 'Start practice', exact: true }).click()
  await expect(page).toHaveURL(/\/exam$/)
  const session: Session = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key)
  expect(session.order).toHaveLength(47)
  const imageQuestion = pkg.questions.find(q => q.blocks.some(b => b.type === 'image'))!
  const image = imageQuestion.blocks.find(b => b.type === 'image')!
  await mkdir('reports/visual', { recursive: true })
  for (let i = 0; i < session.order.length; i++) {
    const q = pkg.questions.find(q => q.id === session.order[i])!
    const radios = page.getByRole('radio')
    await expect(radios).toHaveCount(q.options.length)
    if (i !== 46) {
      const selected = i === 1 || i === 2 ? q.options.find(o => o.id !== q.correctOptionId)!.id : q.correctOptionId
      const index = session.optionOrder[q.id].indexOf(selected)
      await radios.nth(index).check()
      if (i === 0) {
        await page.reload()
        await page.getByRole('link', { name: 'Resume practice', exact: true }).click()
        await expect(page.getByRole('radio').nth(index)).toBeChecked()
        const restored: Session = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key)
        expect(restored.order).toEqual(session.order)
        expect(restored.optionOrder).toEqual(session.optionOrder)
      }
    }
    if (q.id === imageQuestion.id) {
      const picture = page.getByRole('img', { name: image.alt, exact: true })
      await expect(picture).toBeVisible()
      await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 15000 }).toBe(true)
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
      await page.screenshot({ path: `reports/visual/${info.project.name}-draft-exam.png` })
    }
    if (i < 46) await page.getByRole('button', { name: 'Next', exact: true }).click()
  }
  await expect(page.getByRole('button', { name: 'Report an answer', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Finish practice', exact: true }).filter({ visible: true }).click()
  await page.getByRole('button', { name: 'Submit answers', exact: true }).click()
  await expect(page.getByText('44 correct out of 47 questions', { exact: true })).toBeVisible()
  const finished: Session = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key)
  expect(Object.keys(finished.answers)).toHaveLength(46)
  await page.getByRole('link', { name: 'Review answers', exact: true }).click()
  await number(page, session.order.indexOf(imageQuestion.id) + 1)
  await expect(page.getByRole('radio')).toHaveCount(0)
  const reviewPicture = page.getByRole('img', { name: image.alt, exact: true })
  await reviewPicture.scrollIntoViewIfNeeded()
  await expect.poll(() => reviewPicture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 15000 }).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: `reports/visual/${info.project.name}-draft-review.png` })
  const before = await page.evaluate(k => localStorage.getItem(k), key)
  await page.getByRole('button', { name: 'Report an answer', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Report an answer', exact: true })
  await dialog.getByLabel('Reason (required)', { exact: true }).fill(`Uji preview privat ${info.project.name} ${crypto.randomUUID()}`)
  const sent = page.waitForResponse(r => r.url().endsWith('/api/dev-preview/complaints') && r.request().method() === 'POST')
  await dialog.getByRole('button', { name: 'Send report', exact: true }).click()
  const report = await sent
  expect(report.status()).toBe(201)
  const receipt = await report.json()
  await expect(dialog.getByRole('heading', { name: 'Report received', exact: true })).toBeVisible()
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before)
  expect(await page.evaluate(k => localStorage.getItem(k), regularKey)).toBe('regular-progress-untouched')
  const env = await readFile('.env.local', 'utf8')
  const secret = process.env.ADMIN_REPORT_TOKEN ?? /^ADMIN_REPORT_TOKEN=(.+)$/m.exec(env)?.[1].trim()
  if (!secret) throw Error('Kunci pengelola lokal belum tersedia.')
  const list = await request.get('/api/admin/complaints', { headers: { Authorization: `Bearer ${secret}` } })
  expect(list.status()).toBe(200)
  const stored = (await list.json()).reports.find((r: { id: string }) => r.id === receipt.id)
  expect(stored).toMatchObject({ questionId: imageQuestion.id, contentVersion: pkg.contentVersion, correctOptionId: imageQuestion.correctOptionId })
  expect(stored.options.map((o: { id: string }) => o.id)).toEqual(session.optionOrder[imageQuestion.id])
  expect((await request.get('/api/admin/complaints')).status()).toBe(401)
  expect((await (await request.get('/api/dev-preview/catalog')).json()).modules[0].packages[0].approval.status).toBe('pending')
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await page.setViewportSize({ width: 320, height: 740 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('timer preview tetap berakhir saat halaman dimuat ulang', async ({ page, request }) => {
  const catalog: Catalog = await (await request.get('/api/dev-preview/catalog')).json()
  const module = catalog.modules[0], pkg = module.packages[0]
  await page.clock.install()
  await page.goto(`/preview/modul/${module.id}/paket/${pkg.id}`)
  await page.getByLabel('Use a timer', { exact: true }).check()
  await page.getByLabel('Duration', { exact: true }).fill('1')
  await page.getByRole('button', { name: 'Start practice', exact: true }).click()
  await page.getByRole('radio').first().check()
  await page.clock.fastForward(61000)
  await page.reload()
  await expect(page).toHaveURL(/\/results$/)
  await expect(page.getByText('Time is up. Your latest answers were submitted automatically.', { exact: true })).toBeVisible()
})
