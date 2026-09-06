# DAMP — Department Academic Mentorship Program, IIT Bombay

Source for the website of the **Physics Department Academic Mentorship Program (DAMP), IIT Bombay**, a student‑run, peer‑mentorship program for Engineering Physics undergraduates. It gathers the guidance a senior would give a junior in one place: course reviews, elective/minor guidance, senior experiences, an alumni directory, faculty AMAs, newsletters, FAQs, and the mentor team.

Built with **Jekyll** and hosted on **GitHub Pages**. Any push to `master` is built and deployed automatically.

---

## Table of contents

- [Running it locally](#running-it-locally)
- [How the website is laid out](#how-the-project-is-laid-out)
- [Common tasks: adding & updating content](#common-tasks-adding--updating-content)
  - [Add or edit a course review](#add-or-edit-a-course-review)
  - [Add or edit a team member](#add-or-edit-a-team-member)
  - [Add a newsletter issue](#add-a-newsletter-issue)
  - [Update the alumni directory](#update-the-alumni-directory)
  - [Add an experience or AMA](#add-an-experience-or-ama)
  - [Show a page as a homepage tile](#show-a-page-as-a-homepage-tile)
  - [Add a whole new section](#add-a-whole-new-section)
- [Changing the look (colors, fonts, spacing)](#changing-the-look-colors-fonts-spacing)
- [Deployment](#deployment)
- [Credits](#credits)

---

## Running it locally

You need **Ruby** with **Bundler**. From the repo root:

```bash
bundle install
bundle exec jekyll serve
```

Then open <http://localhost:4000>. Jekyll rebuilds on save; refresh the browser to see changes. To do a one‑off production build (output lands in `_site/`):

```bash
bundle exec jekyll build
```

---

## How the project is laid out

```
_config.yml            Site settings (title, socials, contact email, homepage tiles)
_data/                 Structured content (edit these to update the site)
  team26.yml           The mentor roster
  newsletters.yml      Newsletter issues (newest first)
  alumni.csv           Alumni directory
_layouts/              Page templates (home, post, page, landing, allposts)
_includes/             Reusable partials (header, footer, banner, tiles, breadcrumbs)
_posts/                Faculty interview / AMA posts
_sass/                 Styles (see "Changing the look")
  libs/_vars.scss      >>> the single source of truth for colors, fonts, sizes <<<
  components/          Per-component styles (tiles, cards, courses, team, damp, …)
assets/
  css/main.scss        Style entry point + Google Fonts import
  js/physics.js        The physics simulation engine
  js/course-filter.js  Client-side search/filter for course reviews
  images/team26/       Mentor photos
files/news/            Newsletter PDFs and thumbnails
p/                     The site's pages (courses, exp, faq, kaleidoscope, resources, team)
```

**Rule of thumb:** content that repeats (mentors, newsletters, alumni) lives in `_data/` and is rendered by a template, edit the data file, not HTML. One‑off page copy lives in the `p/**/*.md` file itself.

---

## Common tasks: adding & updating content

### Add or edit a course review

A review is just a Markdown page with `review: true` in its front matter. **The browse/search page ([`p/courses/browse.md`](p/courses/browse.md)) automatically collects every page with `review: true`** — you don't register it anywhere. Reviews live under `p/courses/<category>/review/`.

Create e.g. `p/courses/core/review/ph101_2024a.md`:

```yaml
---
layout: page
title: PH 101
show_tile: false
code: PH101                     # course code (shown on the card)
course_name: 'Classical Mechanics'
category: core                  # core | de | ie | hss | minor
sem: 1                          # semester number
year: 2024
term: autumn                    # autumn | spring
prof: 'A. Professor'
review: true                    # <-- makes it appear in the catalogue
workload:                       # optional; leave blank if unknown
grading:                        # optional; leave blank if unknown
---

Write the review body here in Markdown.
```

The filter/search bar (category, semester, term, year) is generated from the reviews that exist, so new categories/terms show up on their own.

### Add or edit a team member

Edit **[`_data/team26.yml`](_data/team26.yml)**. Each mentor is one entry:

```yaml
- name: Werner Heisenberg
  img: assets/images/team/uncertainity.jpg     # drop the photo in assets/images/team/
  bio: "One or two candid sentences. Emoji and <b>bold</b> are fine."
  links:
    - { type: email,     url: 'mailto:wh@example.com' }
    - { type: instagram, url: 'https://www.instagram.com/i_hate_erwin' }
    - { type: linkedin,  url: 'https://www.linkedin.com/in/boss' }
    - { type: github,    url: 'https://github.com/heisenberg' }
    - { type: twitter,   url: 'https://x.com/catlover' }
    - { type: letterboxd, url: 'https://boxd.it/cats' }
```

Supported `type` values: `email`, `instagram`, `linkedin`, `github`, `twitter`, `letterboxd`. The card layout, the accent colour (auto‑cycled), and the photo hover effect are all handled for you by [`p/team/team26-27.md`](p/team/team26-27.md). For a new academic year, copy that file (e.g. `team27-28.md`), point it at a new data file, and include it from [`p/team_page.md`](p/team_page.md).

### Add a newsletter issue

1. Put the PDF in `files/news/` and a cover image in `files/news/thumbnails/`.
2. Add an entry to the **top** of [`_data/newsletters.yml`](_data/newsletters.yml) (the list is newest‑first; the first entry becomes the featured "Latest issue" on the Kaleidoscope page):

```yaml
- title: Spring 2026
  file: /files/news/news2026-spring.pdf
  thumb: /files/news/thumbnails/news2026-spring.jpg
  desc: Short one-line description
```

Both the featured card and the [archive grid](p/kaleidoscope/newsletter.md) update automatically.

### Update the alumni directory

Edit **[`_data/alumni.csv`](_data/alumni.csv)** — one row per alum (name, field, destination, contacts, etc.). Keep the header row intact.

### Add an experience or AMA

- **Experiences** (research/industry internships, TA): add content under `p/exp/`.
- **Faculty AMAs / interviews**: add a Markdown file to `_posts/` named `YYYY-MM-DD-name.md`, or under `p/kaleidoscope/ama/`.

### Show a page as a homepage tile

The homepage shows two tile groups (`start` and `more`). Any page opts in through its front matter:

```yaml
show_tile: true
tile_group: start      # start | more
tile_order: 2          # position within the group
sim: lorenz            # which simulation plays in the tile
accent: amber          # the tile's accent colour
cta: 'Browse reviews'  # call-to-action label
```

### Add a whole new section

1. Create `p/<name>.md` with `layout: post`, a `title`, `description`, and — per **The Instrument Rule** — **one unused `accent` paired with one `sim`** (see the pairings below).
2. Add `nav-menu: true` to list it in the header nav, and the tile keys above if it should appear on the homepage.
3. Section pages inherit their `accent` automatically (it tints cards, chips, and hover states on that page).

---

## Changing the look (colors, fonts, spacing)

**All design tokens live in one file: [`_sass/libs/_vars.scss`](_sass/libs/_vars.scss).** Change a colour or font there and it cascades across the whole site through the `_palette()` / `_font()` / `_size()` helpers.

- **Colours** — the `$palette` map: `bg` (page), `bg-alt` (cards), `bg-deep` (wells/footer), `fg`/`fg-dim` (text), `border` (edges), and the accents (`accent1` = electric cyan, the interactive voice; `accent2`–`accent5` = the section accents violet/amber/green/rose).
- **Fonts** — the `$font` map: `family` (DM Sans, body + labels), `family-display` (Newsreader, headings), `family-fixed` (DM Mono, **code/data only**). If you change a font family here, also update the Google Fonts `@import` at the top of [`assets/css/main.scss`](assets/css/main.scss).
- **Sizes/spacing** — the `$size` map (radius, container width, header height, rhythm)
---
## Deployment

Hosted on **GitHub Pages**. Pushing to the `master` branch triggers an automatic build and deploy - there is no manual deploy step. Preview locally with `bundle exec jekyll serve` before pushing.
---

## Credits
Originally based on the **Forty** theme by **HTML5 UP**, since then changed heavily and rebuilt for EP DAMP. Fonts: Newsreader, DM Sans, and DM Mono (Google Fonts). Credits to Soham (@soham10) for the physics simulations!
