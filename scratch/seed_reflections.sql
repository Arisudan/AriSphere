-- Seed Reflections Articles into public.articles
INSERT INTO public.articles (
  id, title, subtitle, excerpt, content, category, author, publish_date, read_time, image_url, tags, featured, trending, trending_this_week, editors_pick, views
) VALUES
(
  6,
  'Building AriSphere From Zero to Production',
  'A post-mortem on code refactoring, JSDOM lifecycle race conditions, and moving to a Postgres CMS.',
  'Building a modern web application requires balancing architecture decisions. Here is how I structured AriSphere''s static compiler and database fallback layer.',
  '<p>When I first envisioned AriSphere, I wanted a site that had the premium feel of an editorial print magazine but was lightning fast, SEO-optimized, and simple to manage. I didn''t want a heavy, slow, cookie-cutter WordPress site. Instead, I decided to build a custom Single Page Application (SPA) with a Node.js Static Site Generator (SSG) pipeline powered by a remote Supabase Postgres database.</p>
  
  <h2>The JSDOM Lifecycle Race Condition</h2>
  <p>One of the most frustrating failures during development happened within the static compiler. To pre-render our client-side routes into flat HTML files for deployment on Vercel, I used JSDOM to evaluate our routing scripts in-memory. However, after compiling all the paths, I called <code>dom.window.close()</code> to clean up memory. Immediately, the build crashed with a fatal exception: <code>TypeError: Cannot set properties of undefined (setting ''title'')</code>.</p>
  
  <blockquote>
    "An asynchronous callback resolving on a destroyed DOM document is one of the most elusive race conditions in server-rendered SPAs."
  </blockquote>
  
  <p>It turned out that our database fetches and initial DOMContentLoaded routing triggers were resolving slightly *after* the window had been closed. The script was trying to write to <code>document.title</code> on a document that no longer existed. To fix this, I had to introduce strict defensive checks—safeguarding every single DOM access and selector wrapper with a check to verify if the <code>document</code> and <code>document.head</code> were still active. This taught me to never assume the presence of global browser variables when executing hybrid server-client code.</p>
  
  <h2>Designing a Resilient Dual-Layer Database</h2>
  <p>Another challenge was database availability. I wanted our content to live in a live Postgres database on Supabase so I could edit articles directly from my phone. But what if the database rate limits were exceeded or the connection timed out? I built a resilient fallback layer in our database module. If the remote fetch fails, the client instantly catches the error and serves content from a local hardcoded array. The visitor never sees a broken page or a database error screen.</p>
  
  <h2>Key Takeaways</h2>
  <ul>
    <li><strong>Defend against async lifecycles</strong>: Always assume that asynchronous fetches might resolve after a view or DOM window has been destroyed. Guard your DOM mutations.</li>
    <li><strong>Fail gracefully</strong>: Always have a local content fallback when relying on third-party APIs. Performance and resilience trump architectural purity.</li>
    <li><strong>Keep it simple</strong>: You don''t need a massive framework to build a fast, SEO-friendly site. Vanilla JS and a custom pre-render pipeline can achieve a perfect Lighthouse score.</li>
  </ul>',
  'reflections',
  'arisudan',
  'June 10, 2026',
  '6 min read',
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800',
  '["Web Development", "Static Site Generator", "PostgreSQL", "Architecture"]'::jsonb,
  false,
  true,
  true,
  true,
  1205
),
(
  7,
  'What Jayem Automotive Taught Me About Real Engineering',
  'Moving past academic textbooks to understand physical mechanics, hardware limits, and industrial timelines.',
  'My time at Jayem Automotive redefined what engineering means to me. Here are the core lessons from the shop floor and building real hardware.',
  '<p>In college, engineering was a series of clean mathematical formulas. You calculated the stress on a beam, assumed ideal friction, and got an exact number. It wasn''t until I stepped onto the shop floor at Jayem Automotive that I realized how messy, chaotic, and beautiful real engineering actually is. In the real world, materials aren''t perfect, tolerances slip, and components fail in ways that textbooks never warn you about.</p>
  
  <h2>Textbooks vs. the Shop Floor</h2>
  <p>I remember working on a custom fabrication project where our CAD design was mathematically flawless. We spent weeks in the simulation software running stress analyses. But when we mounted the physical prototype onto the chassis, the vibrations from the engine caused immediate micro-fractures near the mounting brackets. Our ideal calculations hadn''t factored in the resonant frequencies of the raw steel frame under active load.</p>
  
  <blockquote>
    "Textbooks teach you how to analyze ideal systems. The shop floor teaches you how to design for the imperfections of reality."
  </blockquote>
  
  <p>One of the veteran mechanics looked at our broken bracket, laughed, and welded a gusset plate directly across the stress line. He didn''t run a finite element analysis; he had twenty years of feeling how metal bends. That was my first lesson in engineering humility: academic theories are just guidelines—true engineering is refined through physical testing, observation, and failure.</p>
  
  <h2>Building for Assembly and Maintenance</h2>
  <p>Another critical lesson was Design for Assembly (DFA). In CAD, it''s easy to put a bolt in a tight corner. But in the workshop, if a mechanic cannot physically fit a wrench inside that space to tighten it, the design is a failure. Jayem taught me to visualize the hand of the technician at every step of the design. If it is hard to assemble or repair, it is a bad design, no matter how elegant the blueprint looks.</p>
  
  <h2>Key Takeaways</h2>
  <ul>
    <li><strong>Prototype early, fail fast</strong>: Don''t fall in love with your simulations. Build a crude prototype as soon as possible and subject it to physical stresses.</li>
    <li><strong>Respect veteran experience</strong>: The technicians and mechanics on the shop floor often understand the behavior of physical materials better than junior engineers with advanced degrees.</li>
    <li><strong>Design for maintenance</strong>: Always consider how a part will be serviced. If a basic oil change or component replacement requires dismantling the entire system, go back to the drawing board.</li>
  </ul>',
  'reflections',
  'arisudan',
  'June 9, 2026',
  '7 min read',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800',
  '["Mechanical Engineering", "Automotive", "Prototyping", "Lessons Learned"]'::jsonb,
  false,
  true,
  false,
  true,
  940
),
(
  8,
  'The Reality of Pursuing Embedded Systems in India',
  'An honest analysis of hardware ecosystems, career pathways, and the skills needed to bridge the educational gap.',
  'Finding hardware roles in India is challenging. I analyze the market realities and how students can navigate them.',
  '<p>For Indian engineering students, the career path is often pre-charted: learn Java or Python, prepare for algorithmic coding interviews, and join a software services giant. But for those of us who love hardware, microcontrollers, and low-level firmware, the roadmap is incredibly blurry. Finding a core embedded systems job in India is challenging, and the academic curriculum does very little to prepare students for the industry.</p>
  
  <h2>The Industry-Academia Divide</h2>
  <p>Most university labs in India still teach embedded systems using outdated microcontrollers like the 8051 or basic PIC boards, writing assembly code that hasn''t been used in production for decades. Meanwhile, the industry has long transitioned to ARM Cortex-M microcontrollers, RTOS-based scheduling, and advanced communication protocols like CAN, SPI, and I2C.</p>
  
  <blockquote>
    "If your resume only lists academic Arduino projects, you are competing on a playground that the modern hardware industry left behind ten years ago."
  </blockquote>
  
  <p>Arduino is a fantastic tool for learning basic electronics, but it hides all the low-level complexities—register configurations, interrupt service routines, and power management. To get hired by core embedded firms, you have to throw away the Arduino libraries and learn to write bare-metal C code directly on modern microcontrollers like the STM32 or ESP32 using vendor SDKs.</p>
  
  <h2>Navigating the Hardware Job Market</h2>
  <p>Unlike software, where companies hire thousands of freshers in massive campus placement drives, hardware engineering teams are smaller and require highly specialized skills. To stand out, you need a portfolio of projects that demonstrate physical system design: custom PCB layouts (using KiCad or Altium), driver development from datasheets, and robust firmware that handles scheduling and power constraints. You have to prove you can bridge the gap between physical hardware and low-level code.</p>
  
  <h2>Key Takeaways</h2>
  <ul>
    <li><strong>Bare metal is key</strong>: Move past basic Arduino sketches. Learn ARM Cortex-M architecture, read datasheets, and write your own device drivers.</li>
    <li><strong>Learn PCB Design</strong>: A firmware engineer who can design and route their own custom PCBs is twice as valuable to a hardware startup.</li>
    <li><strong>Build a portfolio</strong>: Document your projects on GitHub and write post-mortem blogs explaining your design choices, failures, and debugging process. A working portfolio is your true degree.</li>
  </ul>',
  'reflections',
  'arisudan',
  'June 8, 2026',
  '8 min read',
  'https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?auto=format&fit=crop&q=80&w=800',
  '["Embedded Systems", "India Career", "Firmware", "PCB Design"]'::jsonb,
  false,
  false,
  true,
  false,
  1540
);
