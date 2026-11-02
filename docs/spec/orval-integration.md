# Spec tích hợp Orval — Mobile App University

> **Orval = transport + type contract. Không phải state layer.**
>
> File này là nguồn sự thật duy nhất (SSOT) cho việc đưa Orval vào mobile app.
> Mọi plan/PR/implement liên quan đến Orval phải đọc file này trước và cập nhật
> file này khi một quyết định thay đổi.
>
> Code là nguồn sự thật về hành vi hiện tại; file này chốt đích đến và các hợp
> đồng không được vi phạm.

| Trường | Giá trị |
|---|---|
| Trạng thái | Approved v1.1 — SSOT cho Orval integration |
| Ngày | 2026-11-02 |
| Phạm vi | `orval.config.ts`, `openapi/**`, `src/shared/api/**`, `src/entities/*/api.ts`, `src/shared/auth/**`, `package.json`, `tsconfig.json`, `eslint.config.js` |
| Liên quan | `AGENTS.md`, `docs/design-system.md`, `docs/feel-spec.md`, `../web-admin-school/orval.config.ts`, `../backend-university/openapi/openapi.json` |
| Nền tảng | Expo SDK 57, React Native 0.86, React 19.2.3, New Architecture, TanStack Query 5, pnpm 11.15.0 |
| Kế hoạch thi công | Chưa tạo. File này là input để tạo `schedule/orval-plan.md` (hoặc tương đương) |

---

## 0. Quyết định đã chốt

| # | Quyết định | Giá trị | Hệ quả |
|---|---|---|---|
| D1 | Vai trò của Orval | **Transport + type contract** | Sinh HTTP client + DTO từ OpenAPI. Không thay kiến trúc query/cache |
| D2 | HTTP client | `client: "fetch"` + custom mutator | Không dùng `ky` như `web-admin-school` |
| D3 | React Query hooks | **Không generate** | Query/mutation vẫn viết tay trong `entities`/`features`; giữ canonical cache |
| D4 | Vị trí code gen | `src/shared/api/gen/**` | Không đặt `src/gen`; boundary config chỉ nhận `src/shared/**` |
| D5 | Return type của fetch client | `override.fetch.includeHttpResponseReturnType: false` | Generated fn trả đúng body JSON, không lệch runtime kiểu `{ data, status }` |
| D6 | Mutator | Wrap `request()` có sẵn | Giữ Bearer, refresh 401, timeout, mock, `ApiError` |
| D7 | Nguồn contract | Vendored `openapi/openapi.json` (snapshot backend) + `CONTRACT_SPEC_PATH` khi cần test checkout khác | Codegen offline/reproducible; cập nhật bằng `pnpm contract:sync` |
| D8 | Version Orval | Pin `8.30.0` | Khớp `web-admin-school`, tránh drift generator |
| D9 | Generated output | **Gitignore `src/shared/api/gen/**`** | Không commit, không sửa tay; CI/EAS luôn regenerate từ vendored spec |
| D10 | Codegen lifecycle | `postinstall` + CI + EAS regenerate | Fresh clone/build luôn có gen; spec vendored nên không cần network |
| D11 | Mock | Không dùng MSW của Orval | Giữ `mock-handlers.ts`, hoặc tắt `EXPO_PUBLIC_API_MOCK` khi chạy backend thật |
| D12 | Lint generated code | Ignore `src/shared/api/gen/**` | Code gen không phải code review của app |
| D13 | Quyền import DTO | Chỉ `src/shared/api/**` và `src/entities/*/api.ts` | Feature/component không import DTO; không leak contract ra UI |
| D14 | Runtime validation | Vẫn dùng zod trong `entities/*/schema.ts` | Generated DTO chỉ là compile-time; dữ liệu thật vẫn parse |
| D15 | Envelope | Unwrap đúng **một lần** ở biên entity | Không rải `.data` khắp feature/component |
| D16 | Auth refresh | Do `shared/auth` + `auth-middleware` đảm nhiệm | Orval không giải quyết refresh token của native |
| D17 | Phạm vi endpoint | Chỉ những gì có trong OpenAPI | Feature không có endpoint (chat, follow, search…) giữ mock/hoãn |
| D18 | Contract change | Đổi backend → `contract:sync` → `codegen` → `tsc` | `contract:verify` giữ spec khớp metadata; không sửa tay file generated |

---

## 1. Mục tiêu và non-goals

### 1.1 Mục tiêu

1. Có một nguồn type duy nhất cho request/response backend, không viết tay DTO.
2. Mọi call backend đi qua đúng một HTTP pipeline hiện có (auth, timeout, lỗi, mock).
3. Đổi backend contract = regenerate + typecheck, không sửa rải rác.
4. Giữ nguyên kiến trúc feature/entity/cache của Titan kernel.
5. Có lộ trình migrate từng vertical, không big-bang.

### 1.2 Non-goals

