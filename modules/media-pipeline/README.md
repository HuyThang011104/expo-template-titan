# modules/media-pipeline

Local Expo module (Swift + Kotlin) for media work no SDK library covers.
First function: `getVideoMetadata(uri)` — dimensions/duration/size for
upload validation. Called via `getLocalVideoMetadata()` in
`src/shared/media/video-info.ts`, which falls back to picker values when
the module is missing (web, Expo Go, stale dev clients).

## Workflow (must follow — native is not Fast-Refreshable)

1. **TS contract first.** Change `src/MediaPipeline.types.ts` + the declared
   class in `src/MediaPipelineModule.ts`, then implement Swift/Kotlin to match.
2. **Edit native** in `ios/MediaPipelineModule.swift` /
   `android/.../MediaPipelineModule.kt`. Keep functions small, throwing (not
   silent) on invalid input; nullable only for genuinely missing data.
3. **Rebuild the Dev Client** — JS OTA is NOT enough for native changes:
   `eas build --profile development-device` (or `npx expo run:android|ios`
   locally), then reinstall on the device. The whole team reinstalls.
4. **Smoke test on device**: open the `(shared)/showcase` route after wiring
   a caller, or call from devtools. Simulator lies about codecs/performance.
5. **Jest**: never import the native module directly in tests. Either exercise
   the fallback path (module absent in Jest) or `jest.mock("expo", …)` for
   `requireOptionalNativeModule`. See `video-info.test.ts`.

## Verify checklist (before merging any native change)

- [ ] `tsc --noEmit`, `eslint .`, `jest` green (TS side only)
- [ ] Fresh EAS dev build installs + old dev build degrades gracefully
       (callers must handle a missing module — see `video-info.ts`)
- [ ] iOS real device + Android real device (codecs differ per vendor)
- [ ] No secrets in native logs; no PII in returned payloads

## Next candidates (in order)

1. `compressVideo(uri, preset)` — client-side transcode before upload.
   Needs Media3 Transformer (Android) + AVFoundation export session (iOS).
2. `generateThumbnail(uri, atMs)` — blurhash/poster placeholders.
