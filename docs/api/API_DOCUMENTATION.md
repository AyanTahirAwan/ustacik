# UstaÇık — API Documentation

## 1. General Information

### 1.1 Project Name
**UstaÇık** (`ustacik`) — A service marketplace platform connecting customers with verified craftsmen (Usta = "master craftsman" in Turkish, Çık = wordplay on "çıkış"/"discovery").

### 1.2 Base URL

| Environment | Base URL |
|---|---|
| Local development | `http://localhost:3333` |
| Production | Configured via `APP_URL` environment variable |

The port is configurable via the `PORT` environment variable (AdonisJS default is `3333`).

All API endpoints are prefixed with `/api`. Web page routes (`/signup`, `/login`, `/logout`, `/`) render server-side Edge templates and redirect, rather than returning JSON.

### 1.3 Authentication Method

The application uses **session-based (cookie) authentication** via the AdonisJS `web` session guard.

- Session cookie name: `adonis-session`
- Cookie attributes: `HttpOnly`, `SameSite=Lax`, `Secure` in production, max age `2h`
- The session cookie is sent automatically by the browser on every request once the user is logged in
- **CSRF protection is enabled** (Shield) for all `POST`, `PUT`, `PATCH`, and `DELETE` requests. State-changing requests must include a valid CSRF token (via `_csrf` form field or `X-CSRF-TOKEN` header). The `XSRF-TOKEN` cookie is **not** enabled.
- A `silentAuth` middleware runs globally: it checks whether the user is logged in but never blocks a request.

> **Frontend note:** Because authentication is cookie/session based, a frontend client must use credentials/cookies (same origin or with `credentials: 'include'`) and must send the CSRF token for all state-changing requests.

### 1.4 User Roles

| Role | Description | Allowed Access |
|---|---|---|
| `admin` | Platform administrator | Full catalog CRUD + craftsman price management (via role middleware `roles: ['admin']` on admin routes, and `roles: ['craftsman', 'admin']` on craftsman routes) |
| `craftsman` | Service provider | Own price catalog management (ownership enforced per record) |
| `customer` | End consumer | Public catalog browsing + search only. Cannot access admin or craftsman endpoints (403) |

Roles are assigned at signup (`customer` or `craftsman`) or seeded for `admin`. Stored on `users.role`.

### 1.5 Standard HTTP Status Codes

| Status | Meaning | Used When |
|---|---|---|
| `200 OK` | Request succeeded | List/show/update/toggle operations |
| `201 Created` | Resource created | POST store operations |
| `204 No Content` | Resource deleted | DELETE operations |
| `302 Found` | Redirect | Web routes (login/signup/logout); also returned by the `auth` middleware when an unauthenticated browser request hits a protected route (redirect to `/login`) |
| `400 Bad Request` | Malformed request | Generic client errors (rare; not explicitly emitted by current controllers) |
| `401 Unauthorized` | Not authenticated | Auth middleware rejection for API/JSON clients (browser requests get a `302` redirect instead) |
| `403 Forbidden` | Authenticated but not permitted | Role middleware (`Insufficient permissions`) and ownership checks (`Access denied.`) |
| `404 Not Found` | Resource/route not found | `findOrFail` / `firstOrFail` misses, unknown URLs |
| `409 Conflict` | Constraint conflict | Duplicate unique values, deletion blocked by foreign-key references |
| `422 Unprocessable Entity` | Validation failed | Vine validator rejects the payload/query |
| `500 Internal Server Error` | Unexpected server error | Unhandled exceptions |

### 1.6 JSON Response Conventions

The API **does not** use a single uniform envelope. Each controller returns a resource-keyed JSON body:

| Scenario | Response Shape |
|---|---|
| Public catalog list | `{ "data": [ ... ] }` |
| Public price listing | `{ "servicePriceCatalogs": [ ... ] }` |
| Search results | `{ "data": [ ... ] }` |
| Admin list (categories/regions/sub-services) | `{ "categories": [...] }` / `{ "regions": [...] }` / `{ "subServices": [...] }` |
| Single resource | `{ "category": { ... } }`, `{ "region": { ... } }`, `{ "subService": { ... } }`, `{ "servicePriceCatalog": { ... } }` |
| Validation errors | `{ "errors": [ { "message": "...", "rule": "...", "field": "..." } ] }` |
| Forbidden/Conflict | `{ "message": "..." }` |

Dates (`createdAt`, `updatedAt`) are serialized as ISO-8601 strings. Numeric prices are returned as numbers.

---

## 2. Table of Contents

