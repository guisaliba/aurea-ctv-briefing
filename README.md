# Ad Creative Brief Generator

Simple fullstack web app for generating creative briefs in `pt-BR` and requesting in-app AI copy suggestions without leaving the page.

## Structure

- `public/index.html`: single-page app built with plain HTML, CSS, and vanilla JavaScript
- `api/generate.js`: Vercel serverless function that validates the access code and proxies requests to the Anthropic API
- `vercel.json`: Vercel deployment settings

## Environment Variables

Create a local `.env.local` file for development:

```env
ANTHROPIC_API_KEY=sk-ant-...
ACCESS_CODE=your-access-code
```

Set the same variables in Vercel for preview and production deployments.

## Local Development

Run the project with the Vercel CLI:

```bash
vercel dev
```

## Deployment

```bash
vercel
vercel --prod
```

## Notes

- The Anthropic API key is never exposed to the client.
- `ACCESS_CODE` is validated server-side on every AI generation request.
- The project uses no frontend framework, bundler, or build step.

## License

MIT
