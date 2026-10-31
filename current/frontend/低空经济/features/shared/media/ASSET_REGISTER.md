# Media asset register

Updated: 2026-08-01

All `lowair-*` images were supplied with the existing project asset pack in `frontend/lowair-assets`. No upstream URL, photographer, or license file accompanied that pack. They are suitable for local demonstration only until the owner adds proof of origin and production-use authorization. `online-drone-login.jpg` is an older repository asset with the same missing provenance.

| File | Size | WebP thumbnail | Use pages | Alt text summary | Source | Authorization |
| --- | --- | --- | --- | --- | --- | --- |
| `lowair-carousel-certification.png` | 1200x800 PNG | `lowair-carousel-certification-thumb.webp` (640x427) | Home carousel | Industry drone above a city | Existing project asset pack, audited 2026-08-01 | Demo only, provenance required before release |
| `lowair-carousel-work.png` | 1200x800 PNG | `lowair-carousel-work-thumb.webp` (640x427) | Home carousel | Inspection drone above mountain power lines | Existing project asset pack, audited 2026-08-01 | Demo only, provenance required before release |
| `lowair-carousel-market.png` | 1200x800 PNG | `lowair-carousel-market-thumb.webp` (640x427) | Home carousel | Drone and batteries on an inspection bench | Existing project asset pack, audited 2026-08-01 | Demo only, provenance required before release |
| `lowair-flight-service.png` | 1200x800 PNG | `lowair-flight-service-thumb.webp` (640x427) | Flight service, AI assistant | Drone following a route to a landing point | Existing project asset pack, audited 2026-08-01 | Demo only, provenance required before release |
| `lowair-academy-training.png` | 1200x800 PNG | `lowair-academy-training-thumb.webp` (640x427) | Academy, community sample post | Outdoor drone training | Existing project asset pack, audited 2026-08-01 | Demo only, provenance required before release |
| `lowair-institution-campus.png` | 1200x800 PNG | `lowair-institution-campus-thumb.webp` (640x427) | Institution detail | Training campus landing area | Existing project asset pack, audited 2026-08-01 | Demo only, provenance required before release |
| `lowair-learning-video.png` | 1200x800 PNG | `lowair-learning-video-thumb.webp` (640x427) | Learning video | Pre-flight course demonstration cover | Existing project asset pack, audited 2026-08-01 | Demo cover only, not evidence of a playable video |
| `lowair-work-inspection.png` | 1200x800 PNG | `lowair-work-inspection-thumb.webp` (640x427) | Work and task pages | Power-line inspection flight | Existing project asset pack, audited 2026-08-01 | Demo only, provenance required before release |
| `lowair-used-drone-flight.png` | 1200x800 PNG | `lowair-used-drone-flight-thumb.webp` (640x427) | Market and product pages | Used-drone test flight | Existing project asset pack, audited 2026-08-01 | Demo only, provenance required before release |
| `lowair-market-drone.png` | 800x800 PNG | `lowair-market-drone-thumb.webp` (480x480) | Market products | Foldable drone product view | Existing project asset pack, audited 2026-08-01 | Demo only, not a verified product listing image |
| `lowair-market-accessories.png` | 800x800 PNG | `lowair-market-accessories-thumb.webp` (480x480) | Market products | Batteries, propellers and filters | Existing project asset pack, audited 2026-08-01 | Demo only, not a verified product listing image |
| `lowair-community-flightlog.png` | 1200x800 PNG | `lowair-community-flightlog-thumb.webp` (640x427) | Community posts, nearby, interaction cover | Drone flight over a mountain lake | Existing project asset pack, audited 2026-08-01 | Demo only; interaction cover must not imply a live stream |
| `lowair-login-drone.png` | 800x800 PNG | `lowair-login-drone-thumb.webp` (480x480) | Reserved login visual | Drone on a dark blue background | Existing project asset pack, audited 2026-08-01 | Demo only, currently unreferenced |
| `online-drone-login.jpg` | 1600x1067 progressive JPEG | Original used directly (267 KB) | Entry, auth, flight | White quadcopter in front of woodland | Existing repository asset, audited 2026-08-01 | Provenance and license missing, replace or document before release |

## Processing

- The 13 `lowair-*` PNG files retain their original paths. On 2026-08-01, each also received an offline-derived WebP thumbnail using Pillow/Lanczos at 640px landscape or 480px square; no AI image service was used.
- Landscape assets use 1200x800. Square catalogue assets use 800x800.
- Filenames follow `lowair-<domain>-<subject>.png`; navigation remains in `static/nav` as SVG icons.
- Accessible alternative text and intrinsic dimensions are defined in `media-registry.js`.
- No API URL, model endpoint, credential, or API key is stored in this media directory.
