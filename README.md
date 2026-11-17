# Doctor Platform — Admin Dashboard

Admin console and call center for the Doctor Appointment & Telemedicine platform.
Built with Next.js 16, React 19, Tailwind CSS 4, TanStack Query, Recharts and the Agora Web SDK.

**Pages:** Dashboard · Call center · Appointments · Doctors (profile, chambers, weekly schedule, leave, verification, doctor-app login) · Patients · Payments · Specialties & designations · Locations · Integrations (Agora, Gmail, Firebase) · Platform fees · Staff & roles · Audit log.

## Local development

```bash
npm install
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
npm run dev                        # http://localhost:3000
```

## Deploy to Vercel

1. **Import** this repository at <https://vercel.com/new>. Vercel detects Next.js automatically —
   no build settings to change (build: `next build`, output: `.next`, Node ≥ 20.9).
2. **Environment variable** (Project → Settings → Environment Variables), for Production and Preview:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | Public HTTPS URL of the API, e.g. `https://api.yourdomain.com/api/v1` |

   It is baked into the build, so **redeploy after changing it**.
3. **Allow the dashboard in the API's CORS list** — in the backend `.env`:
   ```env
   CORS_ORIGINS=https://your-admin.vercel.app,https://*.vercel.app
   ```
   (`*.vercel.app` also allows preview deployments.) Restart the API.
4. Open the Vercel URL and sign in with an admin account.

> The API must be reachable from the internet over **HTTPS**. A dashboard on Vercel cannot use an API
> that only runs on `localhost`, except in the browser of that same computer.

## Notes
- The access token is kept in `localStorage`; move to httpOnly cookies before a public launch.
- Demo login hints are shown only outside production builds.
- Security headers (no framing, nosniff, noindex) are set in `next.config.ts`.
