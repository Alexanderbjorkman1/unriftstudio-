# Running DetailFlow

Two ways to use the platform. Start with the first — it takes two minutes and
needs no accounts.

---

## Option 1 — On your own computer (recommended for testing)

You need [Node.js](https://nodejs.org) version 20 or newer. Check with `node -v`.

```bash
git clone -b claude/car-detailing-app-we7ab1 https://github.com/Alexanderbjorkman1/unriftstudio-.git
cd unriftstudio-
npm install
npm run seed
npm run dev
```

Open **http://localhost:3000**.

| Where | What | Sign in with |
| --- | --- | --- |
| `/` | Customer booking website | nothing — it's public |
| `/dashboard` | Your admin workspace | `alex@detailflow.se` / `demo1234` |
| `/app` | Technician app | `johan@detailflow.se` / `demo1234` |

### Use it on your phone

`npm run dev` prints two addresses:

```
- Local:    http://localhost:3000
- Network:  http://192.168.1.42:3000     ← this one
```

Open the **Network** address on your phone while it's on the same Wi-Fi. The
technician app at `/app` then behaves like a real phone app, camera upload
included. Your computer has to stay awake and on the same network.

### Starting over

`npm run seed` wipes the database and rebuilds the demo data. Safe to run any
time you want a clean slate.

---

## Option 2 — A real URL on the internet

Useful once you want to send the booking link to an actual customer, or use it
away from your own Wi-Fi.

### What this app needs from a host

DetailFlow keeps its data in a **SQLite file** and stores **job photos on disk**,
both under the path in `DATABASE_PATH`. So the host must give you a **persistent
disk** (sometimes called a volume).

This rules out Vercel and Netlify — their filesystems reset between requests, so
every booking and photo would disappear. Hosts that work: **Railway**,
**Fly.io**, **Render** (paid tier), or any VPS.

### Railway, step by step

1. Sign in at [railway.app](https://railway.app) with your GitHub account.
2. **New Project → Deploy from GitHub repo →** pick `unriftstudio-`.
3. Open **Settings → Source** and set the branch to `claude/car-detailing-app-we7ab1`.
   Railway detects the `Dockerfile` in the repo and builds from it.
4. Open the **Variables** tab and add:

   ```
   DATABASE_PATH = /data/detailflow.db
   ```

5. Open the **Volumes** tab, **add a volume**, and set its mount path to `/data`.
   This is the step that keeps your bookings and photos between deploys — don't
   skip it.
6. Under **Settings → Networking**, click **Generate Domain**.

First boot creates the database and fills it with the demo data automatically.
Sign in at `your-domain.up.railway.app/login` with `alex@detailflow.se` /
`demo1234`.

### Before real customers use it

- **Change the passwords.** Settings → Employees → edit each person. The demo
  accounts are documented publicly in this repo.
- **Put in your own business details** under Settings → Business: name, address,
  org. number, phone. They appear on the booking site and on every invoice.
- **Set your opening hours and services** under Settings → Online booking and
  Settings → Services, so the booking calendar reflects your real availability.
- **Back up the volume.** Everything lives in that one folder. Copying
  `detailflow.db` and the `uploads` folder somewhere safe is a complete backup.

---

## What was tested, and what wasn't

Verified on a clean checkout in this repo: `npm install`, `npm run seed`,
`npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, and the
production standalone server booting against an empty data directory and seeding
itself.

**Not verified:** the Docker image build. The environment this was written in had
no Docker daemon, so `Dockerfile` is written from the (verified) standalone build
but has never been built or run. If Railway's build fails, the error will be in
its build log and the fix will be small — say the word and I'll sort it out.

---

## Configuration

| Variable | What it does | Default |
| --- | --- | --- |
| `DATABASE_PATH` | Where the database and `uploads/` folder live | `./data/detailflow.db` |
| `PORT` | Port the server listens on | `3000` |

That's the whole list. Sessions use random tokens stored in the database, so
there is no signing secret to manage.