- Không generate `react-query` hooks, `swr` hooks, hay query keys.
- Không thay `src/shared/api/client.ts` bằng client của Orval.
- Không đưa DTO trực tiếp vào `entities/*/model.ts`.
- Không dùng Orval MSW mock trên React Native ở v1.
- Không gọi backend/network hoặc checkout sibling repo lúc build; codegen chỉ đọc vendored spec.
- Không migrate toàn bộ feature social trong một PR.
- Không thêm backend endpoint mới trong phạm vi mobile. Việc thiếu endpoint là gap của backend contract.

---

## 2. Hiện trạng

### 2.1 Mobile app

| Thành phần | Hiện tại |
|---|---|
| HTTP client | `src/shared/api/client.ts` — `request()` + `client.get/post/...` |
| Auth | `src/shared/api/auth-middleware.ts` — Bearer + refresh 401 một lần; refresh đang là mock `dev-token` |
| Endpoint paths | `src/shared/api/endpoints.ts` — viết tay, không khớp backend |
| Mock | `src/shared/api/mock-handlers.ts` — in-app mock fetch; `.env` đang bật `EXPO_PUBLIC_API_MOCK=true` |
| Session | `src/shared/auth/session-provider.tsx` — session mock `dev-token`, lưu qua `useStorageState` → `secure.ts` |
| Query/cache | TanStack Query; canonical keys ở `src/shared/query/query-keys.ts`; `entities/post/cache.ts` sở hữu patch cache |
| Runtime shape | `entities/*/schema.ts` — zod parse wire → domain model |
| Boundary | `eslint.config.js` — app → feature/entity/shared; feature → entity/shared; entity → shared; shared → shared |

### 2.2 Web-admin reference

`../web-admin-school/orval.config.ts` đang dùng:

- `mode: "tags-split"`, `client: "fetch"`, `schemas: "src/gen/model"`, `clean: true`
- Mutator `genKyInstance` dùng `ky` + refresh single-flight
- MSW mock cho dev/test
- Pin contract tag `contract-v1.0`
- Generated output tại `src/gen/**`

**Không copy nguyên** các điểm sau sang mobile:

| Điểm | Web-admin | Mobile |
|---|---|---|
| HTTP runtime | ky | fetch + `request()` hiện có |
| Response type | `{ data, status }` mặc định | `includeHttpResponseReturnType: false` |
| Refresh token | HttpOnly cookie | Native nhận `refreshToken` trong body → SecureStore |
| Mock | MSW | in-app fetch mock (hoặc tắt) |
| Vị trí gen | `src/gen` | `src/shared/api/gen` |
| Query | Refine data provider | TanStack Query + canonical entity cache |

### 2.3 Backend contract

- Spec nguồn: `../backend-university/openapi/openapi.json` (107 paths, 35 tags).
- Snapshot trong repo mobile: `openapi/openapi.json`; provenance + checksum ở `openapi/contract.json`.
- Sinh spec backend bằng: `nx run api-gateway:generate-openapi` (build-time, commit vào git backend).
- Cập nhật snapshot: `pnpm contract:sync` (mặc định đọc sibling checkout; override `CONTRACT_SPEC_PATH`).
- Verify snapshot: `pnpm contract:verify` so checksum với metadata.
- Endpoint được serve tại `GET /openapi.json` của api-gateway.
- Response thành công bọc envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "path": "/api/...",
  "timestamp": "2026-11-02T00:00:00.000Z",
  "data": {}
}
```

- Path đều có prefix `/api/...`.
- Native login/refresh trả thêm `refreshToken` trong body; browser dùng cookie `auth_refresh`.

---

## 3. Kiến trúc đích

```
src/app/**                         (route mỏng)
  └─ import feature screens

src/features/<name>/**             (UI + screen + mutation orchestration)
  └─ import entities/*, shared/*

src/entities/<name>/
  ├─ api.ts                        (gọi generated fn, map DTO → domain, zod parse)
  ├─ cache.ts                      (canonical cache, optimistic update)
  ├─ queries.ts / mutations        (TanStack Query, query keys)
  └─ model.ts                      (domain type, KHÔNG phải DTO)

src/shared/api/
  ├─ gen/**                        (Orval output — read-only)
  ├─ orval-mutator.ts              (generated fn → request())
  ├─ envelope.ts                   (ApiEnvelope + unwrap helper)
  ├─ client.ts                     (fetch pipeline hiện có)
  ├─ auth-middleware.ts            (Bearer + refresh single-flight)
  ├─ errors.ts                     (ApiError)
  └─ endpoints.ts                  (chỉ còn WS/absolute URL; path HTTP dần xoá)
```

Luồng một request:

```
entity/api.ts
  → generated fn (src/shared/api/gen/...)
    → mobileMutator(url, init)
      → request(path, options)
        → createAuthFetch
          → globalThis.fetch | mock fetch
```

Quy tắc một chiều:

- `app` → `feature` → `entity` → `shared`.
- `shared` không import `entity`/`feature`.
- `entity` không import `feature`.
- `feature` không import `feature`.
- Generated code nằm trong `shared`; entity được phép import.

---

## 4. Hợp đồng bất biến

1. **Route mỏng.** `src/app` chỉ glue screen từ feature.
2. **Entity sở hữu domain.** Không feature nào tự định nghĩa `Post`, `User`, hay DTO backend.
3. **Canonical cache.** Một Post có đúng một query `["posts", id]` (xem `query-keys.ts`); list chỉ giữ ids. Mọi like/update patch entity, không tạo cache song song.
4. **Không generated hooks.** Nếu Orval sinh hook, nó sẽ tạo query key/cache thứ hai và phá optimistic update. Cấm bật `client: "react-query"`.
5. **Một HTTP pipeline.** Mọi request generated phải đi qua `request()`. Không gọi `fetch` trực tiếp trong entity/feature.
6. **Envelope unwrap một lần.** Generated fn trả `ApiEnvelope<T>`; `entity/api.ts` unwrap → map → parse. Feature chỉ thấy domain type.
7. **DTO không leak.** `features/**` và `entities/*/model.ts` không import `@/shared/api/gen/**`.
8. **Generated code là read-only.** Không sửa tay; sửa config/spec rồi regenerate.
9. **Runtime validation vẫn bắt buộc.** TypeScript không bảo vệ dữ liệu từ network. Dùng zod parser ở biên entity.
10. **Contract pin.** Mỗi lần backend đổi contract phải chạy `pnpm contract:sync`, `pnpm contract:verify`, rồi `pnpm codegen`.

---

## 5. Cấu hình Orval

### 5.1 `orval.config.ts` (root repo)

```ts
import path from "node:path";

import { defineConfig } from "orval";

/**
 * Single source of truth for codegen: the vendored snapshot of the backend
 * contract. Refresh it with `pnpm contract:sync`, then run `pnpm codegen`.
 * `CONTRACT_SPEC_PATH` is only for explicitly testing another backend checkout.
 */
