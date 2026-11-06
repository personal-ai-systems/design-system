# Creator Flow concept previews

Customer-facing candidate with optional reviewer colour directions:
`index.html` (Studio), `signal.html`, `after-hours.html`. This is not a working
AI editor or a launched service. No testimonials, customer claims or hotel
partnerships are implied. Four customer use cases remain visible without a
carousel. The enquiry prepares an encoded email link and a copyable fallback;
it never sends or stores information. The visitor reviews/sends in their email
app. The previous inert Submit button is deliberately removed.

`index.html` is the editable master. Run `node scripts/build-previews.mjs`
from the repository root after changes. The other two HTML files, palettes and
vendor copies are generated. The `--output` artifact is deleted and rebuilt
from nothing, so a retired demo asset cannot survive at a public URL beside the
current page.

Page order: hero and product-category line, the customer problem, four use
cases, the labelled format sample, the three-step workflow, the six-stage voice
map (`#voice`), the voice/accent principles band (`#principles`), built versus
next (`#built`), the product and intended business (`#product`), the enquiry
form, data and privacy. `#voice` labels each stage working, planned or proposed
and names ElevenLabs only as an intended integration for the narration stage.
`#built` separates what runs today from what is next and points at the public
`personal-vault` and `personal-vault-ui` repositories as separate first-party
evidence, not as this product's source. `#product` states the own-product and
planned-paid-access position: no agency production, no provider-credit resale.
`tests/creator-flow.test.mjs` enforces these statements and forbids partnership,
award, traction, price and accent-removal claims.

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

The seven-second silent landscape illustration is rendered locally from the
same generated image. Its optional VTT text is illustrative, not a transcript
of speech. It is not an end-to-end product/voice demo. No personal media is used.

Current redesign is a local review candidate, not yet deployed. Automated
checks do not replace the pending external-Chrome visual review.
