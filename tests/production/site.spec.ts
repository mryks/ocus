import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile, mkdir } from 'node:fs/promises'
import rawCatalog from '../../src/content/catalog.json' with { type: 'json' }
import { catalogSchema } from '../../src/domain/content'
import type { Session } from '../../src/domain/session'

const catalog = catalogSchema.parse(rawCatalog)
const module = catalog.modules[0], pkg = module.packages[0]
const pages = process.env.OCUS_TEST_PAGES === '1'
const appPath = (path: string) => pages ? '/ocus/#' + path : path
const apiPath = (path: string) => (process.env.OCUS_TEST_REPORTS_ORIGIN ?? '') + path
const base = appPath(`/module/${module.id}`)
const key = `cbt:v1:${module.id}:${pkg.id}`
async function number(page: Page, n: number) {
  await expect(page.locator('.question-surface')).toBeVisible()
  const toolbar = page.locator('.mobile-exam-toolbar')
  if (await toolbar.isVisible()) {
    await toolbar.getByRole('button', { name: 'Questions' }).click()
    await page.getByRole('dialog').getByRole('button', { name: new RegExp(`^Question ${n},`) }).click()
  } else await page.locator('.exam-sidebar').getByRole('button', { name: new RegExp(`^Question ${n},`) }).click()
}
test('produksi: katalog, CSP, sesi, gambar, nilai, protes tersimpan dan akses pengelola', async ({ page, request }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    (window as unknown as { cspViolations: string[] }).cspViolations = []
    document.addEventListener('securitypolicyviolation', event => (window as unknown as { cspViolations: string[] }).cspViolations.push(`${event.effectiveDirective}: ${event.blockedURI}; ${event.sourceFile}:${event.lineNumber}; ${event.sample}`))
  })
  const home = await page.goto(appPath('/'))
  expect(home?.status()).toBe(200)
  if (pages) await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /strict-dynamic/)
  else expect(home?.headers()['content-security-policy']).toContain("'strict-dynamic'")
  await expect(page.getByRole('heading', { name: 'GSM', exact: true })).toBeVisible()
  await expect(page.getByText(`${pkg.questions.length} questions`, { exact: false })).toBeVisible()
  await expect(page.getByText('Preview lokal', { exact: false })).toHaveCount(0)
  await page.goto(base)
  await page.getByRole('button', { name: 'Start practice', exact: true }).click()
  const session: Session = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key)
  const first = pkg.questions.find(q => q.id === session.order[0])!
  await page.getByRole('radio').nth(session.optionOrder[first.id].indexOf(first.correctOptionId)).check()
  await page.reload()
  await page.getByRole('link', { name: 'Resume practice', exact: true }).click()
  await expect(page.getByRole('radio').nth(session.optionOrder[first.id].indexOf(first.correctOptionId))).toBeChecked()
  const imageQuestion = pkg.questions.find(q => q.blocks.some(b => b.type === 'image'))!
  const image = imageQuestion.blocks.find(b => b.type === 'image')!
  await number(page, session.order.indexOf(imageQuestion.id) + 1)
  await page.getByRole('radio').nth(session.optionOrder[imageQuestion.id].indexOf(imageQuestion.correctOptionId)).check()
  const picture = page.getByRole('img', { name: image.alt, exact: true })
  await picture.scrollIntoViewIfNeeded()
  await expect.poll(() => picture.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await mkdir('reports/visual', { recursive: true })
  await page.screenshot({ path: `reports/visual/${info.project.name}-production-exam.png` })
  await page.getByRole('button', { name: 'Finish practice', exact: true }).filter({ visible: true }).click()
  await page.getByRole('button', { name: 'Submit answers', exact: true }).click()
  await expect(page.getByText(`${first.id === imageQuestion.id ? 1 : 2} correct out of ${pkg.questions.length} questions`, { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Review answers', exact: true }).click()
  await number(page, session.order.indexOf(imageQuestion.id) + 1)
  await page.getByRole('button', { name: 'Report an answer', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const reason = `Uji deployment OCUS ${info.project.name} ${crypto.randomUUID()} — laporan pengujian`
  await dialog.getByLabel('Reason (required)', { exact: true }).fill(reason)
  const sent = page.waitForResponse(r => r.url().endsWith('/api/complaints') && r.request().method() === 'POST')
  await dialog.getByRole('button', { name: 'Send report', exact: true }).click()
  const response = await sent
  expect(response.status()).toBe(201)
  const receipt = await response.json()
  await expect(dialog.getByRole('heading', { name: 'Report received', exact: true })).toBeVisible()
  const env = await readFile('.env.production.local', 'utf8')
  const token = /^ADMIN_REPORT_TOKEN=(.+)$/m.exec(env)?.[1].trim()
  if (!token) throw Error('Kunci pengelola produksi belum tersedia.')
  expect((await request.get(apiPath('/api/admin/complaints'))).status()).toBe(401)
  const reportList = await request.get(apiPath('/api/admin/complaints'), { headers: { Authorization: `Bearer ${token}` } })
  expect(reportList.status()).toBe(200)
  expect((await reportList.json()).reports.find((r: { id: string }) => r.id === receipt.id)).toMatchObject({ reason, questionId: imageQuestion.id, contentVersion: pkg.contentVersion })
  await page.goto(appPath('/admin/reports'))
  await page.getByLabel('Administrator access key', { exact: true }).fill(token)
  await page.getByRole('button', { name: 'Open reports', exact: true }).click()
  await expect(page.getByText(reason, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByText(reason, { exact: true })).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => /token/i.test(k)))).toBe(false)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByLabel('Administrator access key', { exact: true })).toHaveValue('')
  expect(errors).toEqual([])
  expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([])
  for (const path of ['/api/dev-preview/catalog', '/content/private/drafts/gsm-akt22.json', '/output/pdf/GSM-tinjauan-34-kandidat.pdf']) expect((await request.get(apiPath(path))).status()).toBe(404)
  await page.goto(appPath('/preview'))
  await expect(page.getByRole('heading', { name: 'Page unavailable', exact: true })).toBeVisible()
})

test('production pre-practice report and subset score work independently of a full bank session',async({page},info)=>{
  await page.goto(base)
  await page.getByRole('button',{name:'Report an answer',exact:true}).click()
  const dialog=page.getByRole('dialog')
  await dialog.getByLabel('Find a question').fill('1')
  await dialog.locator('.question-picker-item').first().click()
  await dialog.getByLabel('Reason (required)',{exact:true}).fill('Uji deployment OCUS pre-practice '+info.project.name+' '+crypto.randomUUID())
  await dialog.getByLabel('Name or initials (optional)').fill('QA')
  await dialog.getByRole('button',{name:'Send report',exact:true}).click()
  await expect(dialog.getByRole('heading',{name:'Report received',exact:true})).toBeVisible()
  await dialog.getByRole('button',{name:'Close',exact:true}).click()
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull()
  await page.getByLabel('Number of questions',{exact:true}).fill('2')
  await page.getByRole('button',{name:'Start practice',exact:true}).click()
  const session:Session=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key)
  expect(session.order).toHaveLength(2)
  const q=pkg.questions.find(q=>q.id===session.order[0])!
  await page.getByRole('radio').nth(session.optionOrder[q.id].indexOf(q.correctOptionId)).check()
  await page.getByRole('button',{name:'Finish practice',exact:true}).filter({visible:true}).click()
  await page.getByRole('button',{name:'Submit answers',exact:true}).click()
  await expect(page.locator('.score-display strong')).toHaveText('50')
})
