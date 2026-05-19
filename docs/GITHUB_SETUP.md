# GitHub OAuth setup (Clerk)

Merc imports and exports repositories using the GitHub API with the user's OAuth token from Clerk.

## Clerk dashboard

1. Open **Clerk Dashboard → User & Authentication → Social connections → GitHub**.
2. Enable **GitHub** and **Use custom credentials**.
3. Create a [GitHub OAuth App](https://github.com/settings/developers) (type: OAuth App, not GitHub App).
4. Set the callback URL to the value Clerk shows for GitHub.
5. Paste **Client ID** and **Client secret** into Clerk.
6. Under **Scopes**, ensure **`repo`** is requested so Merc can read/write public and private repositories.

## Required scope

- `repo` — read/write access to code and metadata for public and private repositories

## Local development

- Run Convex: `npx convex dev`
- Run Inngest: `npm run inngest:dev`
- Ensure `INTERNAL_API_KEY` is set in `.env.local` (Convex + Next.js) for background jobs.
