# Brand source assets

Not served. Nothing in `public/` should reference these — they are the
originals the shipped assets are generated *from*.

| File | What it is |
|---|---|
| `agila-eagle-full.png` | The full Agila mark, background removed. Philippine sun rays, eagle, bolo. |

## About the transparency

The original artwork is a JPEG on an opaque white field. The alpha channel here
was made by **flood-filling from the frame edges**, not by knocking out white.

That distinction matters: roughly 3% of the eagle's own body is near-white —
the feather highlights on the wings, breast and crest. A global white-threshold
removal punches holes straight through the bird. If this asset is ever
regenerated with a different tool, check the wingtips before shipping it.

## What is generated from this

- `public/og-image.jpg` — 1200x630 social share card. Rendered in a browser at
  2x with Montserrat, then downsampled, so the type is crisp. Regenerate at the
  same size; OG consumers do not resample well.

## Where the *small* mark comes from

`public/agila-glyph.svg` is **not** derived from this file. This artwork does not
survive being shrunk — below about 44px the eagle stops resolving inside the sun
and it reads as a gold smudge. The glyph is a separate, simplified drawing built
for small sizes. Use the glyph anywhere under ~200px and this file above it.
