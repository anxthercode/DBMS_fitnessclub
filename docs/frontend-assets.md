# Frontend Asset Credits

Assets added for the homepage prototype on 1 October 2026 are served locally. Photographs illustrate the fictional coursework club's visual direction; they are not photographs of a real FORMA facility. The homepage labels them as concept imagery. CSS crops images without changing the source files. No reference-club photographs were reused.

| Local asset | Author and source | Usage terms |
| --- | --- | --- |
| `frontend/public/images/design/pool.jpg` | Henry Fraczek, [indoor pool on Unsplash](https://unsplash.com/photos/indoor-pool-with-windows-reflecting-the-outside-Q7mXDwKk4CU) | [Unsplash License](https://unsplash.com/license), checked 1 October 2026 |
| `frontend/public/images/design/cardio.jpg` | Pietro Saura, [treadmills beside a window on Pexels](https://www.pexels.com/photo/treadmill-near-glass-window-5411023/) | [Pexels License](https://www.pexels.com/license), checked 1 October 2026 |
| `frontend/public/images/design/changing-room.jpg` | Polina Tankilevitch, [sports-club locker room on Pexels](https://www.pexels.com/photo/locker-room-in-sports-club-3875521/) | [Pexels License](https://www.pexels.com/license), checked 1 October 2026 |

`frontend/public/images/club.jpg` is a pre-existing project asset reused without replacing it. Its original attribution was not established in this milestone; verify its provenance before publication.

## Stage 1 selection — 2 October 2026

The consolidated space selector now reuses `home/functional-training.webp` for the gym, `design/cardio.jpg` for cardio, `design/changing-room.jpg` for amenities and the new `home/pool-daylight.webp` for the pool. The existing hero and three coach portraits are retained. This removes duplicated gallery imagery and the weak close-up pool view from the rendered page. The previous `club.jpg` and `design/pool.jpg` files are retained but no longer rendered on the pages; the legacy club metadata still contains its original `club.jpg` field.

| New local asset | Source | Delivery |
| --- | --- | --- |
| `frontend/public/images/home/pool-daylight.webp` | Generated with the built-in imagegen tool on 2 October 2026; fictional concept facility, no external reference photographs | 1536 × 1024, WebP quality 84, 218,392 bytes |

Only format encoding was applied to the generated PNG; no image content or colors were edited. The generated original remains in the tool output directory. The shared homepage note identifies the image as concept imagery; the page does not claim pool dimensions or verified real facilities. Every space image has localized alt text and explicit source dimensions. The photo viewport uses a stable aspect ratio, a 300 ms crossfade, native lazy loading and reduced-motion handling.

### pool-daylight generation prompt

Use case: photorealistic-natural. Asset: one landscape editorial photograph, 1536x1024, for the pool tab on FORMA, a fictional fitness club coursework website. A modest contemporary indoor swimming pool seen from its tiled edge, clear naturally turquoise water, simple pale grey tile, slate structural details, large windows letting in plentiful soft daylight, subtle greenery outdoors. Wide eye-level composition shows the water and the room coherently, calm approachable everyday fitness-club environment. Natural realistic architectural photography, bright exposure without blown highlights, accurate reflections and straight architecture. This is concept imagery, not a depiction of any real club. No people, text, logos, watermarks, collage, spa facilities, luxury resort décor, extravagant features or measurements.

## Homepage hero replacement — 2 October 2026

The main photograph beside “Ваш темп. Ваше пространство.” / “Your pace. Your space.” now uses a real stock photograph of an empty gym, replacing the generated woman-with-dumbbells image.

| Local asset | Photographer and source | License and dimensions |
| --- | --- | --- |
| `frontend/public/images/home/hero-gym.webp` | Max Vakhtbovych, [Various fitness machines in modern spacious gym](https://www.pexels.com/photo/various-fitness-machines-in-modern-spacious-gym-7031706/) | [Pexels License](https://www.pexels.com/license/), checked 2 October 2026; source 7342 × 4900; delivery 1920 × 1281, WebP quality 88, 441,670 bytes |

The official photo page lists the image as free. Pexels permits free website/commercial use and modification without required attribution, subject to its license restrictions (including no implied endorsement and no stock redistribution). Credit is retained here. [Original download](https://images.pexels.com/photos/7031706/pexels-photo-7031706.jpeg?cs=srgb&dl=pexels-artbovich-7031706.jpg&fm=jpg).

The selected source was visually checked: no people or watermark. The download was proportionally resized and encoded locally without retouching, AI generation, color changes or watermark removal. Centered CSS cover cropping preserves the central aisle and surrounding equipment across desktop/mobile layouts. RU/EN alt text and intrinsic dimensions were updated; the caption is unchanged. The old `hero-training.webp` remains as an unused historical asset. The shared concept-imagery note still explains that the photograph is illustrative, not a verified FORMA location.

## Fonts

All existing site routes use locally hosted Manrope in weights 400, 500 and 600, with Latin and Cyrillic coverage. Source: [Google Fonts Manrope](https://fonts.google.com/specimen/Manrope), distributed under the SIL Open Font License 1.1. The license and copyright notice are preserved in `frontend/public/fonts/OFL-Manrope.txt`; `manrope-source.css` records the Google Fonts download URLs. The shared `Manrope` font faces are declared in `frontend/src/styles.css`. No external font request is needed to render the site.

## Generated first-stage homepage imagery

Created on 1 October 2026 with the built-in imagegen tool. [Exact generation prompts](#generation-prompts) are preserved. These images depict fictional people and concept spaces, not real FORMA members, staff or facilities. One shared note near the homepage contacts identifies all concept imagery and fictional AI coach portraits; the standalone coaches page retains its profile note. Do not associate these portraits with live API identities: the mapping is limited to mock mode.

| Local asset | Purpose | Delivery dimensions |
| --- | --- | --- |
| `frontend/public/images/home/hero-training.webp` | Homepage training photograph | 1536 × 1024 |
| `frontend/public/images/home/functional-training.webp` | Functional exercise photograph | 1536 × 1024 |
| `frontend/public/images/home/coach-artem.webp` | Fictional strength coach | 640 × 960 |
| `frontend/public/images/home/coach-anna.webp` | Fictional mobility coach | 640 × 960 |
| `frontend/public/images/home/coach-mikhail.webp` | Fictional swimming coach | 640 × 960 |

PNG originals were encoded as local WebP delivery assets at quality 84. Portraits were proportionally resized; cropping is performed responsively with CSS. The hero uses high-priority loading, while lower-page images use native lazy loading. No external image or font request is required by these sections.

## Generation prompts

### functional-training

Final asset: `frontend/public/images/home/functional-training.webp`

Use case: photorealistic-natural. Asset: landscape photograph, 1536x1024, for the functional exercise section of FORMA, a fictional modern fitness club. An athletic adult man in plain charcoal t-shirt and slate shorts performs a balanced forward lunge on a dark exercise mat, side three-quarter view, full body including head hands and feet visible with plenty of surrounding space. Authentic controlled motion, natural realistic anatomy. Dark charcoal and slate functional training studio, natural cool daylight from large side windows, a few softly blurred free weights in the background, clean architecture. Premium editorial sports photography, realistic textures and natural colors consistent with a modern gym portrait series. No text, no logo, no watermark, no collage. Composition keeps entire body and head in middle 60 percent horizontally and middle 70 percent vertically for responsive crops.

Created on 1 October 2026 using the built-in imagegen tool. These are fictional people and spaces for the coursework demonstration. The generated PNG originals remain in the tool output directory; locally encoded WebP delivery copies are in `frontend/public/images/home/`. No external club photography was copied. Encoding changes the delivery format and dimensions only.

### hero-training

Final asset: `frontend/public/images/home/hero-training.webp`

Use case: photorealistic-natural. Website photography for FORMA, a fictional contemporary fitness club. Premium editorial sports photography, natural skin and material textures, understated charcoal and slate gym interiors, soft cool daylight, restrained neutral colors, authentic approachable adults, no text, no logos, no watermarks, no neon effects. Asset: wide landscape homepage hero, 1536x1024. Athletic adult woman in slate sportswear doing a controlled standing dumbbell exercise, three-quarter view, both hands holding modest dumbbells at her sides, eyes focused, waist-up to knees visible, anatomically realistic. Subject centered slightly right in a spacious strength training gym, rack of weights softly visible at left, daylight windows at right. Strong photographic composition with depth, crisp subject against softer architectural background. No text overlay space needed.

### coach-artem

Final asset: `frontend/public/images/home/coach-artem.webp`

Use case: photorealistic-natural. Website photography for FORMA, a fictional contemporary fitness club. Premium editorial sports photography, natural skin and material textures, understated charcoal and slate gym interiors, soft cool daylight, restrained neutral colors, authentic approachable adults, no text, no logos, no watermarks, no neon effects. Asset: vertical waist-up portrait, 1024x1536, fictional male strength coach aged 32, short brown hair, neat stubble, plain charcoal t-shirt, relaxed arms by sides, subtle welcoming smile, looking at camera. Subject centered, head fully in frame, dark blurred gym background with daylight, professional candid portrait rather than bodybuilder posing.

### coach-anna

Final asset: `frontend/public/images/home/coach-anna.webp`

Use case: photorealistic-natural. Website photography for FORMA, a fictional contemporary fitness club. Premium editorial sports photography, natural skin and material textures, understated charcoal and slate gym interiors, soft cool daylight, restrained neutral colors, authentic approachable adults, no text, no logos, no watermarks, no neon effects. Asset: vertical waist-up portrait, 1024x1536, fictional female mobility coach aged 29, brown hair tied back, plain slate long-sleeve athletic top, relaxed hands naturally held together in front at waist, warm subtle smile, looking at camera. Subject centered, head fully in frame, softly blurred dark functional training studio with daylight, professional candid portrait.

### coach-mikhail

Final asset: `frontend/public/images/home/coach-mikhail.webp`

Use case: photorealistic-natural. Website photography for FORMA, a fictional contemporary fitness club. Premium editorial sports photography, natural skin and material textures, understated charcoal and slate gym interiors, soft cool daylight, restrained neutral colors, authentic approachable adults, no text, no logos, no watermarks, no neon effects. Asset: vertical waist-up portrait, 1024x1536, fictional male swimming coach aged 35, short dark blond hair, clean shaven, plain dark navy athletic polo shirt, relaxed arms by sides, friendly subtle smile, looking at camera. Subject centered, head fully in frame, softly blurred cool indoor pool and windows behind, same subdued editorial treatment as a modern gym portrait.


## NORTHSIDE user-supplied media — 5 October 2026

The user supplied these files in the original project and confirmed on 4 October 2026 that the video and portraits were generated with GPT and Gemini and authorized their use. The exact model/prompt for each individual file was not supplied; no stock author, external license or real person is claimed. The website identifies the club imagery and coach identities as a coursework concept.

| Delivery asset | Source and processing | Dimensions / size |
| --- | --- | --- |
| `frontend/public/videos/home/club-tour.mp4` | User's original `videos/home/club-tour.mp4`; H.264 frames copied losslessly, audio removed, MP4 fast-start enabled. Original input remains in the original project. | 1280 × 720, 24 fps, 10 seconds; 5,257,276 bytes |
| `frontend/public/images/home/club-tour-poster.webp` | Frame at 5.6 seconds of the supplied clip, encoded as WebP quality 88. No AI retouching. | 1280 × 720; 75,906 bytes |
| `frontend/public/images/trainers/trainer-01.webp` | Byte-identical copy of user-supplied `trainer_01.webp`, connected to fictional mock ID 2. | 843 × 1264; 74,026 bytes |
| `frontend/public/images/trainers/trainer-02.webp` | Byte-identical copy of user-supplied `trainer_02.webp`, connected to fictional mock ID 7. | 1408 × 768; 147,900 bytes |
| `frontend/public/images/trainers/trainer-03.webp` | Byte-identical copy of user-supplied `trainer_03.webp`, connected to fictional mock ID 3. | 1408 × 768; 143,092 bytes |

The video is muted and has a visible pause/resume control, offscreen/hidden-tab suspension and a static reduced-motion/error fallback. Reduced motion does not request the video. CSS handles responsive cover cropping. Trainer portraits were visually checked in the rendered cards; no source portrait was overwritten. The previous `home/coach-*.webp`, `hero-training.webp` and `functional-training.webp` assets are preserved.

The wide gym-space view now reuses the previously credited Max Vakhtbovych / Pexels `home/hero-gym.webp`, avoiding a crop that cut the exercising person's head. Existing cardio, pool and changing-room source records above still apply. Historical FORMA attribution and generation prompts are retained as history.

## User-selected facility photos — 7 October 2026

The user supplied the files in `frontend/public/images/there/` and explicitly requested their integration. Authors, original URLs and licenses were not supplied; no stock attribution or AI origin is inferred. The selected delivery copies are byte-identical to the originals; only CSS cover cropping is used. Original files, unused `swimming_pool_inside_1.webp` and previous imagery are preserved.

| Delivery asset | Supplied source | Dimensions / size |
| --- | --- | --- |
| `frontend/public/images/club/gym.webp` | `there/gym.webp` | 1400 × 934; 291,550 bytes |
| `frontend/public/images/club/cardio.webp` | `there/cardiozone.webp` | 6720 × 4480; 1,385,358 bytes |
| `frontend/public/images/club/pool-inside.webp` | `there/swimming_pool_inside_2.webp` | 5626 × 4219; 2,872,526 bytes |
| `frontend/public/images/club/pool-outside.webp` | `there/swimming_pool_outside.webp` | 3456 × 4608; 1,579,246 bytes |

The warm timber interior in `inside_2` was selected to match the gym. The portrait outdoor photo uses `object-position: center 65%` to keep the water, trees and open sky in the wide gallery viewport. Gym and cardio photos replace the existing space photos; the changing-room image and hero video/poster remain. The four space tabs are preserved; the Pool tab has two accessible pressed-state buttons for indoor/outdoor views. Both views belong to the same existing purchasable pool zone. No separate tariff, dimensions, seasonal opening policy or heated-outdoor-pool claim was introduced. Localized alt text describes the actual supplied images; these images illustrate a fictional club and do not establish the location of real facilities. High-resolution original WebP sizes are retained rather than claiming image optimization.

Existing portrait IDs 2, 3 and 7 now represent Daniel Moreau, Sofia Koval and Maksim Savitski. Their biographies and education are explicitly fictional in RU/EN; this does not claim any real person's qualification or affiliation. The programme names used as references are [Loughborough BSc Sport and Exercise Science](https://www.lboro.ac.uk/study/undergraduate/courses/sport-and-exercise-science/) and [German Sport University Cologne Sport und Leistung](https://www.dshs-koeln.de/studium/vor-dem-studium/bachelorstudium/sport-und-leistung). Sofia's fictional profile names the Belarusian State University of Physical Culture without claiming a specific verified programme or certification. No Russian institution is used.