1. [General Information](#1-general-information)
2. [Table of Contents](#2-table-of-contents)
3. [Authentication (Web Routes)](#3-authentication-web-routes)
4. [Public API](#4-public-api)
5. [Admin API](#5-admin-api)
6. [Craftsman API](#6-craftsman-api)
7. [Appendix](#7-appendix)

---

## 3. Authentication (Web Routes)

These are **server-rendered web routes** (Edge templates) used for browser-based authentication. They return HTML pages or redirects, not JSON. They exist so the SPA/frontend can delegate session establishment to the same-origin server or use them for initial server-rendered flows.

### 3.1 `GET /signup`

| Property | Value |
|---|---|
| Endpoint | `/signup` |
| HTTP Method | `GET` |
| Description | Render the signup page |
| Authentication Required | No (must be a guest; `guest` middleware redirects logged-in users to `/`) |
| Authorization Required | Public |

**Request:** No body/params.

**Success Response:** `200 OK` — HTML page (`pages/auth/signup`).

**Error Responses:** `302` redirect to `/` if already authenticated.

**Validation Rules:** N/A (GET).

**Notes:** A page render only; all signup validation happens on `POST /signup`.

### 3.2 `POST /signup`

| Property | Value |
|---|---|
| Endpoint | `/signup` |
| HTTP Method | `POST` |
| Description | Create a new user (with customer or craftsman profile) and log them in |
| Authentication Required | No (guest route) |
| Authorization Required | Public |

**Request Body** (form-encoded or JSON):

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | Yes | Valid email, max 254 chars, must be unique (`users.email`) |
| `phone` | string | Yes | Trimmed, min 8, max 32 chars, must be unique (`users.phone_normalised`) |
| `password` | string | Yes | Min 8, max 64 chars |
| `passwordConfirmation` | string | Yes | Must equal `password` |
| `role` | string | Yes | Enum: `customer` \| `craftsman` |
| `fullName` | string | No | Min 2, max 160 chars. **Required when `role=customer`** (falls back to `email`) |
| `businessName` | string | No | Min 2, max 160 chars. **Required when `role=craftsman`** |
| `categoryId` | number | No | **Required when `role=craftsman`** |

**Behavior:**
- If `role=customer`: creates `User` + `Customer` profile (`fullName`, `language='en'`, `smsOptIn=true`) in a transaction.
- If `role=craftsman`: creates `User` + `Craftsman` profile (`businessName`, `categoryId`, `trustLevel=0`, `verbalConsent=false`, `totalJobs=0`) in a transaction. Missing `businessName`/`categoryId` throws an error.
- On success the new user is logged in (session created) and redirected to the home page.

**Success Response:** `302` redirect to `/` (home). No JSON body.

**Error Responses:**

| Status | Meaning |
|---|---|
| `422` | Validation failure (invalid email/password/role, missing confirmation, duplicate email or phone) |
| `500` | Transaction failure (e.g., missing `businessName`/`categoryId` for craftsman) |

**Validation Rules:** See `app/validators/user.ts` (`signupValidator`).

**Notes:** Passwords are hashed with the configured hasher (scrypt). `phone` is stored as `phoneNormalised`.

### 3.3 `GET /login`

| Property | Value |
|---|---|
| Endpoint | `/login` |
| HTTP Method | `GET` |
| Description | Render the login page |
| Authentication Required | No (must be a guest) |
| Authorization Required | Public |

**Request:** No body/params.

**Success Response:** `200 OK` — HTML page (`pages/auth/login`).

**Error Responses:** `302` redirect to `/` if already authenticated.

**Validation Rules:** N/A (GET).

### 3.4 `POST /login`

| Property | Value |
|---|---|
| Endpoint | `/login` |
| HTTP Method | `POST` |
| Description | Authenticate credentials and create a session |
| Authentication Required | No (guest route) |
| Authorization Required | Public |

**Request Body** (form-encoded or JSON):

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | Yes | Must match a user email |
| `password` | string | Yes | Must match the user's password |

**Success Response:** `302` redirect to `/` (home). Session cookie (`adonis-session`) is set.

**Error Responses:**

| Status | Meaning |
|---|---|
| `400` | Invalid credentials (`User.verifyCredentials` failure) — typically a redirect back to login with a flash error |

**Validation Rules:** Uses `User.verifyCredentials(email, password)`; no Vine schema.

**Notes:** On success the `web` session guard logs the user in. This is the endpoint the frontend should call to establish a session.

### 3.5 `POST /logout`

| Property | Value |
|---|---|
| Endpoint | `/logout` |
| HTTP Method | `POST` |
| Description | Destroy the current session and log the user out |
| Authentication Required | Yes (`auth` middleware) |
| Authorization Required | Any authenticated role (admin/craftsman/customer) |

**Request:** No body.

**Success Response:** `302` redirect to `/login` (`session.create` route). Session destroyed.

**Error Responses:**

| Status | Meaning |
|---|---|
| `302` (to `/login`) | Unauthenticated requests are redirected to login by the auth middleware |

**Validation Rules:** N/A.

---

## 4. Public API

Public catalog endpoints require **no authentication**. They are used for browsing categories, regions, sub-services, prices, and searching.

### 4.1 `GET /api/catalog/categories`

| Property | Value |
|---|---|
| Endpoint | `/api/catalog/categories` |
| HTTP Method | `GET` |
| Description | List all service categories |
| Authentication Required | No |
| Authorization Required | Public |

**Request:** No body/params.

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "nameEn": "Plumbing",
      "nameTr": "Tesisat",
      "createdAt": "2025-01-01T10:00:00.000Z"
    },
    {
      "id": 2,
      "nameEn": "Electrical",
      "nameTr": "Elektrik",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `500` | Unexpected server error |

**Validation Rules:** None.

**Notes:** Returns `Category` models (fields: `id`, `nameEn`, `nameTr`, `createdAt`). No pagination. A `name(locale)` helper is available on the model for `'en'`/`'tr'` selection in the frontend.

### 4.2 `GET /api/catalog/categories/:categoryId/sub-services`

| Property | Value |
|---|---|
| Endpoint | `/api/catalog/categories/:categoryId/sub-services` |
| HTTP Method | `GET` |
| Description | List the sub-services belonging to a category |
| Authentication Required | No |
| Authorization Required | Public |

**Path Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `categoryId` | number | Yes | The category ID |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "categoryId": 1,
      "nameEn": "Leak Repair",
      "nameTr": "Kaçak Tamiri",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `500` | Unexpected server error |

**Validation Rules:** None at the route level (no Vine schema). `categoryId` is used directly in the query.

**Notes:** Returns `SubService` rows for the given category (`SubService.query().where('category_id', categoryId)`). Returns an empty array (`data: []`) if the category has no sub-services or does not exist.

### 4.3 `GET /api/catalog/regions`

| Property | Value |
|---|---|
| Endpoint | `/api/catalog/regions` |
| HTTP Method | `GET` |
| Description | List all service regions |
| Authentication Required | No |
| Authorization Required | Public |

**Request:** No body/params.

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "nameEn": "Lefkosa",
      "nameTr": "Lefkoşa",
      "createdAt": "2025-01-01T10:00:00.000Z"
    },
    {
      "id": 2,
      "nameEn": "Kyrenia",
      "nameTr": "Girne",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `500` | Unexpected server error |

**Validation Rules:** None.

**Notes:** Returns `Region` models (`id`, `nameEn`, `nameTr`, `createdAt`).

### 4.4 `GET /api/catalog/prices`

| Property | Value |
|---|---|
| Endpoint | `/api/catalog/prices` |
| HTTP Method | `GET` |
| Description | List **active** service price catalog entries with optional filters |
| Authentication Required | No |
| Authorization Required | Public |

**Query Parameters** (all optional):

| Param | Type | Description |
|---|---|---|
| `categoryId` | number | Filter by category (matches via the sub-service's category) |
| `subServiceId` | number | Filter by sub-service |
| `regionId` | number | Filter by region |
| `minPrice` | number | Return entries whose `maxPrice >= minPrice` |
| `maxPrice` | number | Return entries whose `minPrice <= maxPrice` |

**Success Response:** `200 OK`

```json
{
  "servicePriceCatalogs": [
    {
      "id": 1,
      "craftsmanId": 2,
      "subServiceId": 1,
      "regionId": 1,
      "minPrice": 100,
      "maxPrice": 200,
      "currency": "TRY",
      "isActive": true,
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T10:00:00.000Z",
      "craftsman": {
        "userId": 2,
        "businessName": "Test Craftsman Co.",
        "categoryId": 1,
        "trustLevel": 0,
        "totalJobs": 0,
        "createdAt": "2025-01-01T10:00:00.000Z"
      },
      "subService": {
        "id": 1,
        "categoryId": 1,
        "nameEn": "Leak Repair",
        "nameTr": "Kaçak Tamiri",
        "createdAt": "2025-01-01T10:00:00.000Z"
      },
      "region": {
        "id": 1,
        "nameEn": "Lefkosa",
        "nameTr": "Lefkoşa",
        "createdAt": "2025-01-01T10:00:00.000Z"
      }
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `500` | Unexpected server error |

**Validation Rules:** Filters are read directly via `request.input` (no Vine schema). Passing malformed numbers may yield no matches or `500` (not explicitly validated here).

**Notes:**
- **Only `is_active = true` entries are returned.**
- Results are ordered by `minPrice` ascending, then `id` ascending.
- `craftsman`, `subService`, and `region` are preloaded in the response.

### 4.5 `GET /api/search/services`

| Property | Value |
|---|---|
| Endpoint | `/api/search/services` |
| HTTP Method | `GET` |
| Description | Search craftsmen service prices with validated optional filters |
| Authentication Required | No |
| Authorization Required | Public |

**Query Parameters** (all optional, validated by `catalogSearchValidator`):

| Param | Type | Rules |
|---|---|---|
| `categoryId` | number | Positive integer (no decimals) |
| `subServiceId` | number | Positive integer (no decimals) |
| `regionId` | number | Positive integer (no decimals) |
| `minPrice` | number | Non-negative, no decimals |
| `maxPrice` | number | Non-negative, no decimals, must be `>= minPrice` when both supplied |

**Success Response:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "craftsmanId": 2,
      "subServiceId": 1,
      "regionId": 1,
      "minPrice": 150,
      "maxPrice": 250,
      "currency": "TRY",
      "isActive": true,
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T10:00:00.000Z",
      "craftsman": {
        "userId": 2,
        "businessName": "Test Craftsman Co.",
        "trustLevel": 0
      },
      "region": {
        "id": 1,
        "nameEn": "Lefkosa",
        "nameTr": "Lefkoşa",
        "createdAt": "2025-01-01T10:00:00.000Z"
      },
      "subService": {
        "id": 1,
        "categoryId": 1,
        "nameEn": "Leak Repair",
        "nameTr": "Kaçak Tamiri",
        "createdAt": "2025-01-01T10:00:00.000Z",
        "category": {
          "id": 1,
          "nameEn": "Plumbing",
          "nameTr": "Tesisat",
          "createdAt": "2025-01-01T10:00:00.000Z"
        }
      }
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `422` | Query validation failed (negative values, `maxPrice < minPrice`, non-integer IDs) |
| `500` | Unexpected server error |

**Validation Rules:** See `app/validators/catalog_search.ts`.

**Notes:**
- Results ordered by `min_price` ascending, then `id` ascending.
- Preloads: `craftsman` (**only** `userId`, `businessName`, `trustLevel`), `region`, and `subService` **with** its `category`.
- **Only `is_active = true` entries are returned**, matching `GET /api/catalog/prices`.

---

## 5. Admin API

All admin endpoints require **authentication** (`auth` middleware) **and** the **`admin` role** (`role` middleware with `roles: ['admin']`). Requests from non-admin roles receive `403`.

### 5.0 Admin Common Behavior

| Property | Value |
|---|---|
| Authentication Required | Yes (session) |
| Authorization Required | `admin` only |
| Role rejection | `403 Forbidden` — `{ "message": "Insufficient permissions" }` |
| Unauthenticated | `302` redirect to `/login` (browser) / `401` (API client) |

### 5.1 Categories CRUD

#### 5.1.1 `GET /api/admin/categories`

| Property | Value |
|---|---|
| HTTP Method | `GET` |
| Description | List all categories ordered by English name, with sub-service counts |

**Success Response:** `200 OK`

```json
{
  "categories": [
    {
      "id": 1,
      "nameEn": "Plumbing",
      "nameTr": "Tesisat",
      "createdAt": "2025-01-01T10:00:00.000Z",
      "subServicesCount": 3
    }
  ]
}
```

**Error Responses:** `401`, `403`, `500`.

**Notes:** `subServicesCount` comes from `withCount('subServices')`. Ordered by `nameEn` ascending.

#### 5.1.2 `POST /api/admin/categories`

| Property | Value |
|---|---|
| HTTP Method | `POST` |
| Description | Create a new category |

**Request Body:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `nameEn` | string | Yes | Trimmed, min 2, max 120 chars, unique (`categories.name_en`) |
| `nameTr` | string | Yes | Trimmed, min 2, max 120 chars, unique (`categories.name_tr`) |

**Success Response:** `201 Created`

```json
{
  "category": {
    "id": 3,
    "nameEn": "Gardening",
    "nameTr": "Bahçecilik",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not an admin |
| `422` | Validation failure (missing/short name, duplicate `nameEn` or `nameTr`) |
| `500` | Unexpected server error |

**Validation Rules:** `createCategoryValidator` (`app/validators/category.ts`).

**Example Request Body:**

```json
{
  "nameEn": "Gardening",
  "nameTr": "Bahçecilik"
}
```

#### 5.1.3 `GET /api/admin/categories/:id`

| Property | Value |
|---|---|
| HTTP Method | `GET` |
| Description | Return a single category with its sub-services preloaded |

**Path Parameters:** `id` (number, required).

**Success Response:** `200 OK`

```json
{
  "category": {
    "id": 1,
    "nameEn": "Plumbing",
    "nameTr": "Tesisat",
    "createdAt": "2025-01-01T10:00:00.000Z",
    "subServices": [
      {
        "id": 1,
        "categoryId": 1,
        "nameEn": "Leak Repair",
        "nameTr": "Kaçak Tamiri",
        "createdAt": "2025-01-01T10:00:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not an admin |
| `404` | Category not found (`findOrFail`) |
| `500` | Unexpected server error |

#### 5.1.4 `PATCH /api/admin/categories/:id`

| Property | Value |
|---|---|
| HTTP Method | `PATCH` |
| Description | Update a category's localized names |

**Path Parameters:** `id` (number, required).

**Request Body** (all optional, at least one recommended):

| Field | Type | Rules |
|---|---|---|
| `nameEn` | string | Trimmed, min 2, max 120 chars, unique |
| `nameTr` | string | Trimmed, min 2, max 120 chars, unique |

**Success Response:** `200 OK`

```json
{
  "category": {
    "id": 1,
    "nameEn": "UpdatedName",
    "nameTr": "Tesisat",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not an admin |
| `404` | Category not found |
| `422` | Validation failure (duplicate name, too short) |
| `500` | Unexpected server error |

**Validation Rules:** `updateCategoryValidator`.

#### 5.1.5 `DELETE /api/admin/categories/:id`

| Property | Value |
|---|---|
| HTTP Method | `DELETE` |
| Description | Delete a category. Fails with `409` if sub-services still reference it |

**Path Parameters:** `id` (number, required).

**Success Response:** `204 No Content` (no body).

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not an admin |
| `404` | Category not found |
| `409` | `{ "message": "Cannot delete this category because it still has sub-services." }` — the DB `sub_services.category_id` FK uses `RESTRICT` |
| `500` | Unexpected server error |

**Notes:** Sub-services reference categories with `ON DELETE RESTRICT`, so deletion is blocked when dependencies exist.

### 5.2 Sub-Services CRUD

#### 5.2.1 `GET /api/admin/sub-services`

| Property | Value |
|---|---|
| HTTP Method | `GET` |
| Description | List sub-services ordered by English name, with optional `categoryId` filter |

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `categoryId` | number | Optional filter |

**Success Response:** `200 OK`

```json
{
  "subServices": [
    {
      "id": 1,
      "categoryId": 1,
      "nameEn": "Leak Repair",
      "nameTr": "Kaçak Tamiri",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:** `401`, `403`, `500`.

**Notes:** Ordered by `nameEn` ascending.

#### 5.2.2 `POST /api/admin/sub-services`

| Property | Value |
|---|---|
| HTTP Method | `POST` |
| Description | Create a new sub-service |

**Request Body:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `categoryId` | number | Yes | Min 1, must exist in `categories.id` |
| `nameEn` | string | Yes | Trimmed, min 2, max 120 chars |
| `nameTr` | string | Yes | Trimmed, min 2, max 120 chars |

**Success Response:** `201 Created`

```json
{
  "subService": {
    "id": 2,
    "categoryId": 1,
    "nameEn": "Drain Cleaning",
    "nameTr": "Gider Temizliği",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not an admin |
| `409` | `{ "message": "A sub-service with this English name already exists in the selected category." }` — DB composite unique constraint on `(category_id, name_en)` |
| `422` | Validation failure (invalid `categoryId`, missing/short names) |
| `500` | Unexpected server error |

**Validation Rules:** `createSubServiceValidator`.

**Notes:** Duplicate `(categoryId, nameEn)` pairs are caught at the DB level and surfaced as `409`.

#### 5.2.3 `GET /api/admin/sub-services/:id`

| Property | Value |
|---|---|
| HTTP Method | `GET` |
| Description | Return a single sub-service with its category preloaded |

**Path Parameters:** `id` (number, required).

**Success Response:** `200 OK`

```json
{
  "subService": {
    "id": 1,
    "categoryId": 1,
    "nameEn": "Leak Repair",
    "nameTr": "Kaçak Tamiri",
    "createdAt": "2025-01-01T10:00:00.000Z",
    "category": {
      "id": 1,
      "nameEn": "Plumbing",
      "nameTr": "Tesisat",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  }
}
```

**Error Responses:** `401`, `403`, `404`, `500`.

#### 5.2.4 `PATCH /api/admin/sub-services/:id`

| Property | Value |
|---|---|
| HTTP Method | `PATCH` |
| Description | Update a sub-service's localized names and/or category |

**Path Parameters:** `id` (number, required).

**Request Body** (all optional):

| Field | Type | Rules |
|---|---|---|
| `categoryId` | number | Min 1, must exist in `categories.id` |
| `nameEn` | string | Trimmed, min 2, max 120 chars |
| `nameTr` | string | Trimmed, min 2, max 120 chars |

**Success Response:** `200 OK`

```json
{
  "subService": {
    "id": 1,
    "categoryId": 1,
    "nameEn": "Leak Repair (Updated)",
    "nameTr": "Kaçak Tamiri",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Error Responses:** `401`, `403`, `404`, `409` (if the new `(categoryId, nameEn)` pair duplicates an existing one), `422`, `500`.

**Validation Rules:** `updateSubServiceValidator`.

#### 5.2.5 `DELETE /api/admin/sub-services/:id`

| Property | Value |
|---|---|
| HTTP Method | `DELETE` |
| Description | Delete a sub-service |

**Path Parameters:** `id` (number, required).

**Success Response:** `204 No Content`.

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not an admin |
| `404` | Sub-service not found |
| `409` | `{ "message": "Cannot delete this sub-service because it is referenced by price catalog entries." }` (only if the DB/driver enforces RESTRICT semantics) |
| `500` | Unexpected server error |

**Notes:** The migration defines `service_price_catalogs.sub_service_id` with `ON DELETE CASCADE`, so linked prices are normally removed automatically. The `409` is handled defensively for FK-restricted configurations.

### 5.3 Regions CRUD

#### 5.3.1 `GET /api/admin/regions`

| Property | Value |
|---|---|
| HTTP Method | `GET` |
| Description | List all regions ordered by English name |

**Success Response:** `200 OK`

```json
{
  "regions": [
    {
      "id": 1,
      "nameEn": "Lefkosa",
      "nameTr": "Lefkoşa",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:** `401`, `403`, `500`.

**Notes:** Ordered by `nameEn` ascending.

#### 5.3.2 `POST /api/admin/regions`

| Property | Value |
|---|---|
| HTTP Method | `POST` |
| Description | Create a new region |

**Request Body:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `nameEn` | string | Yes | Trimmed, min 2, max 120 chars, unique (`regions.name_en`) |
| `nameTr` | string | Yes | Trimmed, min 2, max 120 chars, unique (`regions.name_tr`) |

**Success Response:** `201 Created`

```json
{
  "region": {
    "id": 3,
    "nameEn": "Famagusta",
    "nameTr": "Gazimağusa",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Error Responses:** `401`, `403`, `422` (missing/short/duplicate name), `500`.

**Validation Rules:** `createRegionValidator`.

#### 5.3.3 `GET /api/admin/regions/:id`

| Property | Value |
|---|---|
| HTTP Method | `GET` |
| Description | Return a single region |

**Path Parameters:** `id` (number, required).

**Success Response:** `200 OK`

```json
{
  "region": {
    "id": 1,
    "nameEn": "Lefkosa",
    "nameTr": "Lefkoşa",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Error Responses:** `401`, `403`, `404`, `500`.

#### 5.3.4 `PATCH /api/admin/regions/:id`

| Property | Value |
|---|---|
| HTTP Method | `PATCH` |
| Description | Update a region's localized names |

**Path Parameters:** `id` (number, required).

**Request Body** (all optional):

| Field | Type | Rules |
|---|---|---|
| `nameEn` | string | Trimmed, min 2, max 120 chars, unique |
| `nameTr` | string | Trimmed, min 2, max 120 chars, unique |

**Success Response:** `200 OK`

```json
{
  "region": {
    "id": 1,
    "nameEn": "North Nicosia",
    "nameTr": "Kuzey Lefkoşa",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Error Responses:** `401`, `403`, `404`, `422`, `500`.

**Validation Rules:** `updateRegionValidator`.

#### 5.3.5 `DELETE /api/admin/regions/:id`

| Property | Value |
|---|---|
| HTTP Method | `DELETE` |
| Description | Delete a region. Fails with `409` if price catalog entries reference it |

**Path Parameters:** `id` (number, required).

**Success Response:** `204 No Content`.

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not an admin |
| `404` | Region not found |
| `409` | `{ "message": "Cannot delete this region because it is referenced by price catalog entries." }` — DB FK uses `RESTRICT` |
| `500` | Unexpected server error |

---

## 6. Craftsman API

These routes manage the craftsman's service price catalog. They require **authentication** and a role of **`craftsman` or `admin`** (`role` middleware with `roles: ['craftsman', 'admin']`). `craftsmanId` is **never** accepted in the payload — it is always derived from the authenticated user's ID (`users.id` = `craftsmen.user_id`).

Ownership is enforced on every show/update/delete/toggle: a craftsman may only access records where `craftsmanId === auth.user.id`. Admins may access any record.

### 6.0 Craftsman Common Behavior

| Property | Value |
|---|---|
| Authentication Required | Yes (session) |
| Authorization Required | `craftsman` or `admin` |
| Role rejection | `403` — `{ "message": "Insufficient permissions" }` (e.g., a customer calling these routes) |
| Ownership rejection | `403` — `{ "message": "Access denied." }` |
| Unauthenticated | `302` redirect to `/login` (browser) / `401` (API client) |

### 6.1 `POST /api/craftsman/service-prices`

| Property | Value |
|---|---|
| HTTP Method | `POST` |
| Description | Create a new price entry owned by the authenticated craftsman |
| Authentication Required | Yes |
| Authorization Required | `craftsman` or `admin` |

**Request Body:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `subServiceId` | number | Yes | Min 1, must exist in `sub_services.id` |
| `regionId` | number | Yes | Min 1, must exist in `regions.id` |
| `minPrice` | number | Yes | `>= 0` |
| `maxPrice` | number | Yes | `>= 0` and `>= minPrice` |
| `currency` | string | Yes | Enum: `TRY` \| `GBP` \| `EUR` \| `USD` |
| `isActive` | boolean | No | Defaults to `true` |
| `craftsmanId` | — | — | **Not accepted.** Always derived from the authenticated user |

**Success Response:** `201 Created`

```json
{
  "servicePriceCatalog": {
    "id": 1,
    "craftsmanId": 2,
    "subServiceId": 1,
    "regionId": 1,
    "minPrice": 100,
    "maxPrice": 200,
    "currency": "TRY",
    "isActive": true,
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z",
    "craftsman": { "...craftsman object..." },
    "subService": { "...subService object..." },
    "region": { "...region object..." }
  }
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not a craftsman/admin, or no craftsman profile (`"A craftsman profile is required."`) |
| `409` | `{ "message": "You already have a price entry for this sub-service in this region." }` — DB unique constraint on `(craftsman_id, sub_service_id, region_id)` |
| `422` | Validation failure (unknown field `craftsmanId`, invalid `subServiceId`/`regionId`, negative prices, `maxPrice < minPrice`, invalid `currency`) |
| `500` | Unexpected server error |

**Validation Rules:** `createServicePriceCatalogValidator`.

**Example Request Body:**

```json
{
  "subServiceId": 1,
  "regionId": 1,
  "minPrice": 100,
  "maxPrice": 200,
  "currency": "TRY"
}
```

**Notes:**
- The authenticated user must have a `craftsman` profile row; otherwise `403`.
- The DB rule: `service_price_catalogs.craftsman_id` references `craftsmen.user_id`, so the authenticated user's ID is the craftsman ID.
- Admin users can also create entries, but still need a craftsman profile.

### 6.2 `GET /api/craftsman/service-prices/:id`

| Property | Value |
|---|---|
| HTTP Method | `GET` |
| Description | Return a single price record (owner or admin only) |
| Authentication Required | Yes |
| Authorization Required | `craftsman` (owner) or `admin` |

**Path Parameters:** `id` (number, required).

**Success Response:** `200 OK`

```json
{
  "servicePriceCatalog": {
    "id": 1,
    "craftsmanId": 2,
    "subServiceId": 1,
    "regionId": 1,
    "minPrice": 100,
    "maxPrice": 200,
    "currency": "TRY",
    "isActive": true,
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z",
    "craftsman": { "...craftsman object..." },
    "subService": { "...subService object..." },
    "region": { "...region object..." }
  }
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not the owner craftsman (or admin) — `"Access denied."` |
| `404` | Price record not found |
| `500` | Unexpected server error |

### 6.3 `PATCH /api/craftsman/service-prices/:id`

| Property | Value |
|---|---|
| HTTP Method | `PATCH` |
| Description | Update a price record (owner or admin only) |
| Authentication Required | Yes |
| Authorization Required | `craftsman` (owner) or `admin` |

**Path Parameters:** `id` (number, required).

**Request Body** (all optional):

| Field | Type | Rules |
|---|---|---|
| `subServiceId` | number | Min 1, must exist in `sub_services.id` |
| `regionId` | number | Min 1, must exist in `regions.id` |
| `minPrice` | number | `>= 0` |
| `maxPrice` | number | `>= 0` and `>= minPrice` |
| `currency` | string | Enum: `TRY` \| `GBP` \| `EUR` \| `USD` |
| `isActive` | boolean | — |

**Success Response:** `200 OK`

```json
{
  "servicePriceCatalog": {
    "id": 1,
    "craftsmanId": 2,
    "subServiceId": 1,
    "regionId": 1,
    "minPrice": 150,
    "maxPrice": 300,
    "currency": "TRY",
    "isActive": true,
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not the owner craftsman (or admin) — `"Access denied."` |
| `404` | Price record not found |
| `409` | If the update creates a duplicate `(craftsman_id, sub_service_id, region_id)` combination |
| `422` | Validation failure |
| `500` | Unexpected server error |

**Validation Rules:** `updateServicePriceCatalogValidator`.

**Notes:** Ownership cannot be changed — `craftsmanId` is never part of the update payload.

### 6.4 `DELETE /api/craftsman/service-prices/:id`

| Property | Value |
|---|---|
| HTTP Method | `DELETE` |
| Description | Delete a price record (owner or admin only) |
| Authentication Required | Yes |
| Authorization Required | `craftsman` (owner) or `admin` |

**Path Parameters:** `id` (number, required).

**Success Response:** `204 No Content`.

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not the owner craftsman (or admin) — `"Access denied."` |
| `404` | Price record not found |
| `500` | Unexpected server error |

### 6.5 `PATCH /api/craftsman/service-prices/:id/toggle-active`

| Property | Value |
|---|---|
| HTTP Method | `PATCH` |
| Description | Toggle a price record between active and inactive (owner or admin only) |
| Authentication Required | Yes |
| Authorization Required | `craftsman` (owner) or `admin` |

**Path Parameters:** `id` (number, required).

**Success Response:** `200 OK`

```json
{
  "servicePriceCatalog": {
    "id": 1,
    "craftsmanId": 2,
    "subServiceId": 1,
    "regionId": 1,
    "minPrice": 100,
    "maxPrice": 200,
    "currency": "TRY",
    "isActive": false,
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Not the owner craftsman (or admin) — `"Access denied."` |
| `404` | Price record not found |
| `500` | Unexpected server error |

**Notes:** Flips `isActive` to its opposite value. Repeated calls toggle back and forth.

---

## 7. Appendix

### 7.1 Authentication Flow

1. **Signup** — `POST /signup` with `email`, `phone`, `password`, `passwordConfirmation`, `role` (and `fullName` for customer / `businessName` + `categoryId` for craftsman). Creates the user + profile in a DB transaction, logs the user in, redirects to `/`.
2. **Login** — `POST /login` with `email` + `password`. `User.verifyCredentials` validates credentials, the `web` session guard stores the session, redirects to `/`.
3. **Session cookie** — The browser stores the `adonis-session` cookie (HttpOnly, SameSite=Lax, 2h TTL). All subsequent requests to protected routes automatically include it.
4. **Authorized requests** — Protected API routes run `auth` middleware (session check) followed by `role` middleware (role check). Craftsman-owned records additionally verify ownership.
5. **Logout** — `POST /logout` (auth required) destroys the session and redirects to `/login`.

### 7.2 Authorization Matrix

| Endpoint(s) | Public | Customer | Craftsman | Admin |
|---|---|---|---|---|
| `GET /` | ✅ | ✅ | ✅ | ✅ |
| `GET/POST /signup` | ✅ (guest) | — | — | — |
| `GET/POST /login` | ✅ (guest) | — | — | — |
| `POST /logout` | ❌ (auth) | ✅ | ✅ | ✅ |
| `GET /api/catalog/categories` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/catalog/categories/:categoryId/sub-services` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/catalog/regions` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/catalog/prices` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/search/services` | ✅ | ✅ | ✅ | ✅ |
| `GET/POST /api/admin/categories` | ❌ | ❌ (403) | ❌ (403) | ✅ |
| `GET/PATCH/DELETE /api/admin/categories/:id` | ❌ | ❌ (403) | ❌ (403) | ✅ |
| `GET/POST /api/admin/sub-services` | ❌ | ❌ (403) | ❌ (403) | ✅ |
| `GET/PATCH/DELETE /api/admin/sub-services/:id` | ❌ | ❌ (403) | ❌ (403) | ✅ |
| `GET/POST /api/admin/regions` | ❌ | ❌ (403) | ❌ (403) | ✅ |
| `GET/PATCH/DELETE /api/admin/regions/:id` | ❌ | ❌ (403) | ❌ (403) | ✅ |
| `POST /api/craftsman/service-prices` | ❌ | ❌ (403) | ✅ (own) | ✅ (needs profile) |
| `GET/PATCH/DELETE /api/craftsman/service-prices/:id` | ❌ | ❌ (403) | ✅ (owner only) | ✅ (any) |
| `PATCH /api/craftsman/service-prices/:id/toggle-active` | ❌ | ❌ (403) | ✅ (owner only) | ✅ (any) |

### 7.3 Entity Relationship Summary

```
User (users)
├── role: customer | craftsman | admin
├── status: active | suspended
├── 1:1 Customer (customers.user_id)
│     ├── fullName, defaultRegionId, language, smsOptIn
│     ├── 1:N CustomerAddress
│     ├── 1:N CustomerFavorite
│     ├── 1:N JobRequest
│     └── 1:N Review
├── 1:1 Craftsman (craftsmen.user_id)
│     ├── businessName, categoryId, trustLevel, totalJobs, ...
│     ├── N:1 Category (craftsmen.categoryId)
│     ├── 1:N ServicePriceCatalog (craftsmen.user_id)
│     ├── 1:N VerificationLog
│     ├── 1:1 Subscription
│     ├── 1:N WorkPhoto
│     ├── 1:N JobRequest
│     └── 1:N Review
└── 1:1 Admin (admins.user_id)
      └── 1:N VerificationLog (checked_by)

Category (categories)
├── nameEn (unique), nameTr (unique)
├── 1:N SubService (RESTRICT on delete)
└── 1:N Craftsman (craftsmen.categoryId)

SubService (sub_services)
├── N:1 Category (RESTRICT)
├── unique (category_id, name_en)
└── 1:N ServicePriceCatalog (CASCADE on delete)

Region (regions)
├── nameEn (unique), nameTr (unique)
└── 1:N ServicePriceCatalog (RESTRICT on delete)

ServicePriceCatalog (service_price_catalogs)
├── craftsman_id → craftsmen.user_id (CASCADE)
├── sub_service_id → sub_services.id (CASCADE)
├── region_id → regions.id (RESTRICT)
├── unique (craftsman_id, sub_service_id, region_id)
├── CHECK min_price >= 0
├── CHECK max_price >= min_price
└── currency: TRY | GBP | EUR | USD
```

### 7.4 Recommended Frontend Request Order

**Customer browsing flow:**

1. `GET /api/catalog/categories` → load categories
2. `GET /api/catalog/regions` → load regions (for filters/location)
3. `GET /api/catalog/categories/:categoryId/sub-services` → load sub-services for a selected category
4. `GET /api/search/services?categoryId=&subServiceId=&regionId=&minPrice=&maxPrice=` → run a search with filters
5. (Alternative) `GET /api/catalog/prices?categoryId=&subServiceId=&regionId=` → browse only active prices

**Craftsman flow (price management):**

1. `POST /login` (or signup as `craftsman`) → establish session
2. `GET /api/catalog/categories` → choose the category (also needed at signup)
3. `GET /api/catalog/regions` → choose the region
4. `GET /api/catalog/categories/:categoryId/sub-services` → choose the sub-service
5. `POST /api/craftsman/service-prices` → create a price entry
6. `PATCH /api/craftsman/service-prices/:id` → edit price/currency/region
7. `PATCH /api/craftsman/service-prices/:id/toggle-active` → show/hide a listing
8. `DELETE /api/craftsman/service-prices/:id` → remove a listing

**Admin flow (catalog management):**

1. `POST /login` → establish session
2. `GET /api/admin/categories` → list categories (with counts)
3. `POST /api/admin/categories` → create a category
4. `GET/PATCH/DELETE /api/admin/categories/:id` → view/edit/delete a category
5. `POST /api/admin/sub-services` → add a sub-service under a category
6. `GET/PATCH/DELETE /api/admin/sub-services/:id` → view/edit/delete a sub-service
7. `POST /api/admin/regions` → add a region
8. `GET/PATCH/DELETE /api/admin/regions/:id` → view/edit/delete a region

**Ordering rule of thumb:** Resolve categories → regions → sub-services first (they are dependencies for price entries), then create/update price entries, then manage visibility via toggle-active.

---

*Documentation generated from the actual controllers, validators, routes, models, and migrations in the `feat/catalog-crud` branch. No backend code was modified.*

