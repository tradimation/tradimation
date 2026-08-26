# Tradimation symbol

`tradimation-symbol.png` is the primary Tradimation brand symbol. It is a
general-purpose logo asset for the website, documentation, social profiles,
repository artwork, and other brand surfaces; it is not specific to GitHub.

## Meaning

Cel Runner is an original animation-paper character caught in one exaggerated
running key pose. The flexible sheet body represents a web element, while the
opposing leg shapes and elastic limbs express traditional squash-and-stretch.
The single acid-green curl reveals the character's paper construction and adds
Tradimation's digital color accent without introducing another symbol.

## Files

- `tradimation-symbol.png`: 1254×1254 primary raster symbol

## Usage

- Keep clear space around the character equal to roughly one quarter of its body height.
- Preserve the paper body, asymmetric face, running extreme, and single acid curl.
- Do not add clothing, props, letters, or playback symbols to the character.
- The square artwork includes safe space for circular crops but may also be used uncropped.

## Color system

The interface uses a cool animation-desk palette rather than warm paper tones. Cool slate neutrals keep the canvas technical and contemporary, while motion lime connects interactive moments to the symbol's curled corner. Cobalt, coral, amber, and teal provide clearly separated supporting and semantic states.

### Foundation

- Neutral: `#FFFFFF`, `#F8FAFC`, `#F1F5F9`, `#E2E8F0`, `#CBD5E1`, `#94A3B8`, `#64748B`, `#475569`, `#334155`, `#1E293B`, `#0F172A`, `#020617`
- Motion lime: `#F7FEE7`, `#ECFCCB`, `#D9F99D`, `#BEF264`, `#A3E635`, `#84CC16`, `#65A30D`, `#4D7C0F`, `#3F6212`, `#365314`

### Supporting colors

- Cobalt: `#EEF2FF`, `#E0E7FF`, `#C7D2FE`, `#A5B4FC`, `#818CF8`, `#6366F1`, `#4F46E5`, `#4338CA`, `#3730A3`, `#312E81`
- Coral: `#FFF1F2`, `#FFE4E6`, `#FECDD3`, `#FDA4AF`, `#FB7185`, `#F43F5E`, `#E11D48`, `#BE123C`, `#9F1239`, `#881337`
- Amber: `#FFFBEB`, `#FEF3C7`, `#FDE68A`, `#FCD34D`, `#FBBF24`, `#F59E0B`, `#D97706`, `#B45309`, `#92400E`, `#78350F`
- Teal: `#F0FDFA`, `#CCFBF1`, `#99F6E4`, `#5EEAD4`, `#2DD4BF`, `#14B8A6`, `#0D9488`, `#0F766E`, `#115E59`, `#134E4A`

### Roles

- Use neutral 50 for the page, neutral 100 for panels, white for raised controls, neutral 900 for text, and neutral 950 for stages and code.
- Use motion lime 400 for motion, selection, and primary highlights; lime 500 is its hover state.
- Use cobalt 600 for keyboard focus and information, coral 600 for errors, amber 400 for warnings, and teal 700 for success.
- Keep body text at WCAG AA contrast or better. Neutral 600 on neutral 50 is `7.24:1`; neutral 900 on lime 400 is `11.84:1`.

## Generation prompt

```text
Use case: precise-object-edit
Asset type: primary Tradimation brand symbol and original mascot
Primary request: Refine one completely original anthropomorphic animation-paper
character in a strong forward-running extreme. Preserve the wide paper body,
single acid-green curled corner, asymmetric solid-ink eyes, uneven eyebrows,
compact crescent mouth, rubber-hose limbs, and flat paddle hands and feet. Keep
the face sparse and the lower body edge uninterrupted. Use a flat warm-paper
circle on a near-black square and retain a readable silhouette at 32 px.
Originality constraints: do not reference or reproduce a known character,
mascot, franchise, studio logo, or named artist. Avoid pie-cut eyes, white
gloves, animal ears, clothing, shoes, hats, cup-shaped heads, and props.
```

Generated with the built-in `imagegen` workflow. The prompt avoids named works
and recognizable character-specific features; it is not a legal clearance or
trademark search.