const inputTarget = process.env.CONTRACT_SPEC_PATH
  ? path.resolve(process.env.CONTRACT_SPEC_PATH)
  : path.resolve(process.cwd(), "openapi/openapi.json");

export default defineConfig({
  mobile: {
    input: {
      target: inputTarget,
    },
    output: {
      mode: "tags-split",
      target: "src/shared/api/gen/index.ts",
      schemas: "src/shared/api/gen/model",
      client: "fetch",
      clean: true,
      override: {
        mutator: {
          path: "./src/shared/api/orval-mutator.ts",
          name: "mobileMutator",
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
```

Ghi chú:

- Chạy `pnpm codegen` từ repo root để `process.cwd()` đúng.
- Không đặt `output.baseUrl`. Spec hiện không có `servers`, nên generated URL là `/api/...`.
  Nếu backend thêm `servers`, mutator vẫn chuẩn hoá absolute URL → path.
- `clean: true` chỉ xoá trong `src/shared/api/gen`.
- `openapi/openapi.json` là bản copy nguyên văn từ backend, có checksum trong
  `openapi/contract.json`. Không chỉnh tay; cập nhật bằng `pnpm contract:sync`.
- `CONTRACT_SPEC_PATH` chỉ dùng khi muốn thử codegen với checkout backend khác.

### 5.2 `package.json`

Thêm devDependency và các script mới (các script còn lại giữ nguyên):

```json
{
  "scripts": {
    "codegen": "orval --config orval.config.ts",
    "contract:sync": "node scripts/sync-contract.mjs",
    "contract:verify": "node scripts/verify-contract.mjs",
    "postinstall": "pnpm codegen"
  },
  "devDependencies": {
    "orval": "8.30.0"
  }
}
```

- `postinstall` regenerate từ `openapi/openapi.json`, nên fresh clone/EAS build luôn có gen.
- `gen` bị gitignore; không thể commit chỉnh tay. CI chạy `contract:verify` + `codegen`
  để phát hiện snapshot lệch metadata và đảm bảo output sinh từ đúng contract.
- Orval 8.30 **không có** cờ `--check`; không cần vì CI luôn sinh lại từ đầu.

### 5.3 `tsconfig.json`

Orval 8 sinh import kèm extension `.ts` (ví dụ `./authResponseDto.ts`). Expo base chưa bật `allowImportingTsExtensions`. Thêm:

```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true
  }
}
```

Điều này hợp lệ vì app đã `noEmit: true`.

### 5.4 `eslint.config.js`

Thêm ignore cho generated code:

```js
{
  ignores: [
    "dist/*",
    "node_modules/*",
    ".expo/*",
    "documentation/**",
    "packages/create-expo-titan/**",
    "src/shared/api/gen/**",
  ],
}
```

### 5.5 Quy ước import

```ts
// ĐÚNG: entity api gọi generated fn
import { authControllerLogin } from "@/shared/api/gen/auth/auth";
import type { LoginRequestDto } from "@/shared/api/gen/model";

// SAI: feature/component import DTO
import type { PostResponseDto } from "@/shared/api/gen/model";
```

Nếu cần enforce bằng lint, thêm `no-restricted-imports` cho `features/**` với pattern `@/shared/api/gen/*`.

---

## 6. Mutator

### 6.1 Trách nhiệm

`mobileMutator` là adapter duy nhất giữa generated code và `request()`:

| Việc | Xử lý |
|---|---|
| Method | `init.method` → `HttpMethod` |
| Headers | `HeadersInit` → `Record<string, string>` |
| Body | Chuyển nguyên `string` / `FormData`; `request()` tự JSON.stringify object |
| URL | Bỏ host nếu absolute; strip prefix `/api` trùng với `env.apiUrl` |
| 204 | `request()` trả `undefined` |
| Lỗi | `request()` throw `ApiError`; generated fn không catch |
| Signal | v1 bỏ qua; timeout 10s của `request()` vẫn bảo vệ |
| Auth | URL policy (xem §6.3) |

### 6.2 Code mẫu

```ts
import { env } from "../config/env";

import { request, type HttpMethod } from "./client";

type OrvalInit = RequestInit & { signal?: AbortSignal };

function toHeaderRecord(headers?: HeadersInit): Record<string, string> | undefined {
  if (!headers) return undefined;

  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  if (Array.isArray(headers)) {
    const out: Record<string, string> = {};
    for (const [key, value] of headers) out[key] = value;
    return out;
  }

  return { ...headers };
}

function toPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function stripApiPrefix(url: string): string {
  const pathname = toPath(url);
  const basePath = new URL(env.apiUrl, "http://localhost").pathname.replace(/\/+$/, "");

  const withoutDuplicate =
    basePath.length > 0 && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length)
      : pathname;

  return withoutDuplicate.startsWith("/") ? withoutDuplicate : `/${withoutDuplicate}`;
}

export const mobileMutator = async <T>(
  url: string,
  init?: OrvalInit,
): Promise<T> =>
  request<T>(stripApiPrefix(url), {
    method: (init?.method ?? "GET") as HttpMethod,
    headers: toHeaderRecord(init?.headers),
    body: init?.body ?? undefined,
  });
```

### 6.3 Auth policy theo URL

Generated fn không truyền cờ `auth`. Mutator phải quyết định theo path:

| Path | Auth attach | Refresh on 401 |
|---|---|---|
| `/api/auth/login` | Không | Không |
| `/api/auth/register` | Không | Không |
| `/api/auth/refresh` | Không | Không (tránh đệ quy) |
| Còn lại | Có (nếu có token) | Có, single-flight, đúng một lần |

Để làm được, mở rộng `RequestOptions` của `request()` thêm `skipAuthRefresh?: boolean`
(hoặc tách `auth: "none" | "optional" | "required"`). Đây là thay đổi nhỏ, backward-compatible,
thuộc Phase 1 cùng lúc với refresh token thật.

### 6.4 Envelope helper

`src/shared/api/envelope.ts`:

```ts
export type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  path: string;
  timestamp: string;
  data: T;
};

export function unwrapApiEnvelope<T>(body: ApiEnvelope<T>): T {
  return body.data;
}
```

`entity/api.ts` dùng:

```ts
const body = await authControllerLogin(input);
const auth = unwrapApiEnvelope(body);
```

Không unwrap trong feature/component.

### 6.5 Form-data / URL-encoded

- `FormData`: `request()` đã pass-through; fetch tự set boundary. Không set `Content-Type`.
- `URLSearchParams`: `request()` hiện JSON.stringify object nên **chưa** hỗ trợ.
  Nếu Orval sinh `application/x-www-form-urlencoded`, phải mở rộng `request()`
  pass-through `URLSearchParams` trước khi dùng endpoint đó.

---

## 7. Hợp đồng dữ liệu và mapping

### 7.1 Envelope

Mọi response thành công (trừ 204) có dạng `ApiEnvelope<T>`. Với
`includeHttpResponseReturnType: false`, generated fn trả chính `ApiEnvelope<T>`.

Ví dụ login:

```ts
const body = await authControllerLogin({ identifier, password });
// body: AuthControllerLogin200 = ApiEnvelope<AuthResponseDto>
const auth = unwrapApiEnvelope(body);
// auth: AuthResponseDto
```

### 7.2 Mapping DTO → domain

DTO backend và domain model mobile **không giống nhau**. Mapping nằm trong
`entities/<name>/api.ts`, không nằm trong feature.

Ví dụ `PostResponseDto` → `Post` (đề xuất, chốt khi làm Phase 3):

| Backend DTO | Mobile domain | Ghi chú |
|---|---|---|
| `id` | `id` | |
| `actorId` | `authorId` | Đổi tên |
| `content` | `body` | `null` → `""` |
| `media[].displayUrl` | `media[].url` | `displayUrl` là union/nullable; cần resolve fallback |
| `media[].displayUrl.kind` | `media[].kind` | `image` / `video` |
| `reactionCount` | `likeCount` | Semantics khác: reaction ≠ like |
| `reaction`/viewer state | `likedByMe` | Spec chưa trả viewer reaction trong Post; cần endpoint hoặc bổ sung |
| `createdAt` | `createdAt` | ISO string |
| `status` | (ẩn hoặc map) | `DRAFT/PUBLISHED/HIDDEN/DELETED` |

Quy tắc:

1. Không để DTO đi qua biên entity.
2. Map DTO → wire shape mà `schema.ts` đang hiểu, hoặc viết zod schema mới cho DTO.
3. `parse*` vẫn là cổng runtime; parse fail → `null`/warn như hiện tại.
4. Cache chỉ nhận domain model.

### 7.3 Feed

`FeedPageResponseDto`:

```json
{
  "items": { "type": "array", "items": {} },
  "nextCursor": { "type": "string", "nullable": true }
}
```

`items` hiện là schema rỗng → Orval sinh `unknown[]`. Đây là **gap của backend spec**,
không phải lỗi Orval. Hai lựa chọn:

1. Sửa backend decorator/zod để `items` có schema cụ thể (khuyến nghị), rồi regenerate.
2. Giữ `unknown[]` và parse từng item bằng zod ở entity (tạm thời).

Không cast `as Post[]` để lách type.

---

## 8. Auth trên mobile

Đây là phần Orval **không** giải quyết. Phase 1 phải làm cùng lúc.

### 8.1 Token storage

Backend trả cho native:

```ts
type AuthResponseDto = {
  accessToken: string;
  refreshToken?: string; // native có, browser không có
  expiresIn: number;
  user: { id: string; code: string; email: string; status: string };
};
```

Lưu bằng `secure.ts` (expo-secure-store), key hợp lệ theo `KEY_PATTERN`:

| Key | Giá trị |
|---|---|
| `session.accessToken` | access token |
| `session.refreshToken` | refresh token (native) |
| `session.expiresAt` | epoch ms |

Không log token. Không đưa token vào URL/query.

### 8.2 Refresh single-flight

- Nhiều request 401 đồng thời chỉ chạy **một** `POST /api/auth/refresh`.
- Refresh thành công → cập nhật token → retry request gốc đúng một lần.
- Refresh thất bại → clear session → để 401 đi tiếp (caller logout).
- Loại trừ `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh` khỏi retry.
- Refresh token rotation: nếu response refresh có `refreshToken` mới, lưu đè.
- Web fallback: nếu không có `refreshToken` trong body, dùng cookie như web-admin.

### 8.3 Session provider

- `signIn` gọi `authControllerLogin`, lưu token, set session.
- `signOut` gọi `authControllerLogout`, luôn clear local trong `finally`.
- `Stack.Protected` / `NativeTabs.Protected` giữ nguyên; chỉ đổi nguồn session.
- `getToken` cho `auth-middleware` đọc `session.accessToken`.

---

## 9. Mock và môi trường

| Chế độ | Cách chạy | Ghi chú |
|---|---|---|
| Dev với backend thật | `EXPO_PUBLIC_API_MOCK=false` + `EXPO_PUBLIC_API_URL=http://<host>:8080` | Khuyến nghị cho Phase 1+ |
| Dev không backend | `EXPO_PUBLIC_API_MOCK=true` | Phải cập nhật `mock-handlers.ts` sang path `/api/...` và envelope |
| E2E | `EXPO_PUBLIC_API_MOCK=true` | Giữ mock hiện tại; cập nhật route theo contract |

Lưu ý: `.env` hiện đang bật `EXPO_PUBLIC_API_MOCK=true`. Trước khi test Orval với
backend thật, phải tắt hoặc mock sẽ trả 404 cho path `/api/...`.

Không dùng `@orval/mock` / MSW ở v1 vì:

- RN không có service worker.
- In-app mock fetch đã đủ cho E2E.
- MSW native cần setup riêng, không đáng cho Phase 0–1.

---

## 10. Lộ trình migrate

### Phase 0 — Hạ tầng, chưa đổi consumer

Phạm vi:

- Thêm `orval@8.30.0`, `orval.config.ts`, `mobileMutator`, `envelope.ts`.
- Vendor `openapi/openapi.json` + `openapi/contract.json`; thêm `contract:sync`,
  `contract:verify`, `postinstall`.
- Gitignore `src/shared/api/gen/**`; sửa `tsconfig.json`, `eslint.config.js`.
- Không sửa feature/entity nào.

Done khi:

- `pnpm contract:verify` pass.
- `pnpm codegen` sinh output từ vendored spec, chạy lại ổn định.
- `pnpm typecheck` pass.
- `pnpm lint` + `pnpm lint:boundaries` pass.
- `git status` không hiện `src/shared/api/gen/**`.
- Generated code không bị lint.
- `endpoints.ts` và `client.ts` không bị xoá/sửa hành vi.

### Phase 1 — Auth pilot

Phạm vi:

- `features/auth` + `shared/auth` + `shared/api/auth-middleware.ts`.
- Dùng `authControllerLogin`, `authControllerRefresh`, `authControllerMe`, `authControllerLogout`.
- Token storage theo §8.
- Refresh single-flight thật; bỏ mock `dev-token`.
- Auth policy theo URL (§6.3).
- Xoá/ngắt path `/auth/session` khỏi flow thật.
- Cập nhật test auth.

Done khi:

- Login/logout/refresh/me chạy với backend thật.
- Kill app mở lại vẫn khôi phục session.
- 401 refresh đúng một lần; refresh fail → logout sạch.
- Không log token.
- `EXPO_PUBLIC_API_MOCK=false` chạy được.

### Phase 2 — Profile

Phạm vi:

- `entities/account` (hoặc entity profile) dùng:
  - `meProfileControllerGetMyProfile`
  - `meProfileControllerUpdateProfile`
  - `meProfileControllerReplaceFieldVisibility`
  - `meProfileControllerReplaceSocialLinks` (nếu có trong tag `me`)
  - `meProfileControllerSoftDeleteProfile`
- Map `ProfileSelfResponseDto` → domain `User`/profile model.
- Giữ canonical key `queryKeys.me`, `queryKeys.user(id)`.

Done khi:

- Đọc/cập nhật profile, field visibility, social links qua generated fn.
- Không còn path `/users/me` viết tay trong flow profile.
- Feature chỉ thấy domain type.

### Phase 3 — Content + Feed

Phạm vi:

- Posts: `postsControllerCreate`, `postsControllerList`, `postsControllerGetOne`,
  `postsControllerUpdateDraft`, `postsControllerRemove`.
- Reactions: `reactionsControllerUpsert`, `reactionsControllerRemove`, `reactionsControllerList`.
- Comments: `commentsControllerCreate`, `commentsControllerListRoots`,
  `commentsControllerListReplies`, `commentsControllerRemove`.
- Feed: `feedHomeControllerHomeMain` (và following/official khi feature cần).
- Mapping `PostResponseDto` → `Post`; giữ `cache.ts`, `queries.ts`, optimistic update.
- Xoá dần path trùng trong `endpoints.ts`.

Done khi:

- Feed load + pagination cursor từ `nextCursor`.
- Post detail, create, edit, delete.
- Reaction/comment hoạt động qua canonical cache.
- Không có DTO trong component.
- `FeedPageResponseDto.items` được type hoá hoặc parse runtime rõ ràng.

### Phase 4 — Media

Phạm vi:

- `mediaImagesControllerPresign` → upload → `mediaAssetsControllerConfirm`.
- `mediaVideosControllerInit` + `notifyUploaded` (nếu feature video).
- `mediaAssetsControllerAttach`.
- `expo-image` / `expo-video` giữ nguyên.

Done khi:

- Upload ảnh/video end-to-end.
- URL hiển thị resolve đúng, không leak DTO.

### Phase 5 — Phần còn lại (chỉ khi app có surface)

- Moderation, academic, authorization, badges.
- Chỉ migrate khi feature tương ứng được làm thật; không codegen-driven UI.

### Ngoài phạm vi (backend chưa có endpoint)

Các feature hiện có trong app nhưng **không có** trong spec hiện tại:

- Chat/inbox/conversations
- Notifications
- Search/trending/hashtag
- Follow/follow-requests/relationship
- Saved posts
- Devices/push registration
- Sessions/revoke session
- Repost

Các phần này giữ mock hoặc hoãn cho đến khi backend bổ sung contract. Không tự bịa
endpoint trong mobile.

---

## 11. Mapping endpoint đã xác nhận

| Mobile hiện tại | Backend | Orval fn | Tag | Ghi chú |
|---|---|---|---|---|
| `POST /auth/session` (mock) | `POST /api/auth/login` | `authControllerLogin` | `auth` | Native nhận `refreshToken` |
| `POST /auth/refresh` | `POST /api/auth/refresh` | `authControllerRefresh` | `auth` | Không retry 401 |
| `GET /users/me` | `GET /api/auth/me` | `authControllerMe` | `auth` | Identity, không phải profile đầy đủ |
| `PATCH /users/me` | `PATCH /api/me/profile` | `meProfileControllerUpdateProfile` | `me` | |
| `PATCH /users/me/privacy` | `PUT /api/me/profile/field-visibility` | `meProfileControllerReplaceFieldVisibility` | `me` | |
| `DELETE /users/me` | `DELETE /api/me/profile` | `meProfileControllerSoftDeleteProfile` | `me` | |
| `GET /feed/home` | `GET /api/feed/home-main` | `feedHomeControllerHomeMain` | `feed-home` | `items` đang untyped |
| `POST /posts` | `POST /api/content/posts` | `postsControllerCreate` | `content-posts` | |
| `GET /posts/:id` | `GET /api/content/posts/{postId}` | `postsControllerGetOne` | `content-posts` | |
| `PATCH /posts/:id` | `PATCH /api/content/posts/{postId}` | `postsControllerUpdateDraft` | `content-posts` | |
| `DELETE /posts/:id` | `DELETE /api/content/posts/{postId}` | `postsControllerRemove` | `content-posts` | |
| `POST /posts/:id/like` | `PUT /api/content/reactions` | `reactionsControllerUpsert` | `content-reactions` | Body `targetType/targetId/type`; enum `LOVE/HAHA/SAD`, không có `LIKE` |
| `GET /posts/:postId/comments` | `GET /api/content/comments` | `commentsControllerListRoots` | `content-comments` | |
| `POST /posts/:postId/comments` | `POST /api/content/comments` | `commentsControllerCreate` | `content-comments` | |
| `POST /uploads` | `POST /api/media/images/presign` → `POST /api/media/{id}/confirm` | `mediaImagesControllerPresign` / `mediaAssetsControllerConfirm` | `media-images` / `media` | Flow 2 bước |
| `GET /users/:id/posts` | `GET /api/content/posts?ownerType=USER&ownerId=...` | `postsControllerList` | `content-posts` | `ownerType`, `ownerId` bắt buộc |

Các path sau **không có** endpoint tương ứng trong spec hiện tại: `follow`, `unfollow`,
`follow-requests`, `block`, `mute`, `search`, `trending`, `hashtag`, `saved`, `repost`,
`conversations`, `notifications`, `devices`, `sessions`, `notif-prefs`, `export`.

---

## 12. Rủi ro và câu hỏi mở

| # | Rủi ro / câu hỏi | Ảnh hưởng | Đề xuất |
|---|---|---|---|
| R1 | Domain backend khác domain social của app (Post DTO dùng `actorId`, `content`, `reactionCount`) | Mapping không trivial | Chấp nhận mapper ở entity; không đổi domain model theo DTO |
| R2 | Reaction enum không có `LIKE` | Like hiện tại không map thẳng | Chốt product: `LIKE` → `LOVE`, hay bổ sung enum backend |
| R3 | Không có endpoint repost/save/follow/chat/search/notification | Feature không migrate được | Giữ mock/hoãn; không tự bịa endpoint |
| R4 | `FeedPageResponseDto.items` là `{}` | Orval sinh `unknown[]` | Sửa backend schema (khuyến nghị) hoặc parse runtime |
| R5 | Viewer reaction (`likedByMe`) không thấy trong Post DTO | Like state thiếu | Cần endpoint/field backend hoặc truy vấn riêng |
| R6 | Refresh token native khác web | Auth dễ sai | Làm Phase 1 cẩn thận; test rotation/failure |
| R7 | `EXPO_PUBLIC_API_MOCK=true` đang bật | Generated path 404 | Tắt khi test backend; cập nhật mock nếu cần E2E |
| R8 | Orval 8 sinh import `.ts` | `tsc` lỗi nếu thiếu flag | Bật `allowImportingTsExtensions` |
| R9 | Generated code vi phạm lint | CI đỏ | Ignore `src/shared/api/gen/**` |
| R10 | Snapshot contract lệch backend | Gen dùng contract cũ | Chạy `contract:sync` khi backend đổi; `contract:verify` + `sourceCommit` trong metadata |
| R11 | `request()` chưa parse error envelope backend | UI không có `errorCode/details` | Phase 1 mở rộng `ApiError` để giữ `errorCode/message/details` |
| R12 | `request()` chưa hỗ trợ `URLSearchParams` | Form-urlencoded fail | Chỉ mở khi có endpoint cần; pass-through như FormData |

Câu hỏi cần chốt trước Phase 3:

1. Like = `LOVE` hay backend bổ sung `LIKE`?
2. Có giữ feature repost/save/follow/chat khi backend chưa có endpoint không?
3. Có sửa `FeedPageResponseDto.items` ở backend trong sprint này không?
4. `PostResponseDto` có bổ sung viewer reaction (`likedByMe`) không?
5. Error envelope: có đưa `errorCode/details` vào `ApiError` ngay Phase 1 không?

---

## 13. Verification / Definition of Done

Chạy từ repo root:

```bash
pnpm contract:verify
pnpm codegen
pnpm typecheck
pnpm lint
pnpm lint:boundaries
pnpm test
```

Checklist chung cho mọi phase:

- [ ] Không có file generated nào bị sửa tay.
- [ ] `src/shared/api/gen/**` bị gitignore; `codegen` chạy lại từ vendored spec không đổi.
- [ ] `pnpm typecheck` pass.
- [ ] `pnpm lint` và `pnpm lint:boundaries` pass.
- [ ] Feature/component không import `@/shared/api/gen/**`.
- [ ] `entities/*/model.ts` không chứa DTO.
- [ ] Mọi call generated đi qua `mobileMutator` → `request()`.
- [ ] Envelope chỉ unwrap một lần ở `entities/*/api.ts`.
- [ ] Cache update vẫn qua `entities/*/cache.ts`; canonical key không đổi.
- [ ] Không log token/secret.
- [ ] Test liên quan pass.

Checklist Phase 0:

- [ ] `orval@8.30.0` trong devDependencies.
- [ ] `orval.config.ts` chạy được với vendored spec `openapi/openapi.json`.
- [ ] `CONTRACT_SPEC_PATH` override hoạt động.
- [ ] `contract:sync` + `contract:verify` pass; metadata có source commit + sha256.
- [ ] `src/shared/api/gen/**` bị gitignore và không xuất hiện trong `git status`.
- [ ] `tsconfig` có `allowImportingTsExtensions`.
- [ ] `eslint` ignore generated.
- [ ] `mobileMutator` xử lý header, body, 204, URL strip.
- [ ] `envelope.ts` có helper unwrap.

Checklist Phase 1 (auth):

- [ ] Login/refresh/me/logout dùng generated fn.
- [ ] `refreshToken` native lưu SecureStore.
- [ ] Refresh single-flight; không đệ quy ở `/api/auth/refresh`.
- [ ] 401 của login không trigger refresh.
- [ ] Logout clear local trong `finally`.
- [ ] Session khôi phục sau khi kill app.
- [ ] `EXPO_PUBLIC_API_MOCK=false` chạy với backend thật.

---

## 14. Phụ lục

### A. Lệnh thường dùng

```bash
# Sync snapshot contract từ backend checkout
pnpm contract:sync

# Verify snapshot khớp metadata
pnpm contract:verify

# Regenerate sau khi backend contract đổi
pnpm codegen

# Sinh spec backend (chạy trong repo backend)
nx run api-gateway:generate-openapi

# Chạy app với backend thật
EXPO_PUBLIC_API_MOCK=false EXPO_PUBLIC_API_URL=http://localhost:8080 pnpm start
```

### B. File tham chiếu

| File | Vai trò |
|---|---|
| `AGENTS.md` | Boundary + kernel contracts |
| `src/shared/api/client.ts` | HTTP pipeline hiện tại |
| `src/shared/api/auth-middleware.ts` | Bearer + refresh 401 |
| `src/shared/api/endpoints.ts` | Path viết tay cần migrate |
| `src/shared/query/query-keys.ts` | Canonical query keys |
| `src/entities/post/api.ts` | Ví dụ entity gọi API |
| `src/entities/post/schema.ts` | Ví dụ zod runtime validation |
| `src/entities/post/cache.ts` | Canonical cache + optimistic update |
| `../web-admin-school/orval.config.ts` | Reference config |
| `../backend-university/openapi/openapi.json` | Contract nguồn |
| `openapi/openapi.json` | Snapshot contract backend dùng cho codegen |
| `openapi/contract.json` | Provenance + sha256 của snapshot |
| `scripts/sync-contract.mjs` | Cập nhật snapshot từ backend checkout |
| `scripts/verify-contract.mjs` | Verify snapshot khớp metadata |

### C. Khác biệt cốt lõi so với web-admin

| Chủ đề | Web-admin | Mobile |
|---|---|---|
| HTTP runtime | ky + `genKyInstance` | fetch + `request()` + `mobileMutator` |
| Response type | `{ data, status }` (default Orval 8) | `includeHttpResponseReturnType: false` |
| Auth refresh | HttpOnly cookie | `refreshToken` body → SecureStore |
| Mock | MSW | in-app fetch mock |
| Generated dir | `src/gen` | `src/shared/api/gen` |
| State layer | Refine data provider | TanStack Query + entity cache |
| Query hooks | Không dùng generated hooks | Cũng không dùng generated hooks |

### D. Lịch sử quyết định

| Ngày | Thay đổi | Người chốt |
|---|---|---|
| 2026-11-02 | Tạo spec v1.0; chốt D1–D18 | — |
| 2026-11-02 | v1.1: gitignore generated output; vendored contract + `contract:sync`/`contract:verify`; `postinstall` regenerate | — |

> Khi một quyết định trong file này thay đổi, cập nhật bảng §0, bảng rủi ro §12,
> và ghi một dòng vào §14.D. Không sửa lịch sử cũ.
