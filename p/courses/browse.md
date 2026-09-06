---
layout: page
title: Course Reviews
description: Search and filter every course review DAMP has collected
nav-menu: false
show_tile: false
course_filter: true
---

{% assign reviews = site.pages | where: "review", true | sort: "code" %}
{% assign cats      = reviews | map: "category" | uniq | sort %}
{% assign sems      = reviews | map: "sem"      | uniq | compact | sort %}
{% assign years     = reviews | map: "year"     | uniq | compact | sort | reverse %}
{% assign terms     = reviews | map: "term"     | uniq | compact | sort %}
{% assign workloads = reviews | map: "workload" | uniq | compact | sort %}
{% assign gradings  = reviews | map: "grading"  | uniq | compact | sort %}

<!-- Main -->
<div id="main" class="alt">

<section id="one">
<div class="inner">

<header class="major">
  <h1>Course reviews</h1>
  <p>{{ reviews | size }} reviews &middot; core, electives and STEM</p>
</header>

<form class="course-filter" id="course-filter" role="search" aria-label="Filter course reviews">

  <div class="cf-row cf-search">
    <label for="cf-q">Search</label>
    <input type="search" id="cf-q" name="q" placeholder="Course code, name or professor&hellip;" autocomplete="off" />
  </div>

  <div class="cf-row cf-facets">

    <div class="cf-field">
      <label for="cf-category">Category</label>
      <select id="cf-category" data-facet="category">
        <option value="">Any</option>
        {% for c in cats %}
          {% case c %}
            {% when 'core' %}{% assign label = 'Core' %}
            {% when 'de'   %}{% assign label = 'Department Elective' %}
            {% when 'ie'   %}{% assign label = 'STEM / Institute Elective' %}
            {% when 'hss'  %}{% assign label = 'HSS' %}
            {% else %}{% assign label = c %}
          {% endcase %}
        <option value="{{ c }}">{{ label }}</option>
        {% endfor %}
      </select>
    </div>

    <div class="cf-field">
      <label for="cf-sem">Semester</label>
      <select id="cf-sem" data-facet="sem">
        <option value="">Any</option>
        {% for s in sems %}<option value="{{ s }}">Semester {{ s }}</option>{% endfor %}
      </select>
    </div>

    <div class="cf-field">
      <label for="cf-term">Term</label>
      <select id="cf-term" data-facet="term">
        <option value="">Any</option>
        {% for t in terms %}<option value="{{ t }}">{{ t | capitalize }}</option>{% endfor %}
      </select>
    </div>

    <div class="cf-field">
      <label for="cf-year">Year</label>
      <select id="cf-year" data-facet="year">
        <option value="">Any</option>
        {% for y in years %}<option value="{{ y }}">{{ y }}</option>{% endfor %}
      </select>
    </div>

    {% comment %}
      Workload and grading only appear once somebody has actually recorded
      them in a review's front matter. Rendering dead selects would imply
      data the site does not have.
    {% endcomment %}
    {% if workloads.size > 0 %}
    <div class="cf-field">
      <label for="cf-workload">Workload</label>
      <select id="cf-workload" data-facet="workload">
        <option value="">Any</option>
        {% for w in workloads %}<option value="{{ w }}">{{ w | capitalize }}</option>{% endfor %}
      </select>
    </div>
    {% endif %}

    {% if gradings.size > 0 %}
    <div class="cf-field">
      <label for="cf-grading">Grading</label>
      <select id="cf-grading" data-facet="grading">
        <option value="">Any</option>
        {% for g in gradings %}<option value="{{ g }}">{{ g | capitalize }}</option>{% endfor %}
      </select>
    </div>
    {% endif %}

    <div class="cf-field cf-reset">
      <button type="button" id="cf-reset" class="button small">Reset</button>
    </div>

  </div>
</form>

<p class="cf-count" id="cf-count" role="status" aria-live="polite"></p>

<div class="course-grid" id="course-grid">
{% for r in reviews %}
  <article class="course-card"
           data-code="{{ r.code }}"
           data-name="{{ r.course_name }}"
           data-prof="{{ r.prof }}"
           data-category="{{ r.category }}"
           data-sem="{{ r.sem }}"
           data-year="{{ r.year }}"
           data-term="{{ r.term }}"
           data-workload="{{ r.workload }}"
           data-grading="{{ r.grading }}">
    <div class="cc-head">
      <span class="cc-code">{{ r.code }}</span>
      <span class="cc-cat cc-cat-{{ r.category }}">
        {% case r.category %}
          {% when 'core' %}Core
          {% when 'de'   %}Dept elective
          {% when 'ie'   %}STEM elective
          {% when 'hss'  %}HSS
          {% else %}{{ r.category }}
        {% endcase %}
      </span>
    </div>
    <h3><a href="{{ r.url | relative_url }}">{% if r.course_name and r.course_name != '' %}{{ r.course_name }}{% else %}{{ r.code }}{% endif %}</a></h3>
    <div class="cc-foot">
      {% if r.prof and r.prof != '' %}<p class="cc-prof">{{ r.prof }}</p>{% endif %}
      {%- capture cc_ctx -%}
        {%- if r.term %}{{ r.term | capitalize }}{% if r.year %} {{ r.year }}{% endif %}{% endif -%}
        {%- if r.sem %}{% if r.term %} &middot; {% endif %}Sem {{ r.sem }}{% endif -%}
        {%- if r.dept %}{% if r.term or r.sem %} &middot; {% endif %}{{ r.dept }}{% endif -%}
      {%- endcapture -%}
      {% assign cc_ctx = cc_ctx | strip %}
      {% if cc_ctx != '' %}<p class="cc-ctx">{{ cc_ctx }}</p>{% endif %}
    </div>
  </article>
{% endfor %}
</div>

<p class="cf-empty" id="cf-empty" hidden>No reviews match those filters. Try clearing one.</p>

<hr />

<p class="cf-note">Workload and grading are not recorded for these reviews yet. Add <code>workload:</code> and <code>grading:</code> to a review's front matter and the filters for them appear here automatically.</p>

</div>
</section>

</div>
