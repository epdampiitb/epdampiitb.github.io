---
title: Our Team
layout: landing
description: Find out who your DAMP mentors and coordinators are
image: assets/images/team_b.jpg
nav-menu: true
show_tile: true
sim: nbody
accent: cyan
tile_group: more
tile_order: 3
cta: 'Meet the team'
---

<div id="main">

<section id="one">
	<div class="inner">
		<header class="major">
			<h2>About Us</h2>
		</header>
		<p>The Department Academic Mentorship Programme (DAMP), functioning under the aegis of the Institute Student Mentorship Programme (ISMP), is designed to address the academic challenges faced by undergraduate students within their respective departments. The programme appoints selected senior students, typically from the third and fourth year to serve as mentors, forming the core workforce of the initiative. These mentors are assigned a group of junior students to guide and support, especially those struggling academically. The primary objective is to help such students overcome backlogs and get their academic progress back on track. DAMP mentors work in close coordination with Faculty Advisors and Department Faculty Coordinators to enable early identification of at risk students and ensure consistent monitoring and support. In addition to one-on-one mentoring, the programme also organizes departmental activities such as lab visits, 'fundae' sessions, and tutorial-cum-help sessions to foster academic engagement and peer learning.</p>
	</div>
</section>

{%- assign accents = "cyan,violet,amber,green,rose" | split: "," -%}
<section id="team" class="team-roster">
  <div class="inner">
    <div class="sec-head">
      <span class="tag">Team 2026 &ndash; 27</span>
      <h2>Your mentors</h2>
      <p>{{ site.data.team26 | size }} seniors who&rsquo;ve been exactly where you are :) Feel free to say hi to them!</p>
    </div>

    <ul class="team-grid">
      {%- for m in site.data.team26 -%}
      {%- assign ai = forloop.index0 | modulo: 5 -%}
      {%- assign accent = accents[ai] -%}
      <li class="team-card" data-accent="{{ accent }}">
        <div class="tc-photo">
          <img src="{{ m.img | relative_url }}" alt="{{ m.name }}" loading="lazy" />
        </div>
        <div class="tc-body">
          <h3 class="tc-name">{{ m.name }}</h3>
          <p class="tc-bio">{{ m.bio }}</p>
          {%- if m.links and m.links.size > 0 -%}
          <ul class="social-ic">
            {%- for l in m.links -%}
            <li>
              {%- case l.type -%}
              {%- when 'email' -%}<a href="{{ l.url }}" aria-label="Email {{ m.name }}"><i class="fa fa-envelope" aria-hidden="true"></i></a>
              {%- when 'instagram' -%}<a href="{{ l.url }}" target="_blank" rel="noopener" aria-label="{{ m.name }} on Instagram"><i class="fa fa-instagram" aria-hidden="true"></i></a>
              {%- when 'linkedin' -%}<a href="{{ l.url }}" target="_blank" rel="noopener" aria-label="{{ m.name }} on LinkedIn"><i class="fa fa-linkedin" aria-hidden="true"></i></a>
              {%- when 'github' -%}<a href="{{ l.url }}" target="_blank" rel="noopener" aria-label="{{ m.name }} on GitHub"><i class="fa fa-github" aria-hidden="true"></i></a>
              {%- when 'twitter' -%}<a href="{{ l.url }}" target="_blank" rel="noopener" aria-label="{{ m.name }} on X"><i class="fa fa-twitter" aria-hidden="true"></i></a>
              {%- when 'letterboxd' -%}<a href="{{ l.url }}" target="_blank" rel="noopener" aria-label="{{ m.name }} on Letterboxd"><img class="ic-img" src="{{ '/assets/images/letterboxd.png' | relative_url }}" alt="Letterboxd" /></a>
              {%- endcase -%}
            </li>
            {%- endfor -%}
          </ul>
          {%- endif -%}
        </div>
      </li>
      {%- endfor -%}
    </ul>
  </div>
</section>
</div>
