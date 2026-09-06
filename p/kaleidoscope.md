---
layout: post
title: Kaleidoscope
description: AMAs with profs, Alumni Directory, Talks and Information Sessions
image: assets/images/ka.jpg
nav-menu: true
sim: chladni
accent: violet
tile_group: more
tile_order: 2
cta: 'Look through'
---

<!-- Content Section -->
<div class="row">
  <br>
  <div class="6u 12u$(small)">
    <div class="card">
    <h3><a href="kaleidoscope/ama.html">Ask Me Anything!</a></h3>
    <p>Listen in as faculty members talk about their research and get candid about their lives and experiences</p>
    </div>
  </div>
  <div class="6u$ 12u$(small)">
    <div class="card">
    <h3><a href="kaleidoscope/alumni.html">Alumni Directory</a></h3>
    <p>Find out what your seniors did after they graduated from this department, and how to contact them</p>
    </div>
  </div>

  {% assign latest = site.data.newsletters | first %}
  <div class="12u$">
    <div class="newsletter-feature">
      <div class="nf-lede">
        <span class="nf-kicker">Newsletter &middot; Latest issue</span>
        <h3 class="nf-title">{{ latest.title }}</h3>
        {% if latest.desc %}<p class="nf-desc">{{ latest.desc }}</p>{% endif %}
        <p class="nf-tag">Can't keep up? FOMO much? Here's everything you missed.</p>
      </div>
      <div class="nf-actions">
        <a class="feature-link" href="{{ latest.file }}" target="_blank" rel="noopener">Read the latest issue
          <svg width="15" height="8" viewBox="0 0 15 8" fill="none" aria-hidden="true"><path d="M0 4h13M10 1l3 3-3 3" stroke="currentColor" stroke-width="1.2"/></svg></a>
        <a class="feature-link is-quiet" href="kaleidoscope/newsletter.html">Browse all {{ site.data.newsletters | size }} issues
          <svg width="15" height="8" viewBox="0 0 15 8" fill="none" aria-hidden="true"><path d="M0 4h13M10 1l3 3-3 3" stroke="currentColor" stroke-width="1.2"/></svg></a>
      </div>
    </div>
  </div>
</div>

