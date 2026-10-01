# Frontend Asset Credits

Assets added for the homepage prototype on 1 October 2026 are served locally. Photographs illustrate the fictional coursework club's visual direction; they are not photographs of a real FORMA facility. The homepage labels them as concept imagery. CSS adjusts saturation and crops images without changing the source files. No reference-club photographs were reused.

| Local asset | Author and source | Usage terms |
| --- | --- | --- |
| `frontend/public/images/design/pool.jpg` | Henry Fraczek, [indoor pool on Unsplash](https://unsplash.com/photos/indoor-pool-with-windows-reflecting-the-outside-Q7mXDwKk4CU) | [Unsplash License](https://unsplash.com/license), checked 1 October 2026 |
| `frontend/public/images/design/cardio.jpg` | Pietro Saura, [treadmills beside a window on Pexels](https://www.pexels.com/photo/treadmill-near-glass-window-5411023/) | [Pexels License](https://www.pexels.com/license), checked 1 October 2026 |
| `frontend/public/images/design/changing-room.jpg` | Polina Tankilevitch, [sports-club locker room on Pexels](https://www.pexels.com/photo/locker-room-in-sports-club-3875521/) | [Pexels License](https://www.pexels.com/license), checked 1 October 2026 |

`frontend/public/images/club.jpg` is a pre-existing project asset reused without replacing it. Its original attribution was not established in this milestone; verify its provenance before publication.

## Fonts

All existing site routes use locally hosted Manrope in weights 400, 500 and 600, with Latin and Cyrillic coverage. Source: [Google Fonts Manrope](https://fonts.google.com/specimen/Manrope), distributed under the SIL Open Font License 1.1. The license and copyright notice are preserved in `frontend/public/fonts/OFL-Manrope.txt`; `manrope-source.css` records the Google Fonts download URLs. The shared `Manrope` font faces are declared in `frontend/src/styles.css`. No external font request is needed to render the site.
