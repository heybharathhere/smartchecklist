# Smart Checklist

An offline-first checklist and task manager that runs entirely in the browser. No backend, no
database server, no account. Checklists and tasks live in IndexedDB on the device; preferences live
in LocalStorage.

React 18 · TypeScript · Vite · Tailwind · Zustand · React Router · dnd-kit · Recharts · Framer Motion

---

## Deploying to GitHub Pages from the browser

No local toolchain needed — GitHub Actions does the build.

1. Create a new repository on GitHub (public or private, either works with Pages enabled).
2. Upload the contents of this folder. On the repo page use **Add file → Upload files**, then drag
   the whole folder in. Keep the structure intact, including `.github/workflows/deploy.yml` and
   `public/`.
   - GitHub's web uploader sometimes skips dot-folders. If `.github` does not appear, create the
     file manually: **Add file → Create new file**, name it
     `.github/workflows/deploy.yml`, and paste the contents in.
3. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Push anything to `main` (uploading counts). The workflow installs, builds and publishes.
5. The URL appears in the workflow summary and under Settings → Pages.

### Why it works at any URL

- `base: './'` in `vite.config.ts` makes every asset path relative, so the same build runs at
  `user.github.io`, `user.github.io/repo/` or a custom domain with no config change.
- Routing is hash-based (`/#/checklists`), so there is no server rewrite to configure. The workflow
  also copies `index.html` to `404.html` in case you switch to `BrowserRouter` later.

### Local development, if you ever want it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # emits dist/
npm run typecheck  # tsc --noEmit, separate from the build on purpose
```

`build` deliberately does not run `tsc`. Vite strips types with esbuild, so a type error cannot
break a deploy — run `typecheck` when you want the report.

---

## Architecture

```
src/
  types/index.ts              every domain interface in one place
  lib/
    db.ts                     IndexedDB wrapper, schema, migrations, transactional restore
    tasks.ts                  tree building, progress, filtering, sorting, Eisenhower quadrants
    date.ts                   date-fns helpers, recurrence maths, relative labels
    stats.ts                  charts, streaks, badges, productivity score
    transfer.ts               JSON/CSV export, import validation, downloads
    palette.ts                colour, icon, priority and status registries
    seed.ts                   five built-in templates
  store/
    useData.ts                all IndexedDB-backed domain actions, with undo
    usePrefs.ts               preferences, persisted to LocalStorage
    useUI.ts                  transient UI state (filters, selection, dialogs)
    useToasts.ts              notifications
  hooks/                      theme, shortcuts, reminders, auto-backup, connectivity
  components/
    ui/                       primitives, fields, modal, menu, toaster
    layout/                   sidebar, top bar, bottom nav, command palette, quick add
    checklists/               card and create/edit dialog
    tasks/                    row, detail dialog, bulk bar, filter bar
    views/                    list, kanban, calendar, timeline, compact
    dashboard/widgets.tsx     stat cards, heatmap, upcoming, streak, activity, category split
    focus/                    focus mode and pomodoro
  pages/                      one file per route
```

### IndexedDB schema (`smart-checklist`, version 1)

| Store        | Key    | Indexes                                              |
| ------------ | ------ | ---------------------------------------------------- |
| `checklists` | `id`   | `order`, `archived`, `category`                      |
| `tasks`      | `id`   | `checklistId`, `parentId`, `dueDate`, `status`       |
| `activity`   | `id`   | `ts`                                                 |
| `templates`  | `id`   | —                                                    |
| `filters`    | `id`   | —                                                    |
| `backups`    | `id`   | `createdAt`                                          |
| `meta`       | `key`  | —                                                    |

Add migrations in the `onupgradeneeded` block in `lib/db.ts` and bump `DB_VERSION`.

### State model

`useData` holds the whole dataset in memory and writes through to IndexedDB on every action —
optimistic updates, so the UI never waits on storage. Destructive actions push a revert function
onto `undo`, which the toast surfaces as an Undo button.

### Theming

Every colour is a CSS custom property in `src/index.css`, exposed to Tailwind through
`tailwind.config.js`. Light, dark and high-contrast are class switches on `<html>`; an inline script
in `index.html` applies the saved theme before React mounts, so there is no flash.

---

## Features

**Checklists** — create, edit, duplicate, archive, restore, delete, favourite, pin, custom colour
and icon, categories, tags, per-list default view, drag to reorder.

**Tasks** — unlimited nesting, priorities, statuses, notes, start and due dates, reminders, tags,
recurrence, drag to reorder and re-parent, indent/outdent, bulk complete, reopen, delete, move,
re-prioritise and re-date.

**Views** — list (nested, draggable), kanban (drag between status columns), calendar, 28-day
timeline, compact table.

**Search** — global search in the top bar, per-list filtering, filters for status, priority,
category, tag and due window, six sort orders, saved views.

**Smart bits** — automatic progress roll-up, smart sort by urgency then importance, recurring tasks
that spawn the next occurrence when ticked, quick add with `!high @tomorrow #tag` shorthand,
recently opened lists, Eisenhower matrix, focus mode with a pomodoro timer.

**Analytics** — daily, weekly and monthly charts, completion rate ring, category split, completion
heatmap, streaks, eight badges, productivity score.

**Data** — JSON export and import (merge or replace), CSV export, per-checklist CSV, manual
snapshots, daily automatic snapshots with a configurable retention count, restore, download and
delete.

**PWA** — installable, works fully offline after the first load, hand-rolled service worker with no
build-time manifest, maskable icons, app shortcuts.

**Accessibility** — keyboard navigable throughout, focus trapping in dialogs, visible focus rings,
ARIA roles and labels on controls, high-contrast theme, reduced-motion support, skip link.

### Keyboard shortcuts

`Ctrl/Cmd K` command palette · `N` add task · `Shift N` new checklist · `/` search · `F` focus mode ·
`Ctrl/Cmd Shift L` switch theme · `G` then `D`/`C`/`A`/`T`/`S`/`M`/`R` to navigate · `?` shortcut
list · `Esc` close or clear selection.

---

## Known limits

- Reminders fire while a tab is open. True background notifications need a push service, which
  means a server.
- Everything is per-device. There is no sync by design; move data with export and import.
- Clearing site data in the browser deletes the database. The app asks for persistent storage, but
  browsers can still evict under pressure — keep exports.
- Habit tracking and goal management are not included yet; they need their own schema.
