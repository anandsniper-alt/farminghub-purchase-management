# GAJA Farming Hub pose assets

User request, 2026-09-12: multiple poses and clothes matching Farming Hub. Generated with the built-in imagegen tool using `gaja-guide.png` as the character reference. New PNGs are siblings; the red mascot remains historical reference, no longer used by the preview.

| Asset | Guide use |
|---|---|
| `gaja-welcome.png` | Launcher and first step: wave |
| `gaja-pointing.png` | Intermediate explanations: point toward guide text |
| `gaja-ready.png` | Last available guide step: thumbs-up |

The thumbs-up marks the last help step, never purchase approval, payment or order completion. `poses.json` is the asset/alt-text manifest. All three images are embedded by the isolated builder, with no runtime image service. Green #204321 and lime #C5DA41 are the requested clothing palette; illustration shading varies those colors. Production adoption remains pending.

## Generation prompts

### Welcome

> Edit this GAJA elephant mascot reference for the Farming Hub app help tour. Keep exactly the same friendly tan elephant identity, facial proportions, large ears, expressive eyes, clear safety goggles, polished illustration style and clean white sticker outline. Change the red cap and polo to deep Farming Hub green (#204321) with small lime (#C5DA41) piping on the collar, sleeve edges and cap brim. Keep exact white GAJA lettering on cap and left chest. No red clothing. Waist-up centered single character, whole ears/cap/hands inside frame with comfortable transparent padding, genuinely transparent background. No scenery, no extra words, no labels. Pose: cheerful welcoming wave with one hand raised and open palm facing the viewer; the other hand relaxed. Friendly open smile.

### Pointing

> Edit this GAJA elephant mascot reference for the Farming Hub app help tour. Keep exactly the same friendly tan elephant identity, facial proportions, large ears, expressive eyes, clear safety goggles, polished illustration style and clean white sticker outline. Change the red cap and polo to deep Farming Hub green (#204321) with small lime (#C5DA41) piping on the collar, sleeve edges and cap brim. Keep exact white GAJA lettering on cap and left chest. No red clothing. Waist-up centered single character, whole ears/cap/hands inside frame with comfortable transparent padding, genuinely transparent background. No scenery, no extra words, no labels. Pose: one hand with index finger clearly pointing to the viewer's right, presenting the nearby guide explanation; other hand relaxed. Attentive friendly smile.

### Ready

> Edit this GAJA elephant mascot reference for the Farming Hub app help tour. Keep exactly the same friendly tan elephant identity, facial proportions, large ears, expressive eyes, clear safety goggles, polished illustration style and clean white sticker outline. Change the red cap and polo to deep Farming Hub green (#204321) with small lime (#C5DA41) piping on the collar, sleeve edges and cap brim. Keep exact white GAJA lettering on cap and left chest. No red clothing. Waist-up centered single character, whole ears/cap/hands inside frame with comfortable transparent padding, genuinely transparent background. No scenery, no extra words, no labels. Pose: confident thumbs-up with one hand, reassuring smile, other hand relaxed. This celebrates finishing the help tour, not approving a purchase.

## Background correction

Initial outputs contained an opaque checkerboard, despite the alpha request. A welcome-only transparency correction also retained the checkerboard. Use the final white-background variants on the existing white guide card/launcher; do not describe them as transparent or reuse them on a colored surface without new asset preparation.

Final edit prompt, applied separately to each pose using built-in imagegen:

> Change ONLY the background of this exact illustration. Replace the entire gray checkerboard with uniform solid pure WHITE (#FFFFFF), including all exterior gaps between the ears, hands and body. OPAQUE WHITE BACKGROUND. NO checkerboard, NO transparency grid, NO texture, NO gradient, NO shadow outside the character. Keep the GAJA elephant, green and lime clothing, goggles, pose, white sticker outline, lettering and composition exactly the same. The result must look like a clean mascot printed on a plain white page.
