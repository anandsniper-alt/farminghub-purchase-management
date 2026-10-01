# Part illustration provenance

The user supplied `970374201-shaktiman-rotavator.pdf` and explicitly asked to use its component drawings for easier viewing. Seven PNG references are rendered excerpts of that PDF. They represent similar part families, not the exact purchased item. The UI identifies the source in the enlarged view. The user's IMP item code, BOM name, grades and PPM remain authoritative.

| Asset | PDF page / position | Catalogue description |
|---|---|---|
| gear.png | 11 / 10 | Side drive plate assembly spur gear |
| bearing.png | 11 / 13 | Bearing |
| housing.png | 11 / 15 | Rotor drive housing |
| rd-axle.png | 11 / 17 | Rotor drive shaft |
| gearbox.png | 19 / 1 | Complete multispeed gearbox assembly |
| end-cover.png | 13 / 8 | Stub axle housing end cover |
| stub-axle.png | 13 / 16 | Stub axle |

Page numbers are PDF page indices counted from one, including front matter. They differ from the printed catalogue page numbers. Crops were rendered with the bundled Poppler `pdftoppm`, with a 4500-pixel page height and a crop rectangle based on an inspected 1500-pixel page render. No generative alteration was applied. The source's rights/branding are not claimed as Farming Hub's own. This remains a local test; review asset use when preparing any later public release.

Fallback UI icons are original code-native SVG diagrams in `part-icons.mjs`: bolts, nuts, washers, circlips, seals, pins, clamps, springs, breathers, covers, blades, shafts, PTO, plates, bushes, skids, labels and frames. Name-based selection can only identify a family; dimensions, tooth counts, left/right handedness and exact geometry are not encoded in the generic shape. Dimensions shown in the detail panel are parsed from the user's existing component name, not inferred from the illustration.

## Internet product photographs — 2026-10-01

User requested internet searches using component names with “rotavator parts”, followed by placement in the local test. Selected 18 unaltered product images, mapping to 60 current seed rows. Bolts/screws, lock/castle/hex nuts, plain/spring washers, internal/external circlips and hitch/round-linch/square-linch/split pins have distinct mappings. Gear photos are matched only to the 20/21/28 tooth counts returned by the source; the gearbox photo is used only for names marked MULTI. Unmatched parts retain their previous catalogue/SVG reference. No BOM value, grade, price or supplier assignment comes from an image.

Images are served locally through explicit static allowlist entries; there is no external image request during normal use. Click the image for its source-page link. Images have not been cropped, recolored, relabelled or had branding removed. These are third-party reference images for the local test; no license grant or exact-fit claim is inferred. Original URLs, byte lengths and retrieval date are in [photos/sources.json](photos/sources.json).

