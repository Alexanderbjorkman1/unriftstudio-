# Running DetailFlow on your computer

Everything runs on your own machine. The database and the job photos are plain
files in the `data` folder next to this one — nothing is uploaded anywhere, and
the app works with the internet off.

---

## The easy way

1. Install [Node.js](https://nodejs.org) if you don't have it — press the big
   **LTS** button and click through the installer. You only do this once.
2. Open the project folder and double-click:

   | Your computer | Double-click |
   | --- | --- |
   | Mac | **`start.command`** |
   | Windows | **`start.bat`** |
   | Linux | **`start.sh`** |

That's it. A window opens, sets itself up the first time (a minute or two), and
your browser lands on the app.

**Leave that window open** while you use DetailFlow — it *is* the app. Closing it
or pressing `Ctrl+C` shuts the site down. To use it again another day, just
double-click the same file.

> **Mac:** the first time, macOS may say the file is from an unidentified
> developer. Right-click `start.command` → **Open** → **Open**. You only have to
> do that once.

## Where to go once it opens

| Address | What it is | Sign in with |
| --- | --- | --- |
| http://localhost:3000 | Your customer booking website | nothing — it's public |
| http://localhost:3000/dashboard | Your admin workspace | `alex@detailflow.se` / `demo1234` |
| http://localhost:3000/app | The technician app | `johan@detailflow.se` / `demo1234` |

A good first run-through: book a detail on the booking site as if you were a
customer, then sign in to the dashboard and watch it appear on the calendar with
a technician already assigned.

## On your phone

While the app is running, the window shows two addresses:

```
- Local:    http://localhost:3000
- Network:  http://192.168.1.42:3000     ← this one
```

Type the **Network** one into your phone's browser while it's on the same Wi-Fi.
The technician app at `/app` then works like a real phone app, camera and all.
Your computer needs to stay awake and running the app.

---

## The terminal way

If you'd rather type commands:

```bash
npm install     # first time only
npm run dev
```

Then open http://localhost:3000.

## Your data

Everything lives in the **`data`** folder:

- `detailflow.db` — every customer, job, invoice and setting
- `uploads/` — the before & after photos

The first launch fills it with demo data so the app isn't empty. Two things worth
knowing:

- **To back up:** copy the `data` folder somewhere safe. That's the whole backup.
- **To start fresh:** run `npm run seed`, which wipes it and rebuilds the demo
  data. Do this before entering real customers, so you're not mixing them with
  the fake ones.

Before you use it for real work, change the demo passwords under
**Settings → Employees** — they're written down in this repo for anyone to read.

---

## Using it for real work

Open **Settings → Go live**. The checklist there is computed from your actual
data, not ticked by hand, and it will tell you what is still outstanding:

1. **Create your own login**, then **disable the demo accounts**. Their passwords
   are printed in this README for anyone to read. Disabling refuses to run until
   you have your own owner account, so you cannot lock yourself out.
2. **Put in your business details** (Settings → Business). They appear on your
   booking site and on every invoice.
3. **Replace the services and prices** (Settings → Services) with what you
   actually sell, and set your real **opening hours** (Settings → Online booking).
4. **Clear the demo bookings** when you are ready to start from an empty diary.
   It takes a backup first and asks you to type CLEAR.

### Optional accounts

Everything below is off by default and the app works without any of it. Add a
key and that feature switches on — no code changes.

| What you get | Sign up at | Put in `.env.local` |
| --- | --- | --- |
| Emailed confirmations and reminders | [resend.com](https://resend.com) | `RESEND_API_KEY` |
| SMS confirmations and reminders | [46elks.com](https://46elks.com) (Swedish) or Twilio | `ELKS_API_USERNAME`, `ELKS_API_PASSWORD` |
| Card deposits at booking | [stripe.com](https://stripe.com) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

Until then, every message is still written down and shown in **Messages**,
marked with the exact variable to set — so you can see what your customers
*would* have received before spending anything.

**Test before trusting it.** Settings → Messages has a "Send test" button next
to each channel once its key is set. Send one to yourself first.

---

## Later: putting it on the internet

Only needed if you want to send the booking link to real customers, or use it
away from your own Wi-Fi. There's a `Dockerfile` in the repo for hosts that give
you a persistent disk (Railway, Fly.io, Render, a VPS).

Note it can't go on Vercel or Netlify — they wipe the filesystem between
requests, so the database and photos would disappear. Ask me when you want to
tackle this and I'll walk you through it.
