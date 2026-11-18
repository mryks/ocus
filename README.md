# OCUS.

Student practice platform at [mryks.github.io/ocus](https://mryks.github.io/ocus/).

One combined question bank per module. Choose a question count, optionally set a timer, and review explanations after submitting. Questions and choices are always shuffled; progress stays in the browser. Students can report an answer before practice or during review.

The interface is English. Questions, explanations, and the Guide / Storage & privacy content are Indonesian.

## Development

Node24: `npm ci`, then `npm run dev`. Run `npm run lint`, `npm test`, and `npm run build:pages` before publishing. Browser tests use Playwright with Edge: `npm run test:e2e` (private historical-preview tests require the local curation workspace).

GitHub Actions publishes the frontend to GitHub Pages. The existing Worker/D1 service handles reports; administrator credentials remain on the server. See [hosting details](docs/GITHUB_PAGES.md).

Original PDFs, local extraction/curation reports, databases, and secrets are excluded from this public repository. New material must be reviewed before it enters the approved catalog. Historical source-key decisions do not mean every question has independent scientific verification.