| Local photo | Source page |
|---|---|
| photos/hex-bolt.jpg | [Hex head bolt](https://kalotiindia.com/product/8-8-grade-hex-head-bolt-black-finish-din-931-is-1364-1967/) |
| photos/hex-screw.jpg | [Hex head screw](https://kalotiindia.com/product/8-8-grade-hex-head-screws-black-finish-din-933-is-1364-1967/) |
| photos/spring-washer.jpg | [Spring washer](https://kalotiindia.com/product/spring-washer-flat-section-din127b/) |
| photos/plain-washer.jpg | [Plain washer / shim](https://kalotiindia.com/product/flat-punched-washer-grade-300hv/) |
| photos/split-pin.jpg | [Split / cotter pin](https://kalotiindia.com/product/split-pin/) |
| photos/internal-circlip.jpg | [Internal circlip](https://kalotiindia.com/product/internal-circlip-din472-is3075-2-b-type/) |
| photos/external-circlip.jpg | [External circlip](https://kalotiindia.com/product/external-circlip-din471-is3075-1-a-type/) |
| photos/linch-pin.webp | [Linch pin](https://asints.com/products/tractor-linkage-parts/) |
| photos/square-linch-pin.webp | [Square linch pin](https://asints.com/products/tractor-linkage-parts/) |
| photos/hitch-pin.webp | [Hitch pin](https://asints.com/products/tractor-linkage-parts/) |
| photos/multi-gearbox.jpg | [Multispeed rotavator gearbox](https://jdagrigears.in/?page_id=1158) |
| photos/lock-nut.jpg | [Sunlock / nylon insert lock nut](https://kalotiindia.com/product/stainless-steel-nylock-nut/) |
| photos/hex-nut.jpg | [Hex nut](https://kalotiindia.com/product/hex-nuts-8-grade-black-finish-din-934-is-1364-1967/) |
| photos/castle-nut.jpg | [Castle lock nut](https://reroshan.com/products/215) |
| photos/damper.jpg | [Rotavator damper spring assembly](https://reroshan.com/products/240) |
| photos/gear-20.jpg | [20-tooth side gear](https://www.styronagparts.com/products/driving-gear-z-20-4724886.html) |
| photos/gear-21.jpg | [21-tooth side gear](https://reroshan.com/products/168) |
| photos/gear-28.jpg | [28-tooth side gear](https://reroshan.com/products/146) |

SUNLOCK family lookup was cross-checked against the manufacturer [Kotadia description of nylon insert / Sunlock nuts](https://www.kotadiafasteners.com/product/ss-nylon-insert-nuts-nylock-nut-m2-m2-5/). This supports the visual family only. The sample photo is stainless steel; the user item grade/finish remains the named BOM value.

## Expanded coverage and brand removal — 2026-10-01

This update supersedes the earlier 18-photo coverage count. The active manifest now contains 58 photo families covering 137/148 item-master entries and 18/41 unique fabrication descriptions. See PHOTO_COVERAGE.csv for every match and remaining Photo pending entry. Similar-product family images are not exact-fit specifications, and do not establish hole counts, handedness, dimensions, grade or supplier choice for the BOM.

Nine active images were edited with the built-in image tool at the user's request to remove brand logos, printed branding, captions or retail labels. This supersedes the earlier no-edit statement only for those images. See IMAGE_EDIT_NOTES.md for prompts and saved assets. Original sources remain attributable here and in the viewer. Remaining source images are unaltered. No licensing or manufacturing claim is made.

Unmatched custom fabrication geometry, oil cups/adapters and the user's own sticker/nameplate artwork remain Photo pending. Several product pages exposed suitable hull/trailing-board/top-mast candidates, but their image endpoints rejected downloads; these were not substituted with unrelated photos. Local-only test boundary remains unchanged.

| Active photo | Source page | Treatment |
|---|---|---|
| photos/hex-bolt.jpg | [Hex head bolt](https://kalotiindia.com/product/8-8-grade-hex-head-bolt-black-finish-din-931-is-1364-1967/) | Original product image |
| photos/hex-screw.jpg | [Hex head screw](https://kalotiindia.com/product/8-8-grade-hex-head-screws-black-finish-din-933-is-1364-1967/) | Original product image |
| photos/spring-washer.jpg | [Spring washer](https://kalotiindia.com/product/spring-washer-flat-section-din127b/) | Original product image |
| photos/plain-washer.jpg | [Plain washer / shim](https://kalotiindia.com/product/flat-punched-washer-grade-300hv/) | Original product image |
| photos/split-pin.jpg | [Split / cotter pin](https://kalotiindia.com/product/split-pin/) | Original product image |
| photos/internal-circlip.jpg | [Internal circlip](https://kalotiindia.com/product/internal-circlip-din472-is3075-2-b-type/) | Original product image |
| photos/external-circlip.jpg | [External circlip](https://kalotiindia.com/product/external-circlip-din471-is3075-1-a-type/) | Original product image |
| photos/linch-pin.webp | [Linch pin](https://asints.com/products/tractor-linkage-parts/) | Original product image |
| photos/square-linch-pin.webp | [Square linch pin](https://asints.com/products/tractor-linkage-parts/) | Original product image |
| photos/hitch-pin.webp | [Hitch pin](https://asints.com/products/tractor-linkage-parts/) | Original product image |
| photos/multi-gearbox-clean.jpg | [Multispeed rotavator gearbox](https://jdagrigears.in/?page_id=1158) | Product-only edit |
| photos/lock-nut.jpg | [Sunlock / nylon insert lock nut](https://kalotiindia.com/product/stainless-steel-nylock-nut/) | Original product image |
| photos/hex-nut.jpg | [Hex nut](https://kalotiindia.com/product/hex-nuts-8-grade-black-finish-din-934-is-1364-1967/) | Original product image |
| photos/castle-nut.jpg | [Castle lock nut](https://reroshan.com/products/215) | Original product image |
| photos/damper.jpg | [Rotavator damper spring assembly](https://reroshan.com/products/240) | Original product image |
| photos/gear-20.jpg | [20-tooth side gear](https://www.styronagparts.com/products/driving-gear-z-20-4724886.html) | Original product image |
| photos/gear-21.jpg | [21-tooth side gear](https://reroshan.com/products/168) | Original product image |
| photos/gear-28.jpg | [28-tooth side gear](https://reroshan.com/products/146) | Original product image |
| photos/gear-23.jpg | [23-tooth side gear](https://reroshan.com/products/128) | Original product image |
| photos/gear-30.jpg | [30-tooth side gear](https://reroshan.com/products/129) | Original product image |
| photos/gear-35.jpg | [35-tooth side gear](https://reroshan.com/products/120) | Original product image |
| photos/gear-36.jpg | [36-tooth side gear](https://reroshan.com/products/154) | Original product image |
| photos/rd-axle.jpg | [Rotor drive axle](https://reroshan.com/products/171) | Original product image |
| photos/stub-axle.jpg | [Stub / dead axle](https://reroshan.com/products/174) | Original product image |
| photos/idler-axle.jpg | [Idler axle](https://reroshan.com/products/177) | Original product image |
| photos/rd-housing.jpg | [Rotor drive housing](https://reroshan.com/products/179) | Original product image |
| photos/stub-housing.jpg | [Stub housing with end cover](https://reroshan.com/products/181) | Original product image |
| photos/end-cover.jpg | [Stub housing end cover / star cap](https://reroshan.com/products/182) | Original product image |
| photos/sleeve.jpg | [Axle sleeve reference](https://reroshan.com/products/230) | Original product image |
| photos/breather.jpg | [Air breather](https://reroshan.com/products/234) | Original product image |
| photos/breather-adapter.jpg | [Breather adapter](https://reroshan.com/products/235) | Original product image |
| photos/breather-level.jpg | [Breather with adapter](https://reroshan.com/products/236) | Original product image |
| photos/dust-large.jpg | [Large dust cover reference](https://reroshan.com/products/275) | Original product image |
| photos/dust-small.jpg | [Small dust cover reference](https://reroshan.com/products/276) | Original product image |
| photos/depth-skid.jpg | [Depth skid reference](https://reroshan.com/products/284) | Original product image |
| photos/skid-bottom.jpg | [Depth skid bottom patta](https://reroshan.com/products/285) | Original product image |
| photos/namaste-patta.jpg | [Namaste patta reference](https://reroshan.com/products/268) | Original product image |
| photos/clevis-plate.jpg | [Clevis plate reference](https://reroshan.com/products/305) | Original product image |
| photos/pto.jpg | [PTO shaft with guards](https://reroshan.com/products/30) | Original product image |
| photos/gear-gasket.jpg | [Side gear cover gasket reference](https://reroshan.com/products/359) | Original product image |
| photos/rd-gasket-clean.jpg | [Rotor drive housing gasket reference](https://reroshan.com/products/376) | Product-only edit |
| photos/stub-gasket-clean.jpg | [Stub housing gasket reference](https://reroshan.com/products/377) | Product-only edit |
| photos/idler-gasket-clean.jpg | [Idler axle gasket reference](https://reroshan.com/products/378) | Product-only edit |
| photos/gearbox-gasket-clean.jpg | [Gearbox cover gasket reference](https://reroshan.com/products/379) | Product-only edit |
| photos/output-gasket-clean.jpg | [Output cover gasket reference](https://reroshan.com/products/380) | Product-only edit |
| photos/dowty.jpg | [Bonded / Dowty sealing washer](https://reroshan.com/products/tt-903-dowty-washer-m-8-blue-copy) | Original product image |
| photos/blade-l.jpg | [L-type rotavator blade](https://www.fieldking.com/blogs/rotavator-blades/) | Original product image |
| photos/blade-c.jpg | [C-type rotavator blade](https://www.fieldking.com/blogs/rotavator-blades/) | Original product image |
| photos/pipe-clamp.jpg | [Rotavator pipe clamp assembly reference](https://www.tradeindia.com/products/excellent-quality-rotavator-pipe-clamp-4779942.html) | Original product image |
| photos/taper-bearing.jpg | [Tapered roller bearing reference](https://www.exportersindia.com/product-detail/30209-taper-roller-bearing-9793712282.htm) | Original product image |
| photos/oil-seal.png | [Oil seal reference](https://shop.bushhog.com/oil-seal-double-lip-45x85x10) | Original product image |
| photos/o-ring.jpg | [Rubber O-ring reference](https://www.p-lindberg.no/o-ring-112x3-55-9055518/) | Original product image |
| photos/gear-cover-clean.jpg | [Side gear cover reference](https://codelba.com.mx/products/tapa-lateral-engranaje-rotovator) | Product-only edit |
| photos/side-plate.jpg | [Side plate reference](https://dittogold.com/rotavator-side-plate/) | Original product image |
| photos/clevis-back-clean.jpg | [Clevis bracket back plate reference](https://www.agrodrag.com/) | Product-only edit |
| photos/drain-plug.webp | [Oil drain / level plug reference](https://bszfarmer.hu/kf-04-olajzaro-csavar-fem-szentkiralyi-rotacios-kapahoz-49044) | Original product image |
| photos/ball-bearing.jpg | [Deep groove ball bearing reference](https://export.rsdelivers.com/product/skf/6309/skf-6309-1-row-ball-bearing-45-mm-id-100-mm-od/2851181) | Original product image |
| photos/single-gearbox-clean.jpg | [Single speed rotavator gearbox reference](https://www.onkaragro.com/gearboxes/rotavator-gearbox-single-speed) | Product-only edit |


2026-10-01 orange update: the single-speed gearbox now uses `photos/single-gearbox-orange.jpg`, edited from its retained clean reference using the built-in image tool. Only the painted green finish was requested to become orange; bare-metal parts retained. The multispeed photo was already orange. Original source attribution remains unchanged; exact prompt in IMAGE_EDIT_NOTES.md.
