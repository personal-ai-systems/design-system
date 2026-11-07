# Creator Flow concept previews

Customer-facing candidate with optional reviewer colour directions:
`index.html` (Studio), `signal.html`, `after-hours.html`. This is not a working
AI editor or a launched service. No testimonials, customer claims or hotel
partnerships are implied. Four customer use cases stay visible; a separate
three-story carousel illustrates the chosen-narrator workflow. Browser playback
uses only available local device voices, never ElevenLabs. The enquiry
prepares an encoded email link and a copyable fallback;
it never sends or stores information. The visitor reviews/sends in their email
app. The previous inert Submit button is deliberately removed.

`index.html` is the editable master template. Run `npm run check`
from the repository root after changes. The other two HTML files, palettes and
vendor copies are generated. The `--output` artifact is deleted and rebuilt
from nothing, so a retired demo asset cannot survive at a public URL beside the
current page.

Page order: product/audience, creator narration problem, four illustrated
workflow steps, voice-story carousel, labelled visual sample, four use cases, sourced business
case with explicitly hypothetical market arithmetic, concise prototype status, FAQ,
enquiry and privacy. A linked `product-brief.html` carries the venture case,
market-validation approach, operator, planned business model and intended
ElevenLabs role. No claimed traction, validated TAM, product price or grant/partnership.
`tests/creator-flow.test.mjs` enforces these boundaries without freezing the
customer page into a grant-review checklist.

`site.config.json` is the single canonical deployment URL/operator/product
input. The build resolves metadata placeholders, JSON-LD, robots.txt and sitemap.
No source template with unresolved placeholders is a deployment artifact.
The local review server adds X-Robots-Tag:noindex. Alternate colour pages stay
noindex/canonical to the main page; this is not a private admin interface.

Build with `npm run check`, then run `node scripts/serve-preview.mjs` for local
review at port5088. The server exposes only `.pages-site`, bound to127.0.0.1,
not arbitrary repository/private files. Website indexing and deployment are
separate release decisions. Main structured-data vocabulary was checked in
the official schema.org validator; that is not Google rich-result acceptance.

`themes.json` contains preview-only semantic
colour alternatives. Studio derives from the canonical light-theme export,
not another copy of the shared values. Brand guidelines and working palette
are documented in ../../docs/brand-guidelines.md.
The palette editor previews local changes and downloads a review JSON file;
there is no server-side shared editing or saving.
Controls are hidden by default and enabled only with ?review=1. This is not
authentication or a private admin area: all static source is public.

Design-system CSS is copied from the explicit web exports and checked into
`vendor/` with content hashes in VERSION.json. Package exports exclude these
marketing previews. GitHub Pages publishes only the generated static artifact,
not internal notes, Git history, code tooling or the whole repository tree.

Hero image: generated for this concept on 6 November 2026. It depicts an
imaginary coastal terrace; no real location, customer or hotel is represented.
Icons: lucide-static 0.468.0 from jsDelivr; licence retained in assets/icons/LICENSE.
System fonts are inherited from the design system. No remote fonts, analytics,
cookie scripts or paid generation requests are used at page load.

Workflow image: `assets/workflow-hotel-story.jpg`, generated with the built-in
image tool on 7 November 2026. Three consistent fictional coastal-hotel photos
(room, balcony view, breakfast), without people, logos or text. It is one
contact sheet reused with CSS crops, not customer footage or a real hotel.
No image was transmitted to a new provider. The page labels both the example
and the not-yet-functional editor/voice output. UI labels are accessible HTML,
not text baked into images. The three shown languages are illustrative choices,
not a verified supported-language list. Same visuals do not imply identical
timing or word-for-word image matching across language versions.

The seven-second silent landscape illustration is rendered locally from the
same generated image. Its optional VTT text is illustrative, not a transcript
of speech. It is not an end-to-end product/voice demo. No personal media is used.

Current redesign is a local review candidate, not yet deployed. Automated
checks do not replace the pending external-Chrome visual review.
