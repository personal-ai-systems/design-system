# Creator Flow concept previews

Three static colour directions for the same proposed creator/voice workflow:
`index.html` (Studio), `signal.html`, `after-hours.html`. This is not a working
AI editor or a launched service. No testimonials, customer claims or hotel
partnerships are implied. The interest form validates locally but never sends
or stores information. The email link opens the visitor's own email client.

`index.html` is the editable master. Run `node scripts/build-previews.mjs`
from the repository root after changes. The other two HTML files, palettes and
vendor copies are generated. `themes.json` contains preview-only semantic
colour mappings, not an approval or replacement of the shared brand tokens.
The palette editor previews local changes and downloads a review JSON file;
there is no server-side shared editing or saving.

Design-system CSS is copied from the explicit web exports and checked into
`vendor/` with content hashes in VERSION.json. Package exports exclude these
marketing previews. GitHub Pages publishes only the generated static artifact,
not internal notes, Git history, code tooling or the whole repository tree.

Hero image: generated for this concept on 6 November 2026. It depicts an
imaginary coastal terrace; no real location, customer or hotel is represented.
Icons: lucide-static 0.468.0 from jsDelivr; licence retained in assets/icons/LICENSE.
System fonts are inherited from the design system. No remote fonts, analytics,
cookie scripts or paid generation requests are used at page load.
