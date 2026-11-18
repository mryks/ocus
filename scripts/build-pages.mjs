import { createHash } from 'node:crypto'
import { readFile, writeFile, unlink } from 'node:fs/promises'

// Only the trusted Vite build template is processed, never request or question HTML.
const root = 'dist-pages'
const html = await readFile(`${root}/index.html`, 'utf8')
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]
if (scripts.length !== 1 || !scripts[0][1].startsWith('/ocus/assets/')) throw Error('Unexpected Pages script template.')
const bytes = await readFile(`${root}/${scripts[0][1].slice('/ocus/'.length)}`)
const digest = 'sha256-' + createHash('sha256').update(bytes).digest('base64')
const backend = 'https://ocus-latihan.vinoushawk2.chatgpt.site'
// Pages cannot set application HTTP headers. Meta supports CSP except frame-ancestors/reporting.
const policy = `default-src 'none'; script-src '${digest}' 'strict-dynamic'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self' ${backend}; object-src 'none'; base-uri 'none'; form-action 'self' ${backend}; require-trusted-types-for 'script'`
const result = html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" /><meta http-equiv="Content-Security-Policy" content="${policy}" /><meta name="referrer" content="strict-origin-when-cross-origin" />`)
  .replace(scripts[0][0], scripts[0][0].replace('src=', `integrity="${digest}" src=`))
await writeFile(`${root}/index.html`, result)
await writeFile(`${root}/.nojekyll`, '')
// These are Cloudflare-specific and have no purpose in the Pages artifact.
for (const file of ['_headers', '_redirects', '_routes.json']) try { await unlink(`${root}/${file}`) } catch (error) { if (error.code !== 'ENOENT') throw error }
console.log('Pages frontend ready at /ocus/; reports use the existing backend.')
