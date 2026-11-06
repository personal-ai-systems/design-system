# UX reference review

Reviewed 6 November 2026. These are ten relevant references, not a defensible
ranking of the world's ten best websites. Official page content/documentation
was inspected through web retrieval; no new pixel-level visual audit was
possible while local browser access was disabled. Observations below are not
evidence that copying a pattern will improve our conversion.

| Reference | Evidence observed | Apply here | Do not copy |
| --- | --- | --- | --- |
| [Macquarie accessibility plan](https://www.macquarie.com/assets/macq/about/diversity/macquarie-group-accessibility-action-plan.pdf) | GEL foundations, consistency, accessibility and WCAG 2.2 AA objectives | One shared foundation; contrast and interaction checks | Bank identity, proprietary manual or claimed visual audit of inaccessible homepage |
| [Qantas](https://www.qantas.com/en-au) | Primary trip-planning tasks and useful shortcuts precede other content | One clear main task; travel imagery with purpose | Booking complexity, rewards promotions, red branding |
| [Adobe Spectrum](https://spectrum.adobe.com/page/design-tokens/) | Reusable design decisions across products/platforms | Semantic token source -> adapters -> consumers | Adobe visual identity or claim that tokens alone constitute UX |
| [Atlassian typography](https://atlassian.design/foundations/typography/) | Readability, hierarchy, marketing/application distinction | Deliberate heading roles, consistent family and spacing | Restricted brand fonts |
| [GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/) | Specific labels and focused questions | Short, clearly labelled enquiry, useful validation | A multi-page government process for a tiny contact form |
| [Stripe](https://stripe.com/) | Clear category/outcome, product presentation, next action and real evidence | Concrete promise followed by output proof | Stripe's statistics, gradients or customer logos |
| [Linear](https://linear.app/) | Defined audience/category, workflow and visible product detail | Explain what this changes in the creator's workflow | Complex AI-product navigation, dark-slate aesthetic or invented editor screenshots |
| [Descript](https://www.descript.com/) | Video-editing category, specific tasks and use-case navigation | Creator jobs and examples, not a technology inventory | Their capabilities, customer results or free-service claims |
| [ElevenLabs Voice Changer](https://elevenlabs.io/voice-changer) | Original/changed performance examples; preservation of accents and emotion | Explain the voice choice with concrete inputs/outputs | Guaranteed accent removal or implication of partnership/grant approval |
| [Shopify](https://www.shopify.com/) | Outcomes connected to selling channels and merchant tasks | Connect outputs to the customer's destination | Unsupported revenue/scale or a store-platform mega-footer |

## Open-source patterns inspected

- [AstroWind](https://github.com/arthelokyo/astrowind): README describes reusable
  page sections, image optimisation, Open Graph and semantic theme variables;
  GitHub identifies an MIT licence. Use the separation of tokens, sections and
  metadata as a pattern. Do not migrate this small static page to Astro/Tailwind
  or enable its analytics merely because the template offers them.
- [Astroship](https://github.com/surjithctly/astroship): startup landing/contact
  structure. Its README table says GPL-2.0 but GitHub identifies GPL-3.0; this
  inconsistency is a reason not to copy code without checking the exact file.
  A 'working contact page' in a template is not proof our page collects leads.
- [ScrewFast](https://github.com/mearashadowfax/ScrewFast): separate content
  tables, site metadata and navigation configuration. Apply a central content
  contract and link audit. Do not copy placeholder footer links, form behaviour,
  smooth-scroll scripts, analytics or a large framework stack.

No third-party template code was copied in this review. README feature claims
are author claims, not independently reproduced performance/accessibility tests.

## Resulting decisions

Keep the coastal image; replace vague copy and redundant carousel with four
visible customer jobs. Separate reviewer controls. Show real prototype output
before architecture. Make contact behaviour real and explicit. Audit every
footer destination. Maintain the independent design-system package and tests.
