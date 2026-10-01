# Product-only image edits — 2026-10-01

User request: remove brand icons from images and show only the product. These are local test references, not dimensional drawings or exact product specifications. Original source URLs remain in `photos/sources.json` and in the image viewer. The built-in image editing tool was used; the selected outputs were copied into this project and encoded as JPEG for browser delivery. Original sources are retained separately and are not the active viewer assets.

| Saved asset | Final edit prompt |
|---|---|
| `photos/multi-gearbox-clean.jpg` | Remove the orange and blue JD GEARS logo, replace it with the same white background; preserve the orange gearbox, shaft, geometry, bolts, lighting and perspective. No new text, logos or objects. |
| `photos/single-gearbox-clean.jpg` | Remove printed ONKAR lettering on the shaft and embossed brand letters on the casing; preserve the green gearbox, shafts, bolt holes, geometry, perspective and white background. |
| `photos/rd-gasket-clean.jpg` | Remove light printed brand lettering from the dark gasket; preserve the exact outline, aperture, eight hole positions, perspective, thickness and white background. |
| `photos/stub-gasket-clean.jpg` | Remove light printed brand lettering from the dark gasket; preserve the exact outline, aperture, six hole positions, perspective, thickness and white background. |
| `photos/idler-gasket-clean.jpg` | Remove light printed brand lettering from the dark gasket; preserve the exact outline, aperture, five hole positions, perspective, thickness and white background. |
| `photos/gearbox-gasket-clean.jpg` | Remove light printed brand lettering from the dark gasket; preserve the exact outline, aperture, eight hole positions, perspective, thickness and white background. |
| `photos/output-gasket-clean.jpg` | Remove light printed brand lettering from the dark gasket; preserve the square outline, aperture, four hole positions, perspective, thickness and white background. |
| `photos/clevis-back-clean.jpg` | Remove only the caption below the bracket; preserve the black product, six holes, outline, perspective and white background. |
| `photos/gear-cover-clean.jpg` | Remove only the barcode sticker, restoring orange paint beneath it; preserve cover outline, bolt holes, oil port, geometry, perspective and white background. |

Outputs were visually reviewed as reference images. Generative editing is not proof of dimensional fidelity; the BOM codes, grades, PPM and approved drawings remain authoritative. Physical specification markings and PTO safety markings are not promotional overlays.


## Orange gearbox — 2026-10-01

Built-in image editing (not CLI) used `photos/single-gearbox-clean.jpg` as the edit target. Saved project asset: `photos/single-gearbox-orange.jpg`, JPEG quality 85. The original image remains retained. Multispeed reference was already orange. Active manifest and coverage references now use the orange asset.

Final prompt: “Edit this exact rotavator gearbox product photograph. Repaint ALL green painted areas (gearbox casting, cover, long axle tube and painted flange portions) bright industrial orange, matching a typical orange rotavator gearbox. Preserve exact product geometry, bolt positions, silver bare metal splined shafts, dark metal nuts, highlights, crop, and plain white background. Product only. No logos, branding, watermark, text, icons or added objects. Photorealistic product image.”

Inspected generated image and all eight mapped gearbox rows in the browser. Orange appearance is a visual preview, not a specification or source/BOM change.
