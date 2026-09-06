---
layout: post
title: Department Newsletters
description: Every edition DAMP has put out; research highlights, student interviews and department news!
nav-menu: false
show_tile: false
accent: violet
---

<ul class="newsletter-grid">
{% for issue in site.data.newsletters %}
  <li>
    <a class="issue-card" href="{{ issue.file }}" target="_blank" rel="noopener">
      {% if issue.thumb %}
      <span class="issue-thumb"><img src="{{ issue.thumb }}" alt="Cover of the {{ issue.title }} newsletter" loading="lazy"></span>
      {% endif %}
      <span class="issue-body">
        <span class="issue-title">{{ issue.title }}</span>
        {% if issue.desc %}<span class="issue-desc">{{ issue.desc }}</span>{% endif %}
        <span class="issue-link">View PDF
          <svg width="12" height="13" viewBox="0 0 12 13" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M2 1h5l3 3v8H2z"/><path d="M7 1v3h3"/></svg></span>
      </span>
    </a>
  </li>
{% endfor %}
</ul>
