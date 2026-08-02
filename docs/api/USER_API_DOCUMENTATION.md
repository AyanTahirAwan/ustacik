# User API Documentation

## 1. Title and Scope

This document describes the implemented user-facing and user-administration HTTP endpoints in this application. It covers only:

- signup, login, and logout;
- password recovery;
- refresh-token record listing and revocation;
- customer profiles, addresses, and favorites;
- public and owner-facing craftsman profiles;
- craftsman work photos;
- user notifications;
- administrative user listing, inspection, and suspension;
- craftsman subscriptions.

Jobs, reviews, disputes, verification workflows, catalog resources, and other teams' resources are outside the scope of this document. Category and region identifiers are mentioned only where they are foreign-key dependencies of an in-scope request or embedded dependency data in an in-scope response.

The behavior documented here reflects the current implementation in `start/routes.ts`, the corresponding controllers and validators, the user-related models and migrations, authentication middleware, and authentication views. Where AdonisJS produces an error automatically, this document identifies the status and cause but does not promise a deployment-invariant body unless the body is explicitly defined in application code.

## 2. Base URL and Content Types

The application does not add an API prefix to these routes. Combine the deployment's base URL with the full paths listed below.

```text
{BASE_URL}/signup
{BASE_URL}/customer/profile
{BASE_URL}/admin/users
```

Examples in this document use root-relative paths.

### Request content types

- `application/json` is accepted for request bodies.
- `application/x-www-form-urlencoded` is accepted by the browser-facing signup and login forms.
- The body parser also supports multipart data, but no endpoint in this document implements a file upload. Work photos accept an image URL string.
- Requests that mutate state are protected by CSRF even when their bodies use JSON.

### Response content types

- JSON endpoints normally return `application/json` when JSON is negotiated.
- `GET /signup` and `GET /login` render HTML.
- Successful signup, login, and logout operations redirect instead of returning JSON.
- `204 No Content` responses have no body.

### Date and naming conventions

- Request and response field names use camel case.
- Model-backed timestamps serialize as strings.
- Subscription `periodStart` and `periodEnd` are date values; `periodEnd` may be `null`.
- Examples contain representative values. The documented object keys reflect the current controller preloads and model serialization rules.

## 3. Authentication and Security

### Session-cookie authentication

The application uses the AdonisJS `web` session guard. It does not use access-token or bearer-token authentication for these routes.

- Session cookie name: `adonis-session`
- Session age: two hours
- Cookie path: `/`
- `httpOnly`: enabled
- `sameSite`: `lax`
- `secure`: enabled in production
- Remember-me tokens: disabled

The current environment uses the encrypted cookie session store. A database session store is configurable, but the repository does not contain a session-table migration.

Source: `config/auth.ts`, `config/session.ts`

### CSRF requirements

Shield CSRF protection applies to every `POST`, `PUT`, `PATCH`, and `DELETE` request. There are no excluded routes and the XSRF cookie option is disabled.

Browser forms render a hidden CSRF field. Other clients must establish a session and send a valid session-bound CSRF token using a mechanism supported by AdonisJS Shield.

A missing or invalid token raises `403 E_BAD_CSRF_TOKEN` with the message `Invalid or expired CSRF token`. This is a framework-generated exception; the final body can vary with the requested response format and debug mode.

Source: `start/kernel.ts`, `config/shield.ts`, `resources/views/components/form/index.edge`

### Guest middleware

Signup, login, and password-recovery endpoints are guest-only. If an authenticated session accesses one of these routes, the guest middleware reflashes the session and redirects to `/`, normally with `302 Found`.

The guest middleware checks whether the session is authenticated but does not separately check the user's status.

Source: `app/middleware/guest_middleware.ts`

### Auth middleware

Protected routes require an authenticated `web` session.

For an unauthenticated request:

- HTML/default negotiation redirects to `/login` and preserves the intended URL.
- `Accept: application/json` returns `401 Unauthorized` with:

```json
{
  "errors": [
    {
      "message": "Unauthorized access"
    }
  ]
}
```

Source: `app/middleware/auth_middleware.ts`

### Role middleware

Role middleware recognizes `customer`, `craftsman`, and `admin`.

When an authenticated user has the wrong role, application code returns:

```http
403 Forbidden
```

```json
{
  "message": "You do not have permission to access this resource"
}
```

Source: `app/middleware/role_middleware.ts`

### Suspended-user behavior

Auth-protected routes reject a user whose status is `suspended`. The middleware logs out the current session and returns:

```http
403 Forbidden
```

```json
{
  "message": "Your account has been suspended"
}
```

Login performs the same status check before creating a session.

Suspension does not immediately delete every existing session or revoke refresh-token records. Each protected session is rejected and logged out when it is next used. Public craftsman routes do not currently join against or filter by user status, so a suspended craftsman's public profile may remain visible.

Source: `app/middleware/auth_middleware.ts`, `app/controllers/session_controller.ts`

## 4. Common Success and Error Responses

### Common success patterns

Collection endpoints return a named top-level array:

```json
{
  "addresses": []
}
```

Single-resource endpoints return a named top-level object:

```json
{
  "customer": {}
}
```

Delete/revoke endpoints return:

```http
204 No Content
```

Signup, login, and logout return redirects with no application-defined JSON body.

### Validation errors

VineJS validation failures use `422 Unprocessable Entity`. For `Accept: application/json`, the installed framework renders a structure of this form:

```json
{
  "errors": [
    {
      "message": "Framework-generated validation message",
      "rule": "rule_name",
      "field": "fieldName"
    }
  ]
}
```

Some rules add `meta`. Exact message text and metadata are framework-generated and are not fixed by the application controllers.

### Resource-not-found errors

Model lookups using `firstOrFail` or `findOrFail` raise `404 E_ROW_NOT_FOUND`. The application does not define endpoint-specific JSON bodies for those errors. In production JSON mode, the installed default handler normally renders:

```json
{
  "message": "Row not found"
}
```

Debug mode and other negotiated formats may return a different body.

### Unhandled errors

Database constraint failures, rendering failures, and generic controller errors are handled by the global AdonisJS exception handler. They normally produce `500 Internal Server Error`, but their response bodies vary by environment and content negotiation and are not part of this API contract.

### Common authorization responses

The following application-defined responses are reused throughout the detailed endpoint sections:

```json
{
  "message": "Your account has been suspended"
}
```

```json
{
  "message": "You do not have permission to access this resource"
}
```

## 5. Endpoint Summary Table

| Group | Method | Full path | Route name | Authentication | Role | Success |
|---|---|---|---|---|---|---:|
| Authentication | GET | `/signup` | `new_account.create` | Guest only | None | 200 |
| Authentication | POST | `/signup` | `new_account.store` | Guest only | None | 302 |
| Authentication | GET | `/login` | `session.create` | Guest only | None | 200 |
| Authentication | POST | `/login` | `session.store` | Guest only | None | 302 |
| Authentication | POST | `/logout` | `session.destroy` | Required | Any | 302 |
| Password Recovery | POST | `/password-recovery` | `password_recovery_requests.store` | Guest only | None | 200 |
| Password Recovery | PATCH | `/password-recovery/:shortcode` | `password_recovery_requests.update` | Guest only | None | 200 |
| Refresh Tokens | GET | `/auth/refresh-tokens` | `refresh_tokens.index` | Required | Any | 200 |
| Refresh Tokens | DELETE | `/auth/refresh-tokens/:id` | `refresh_tokens.destroy` | Required | Any | 204 |
| Customer Profile | GET | `/customer/profile` | `customers.show` | Required | Customer | 200 |
| Customer Profile | PATCH | `/customer/profile` | `customers.update` | Required | Customer | 200 |
| Customer Addresses | GET | `/customer/addresses` | `customer_addresses.index` | Required | Customer | 200 |
| Customer Addresses | POST | `/customer/addresses` | `customer_addresses.store` | Required | Customer | 201 |
| Customer Addresses | PATCH | `/customer/addresses/:id` | `customer_addresses.update` | Required | Customer | 200 |
| Customer Addresses | DELETE | `/customer/addresses/:id` | `customer_addresses.destroy` | Required | Customer | 204 |
| Customer Favorites | GET | `/customer/favorites` | `customer_favorites.index` | Required | Customer | 200 |
| Customer Favorites | POST | `/customer/favorites` | `customer_favorites.store` | Required | Customer | 201 |
| Customer Favorites | DELETE | `/customer/favorites/:craftsmanId` | `customer_favorites.destroy` | Required | Customer | 204 |
| Craftsmen | GET | `/craftsmen` | `craftsmen.index` | Public | None | 200 |
| Craftsmen | GET | `/craftsmen/:id` | `craftsmen.show_public` | Public | None | 200 |
| Craftsmen | GET | `/craftsman/profile` | `craftsmen.show_own` | Required | Craftsman | 200 |
| Craftsmen | PATCH | `/craftsman/profile` | `craftsmen.update_own` | Required | Craftsman | 200 |
| Work Photos | GET | `/craftsman/work-photos` | `work_photos.index` | Required | Craftsman | 200 |
| Work Photos | POST | `/craftsman/work-photos` | `work_photos.store` | Required | Craftsman | 201 |
| Work Photos | DELETE | `/craftsman/work-photos/:id` | `work_photos.destroy` | Required | Craftsman | 204 |
| Notifications | GET | `/notifications` | `user_notifications.index` | Required | Customer or craftsman | 200 |
| Admin Users | GET | `/admin/users` | `users.index` | Required | Admin | 200 |
| Admin Users | GET | `/admin/users/:id` | `users.show` | Required | Admin | 200 |
| Admin Users | PATCH | `/admin/users/:id/suspend` | `users.suspend` | Required | Admin | 200 |
| Subscriptions | GET | `/craftsman/subscription` | `subscriptions.show` | Required | Craftsman | 200 |

## 6. Detailed Endpoint Documentation

### Authentication

#### Display the signup form

**HTTP method:** `GET`<br>
**Full path:** `/signup`<br>
**Route name:** `new_account.create`

**Purpose:** Renders the browser signup form.

**Authentication requirement:** Guest-only.<br>
**Required role:** None.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```http
HTTP/1.1 200 OK
Content-Type: text/html

<!-- HTML rendered from resources/views/pages/auth/signup.edge -->
```

The rendered form currently contains `fullName`, `email`, `password`, and `passwordConfirmation`, plus a CSRF field.

**Possible errors:**

- `302 Found` to `/` if the request already has an authenticated session.
- Framework-generated `500` if view rendering fails.

**Ownership and authorization:** No user resource is read or modified. Guest middleware prevents authenticated sessions from using this route.

**Implementation:** `start/routes.ts`; `NewAccountController.create` in `app/controllers/new_account_controller.ts`; `resources/views/pages/auth/signup.edge`.

#### Create an account

**HTTP method:** `POST`<br>
**Full path:** `/signup`<br>
**Route name:** `new_account.store`

**Purpose:** Creates a customer or craftsman user, creates the corresponding profile, creates a free subscription for a craftsman, and logs in the new user.

**Authentication requirement:** Guest-only.<br>
**Required role:** None.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| `email` | string | Yes | Valid email; maximum 254 characters; unique in `users.email` |
| `phone` | string | Yes | Trimmed; 8–32 characters; unique in `users.phone_normalised` |
| `password` | string | Yes | 8–64 characters; confirmed by `passwordConfirmation` |
| `passwordConfirmation` | string | Yes | Must match `password` |
| `role` | string | Yes | `customer` or `craftsman` |
| `fullName` | string | No | Trimmed; 2–160 characters |
| `businessName` | string | Conditionally | Validator marks it optional; controller requires it when `role` is `craftsman`; trimmed; 2–160 characters |
| `categoryId` | number | Conditionally | Validator marks it optional; controller requires it for a craftsman; no integer, minimum, or existence rule is implemented here |

For a customer, `fullName` defaults to the submitted email when omitted. Customer profiles start with language `en` and `smsOptIn: true`.

For a craftsman, the profile starts with trust level `0`, `verbalConsent: false`, and `totalJobs: 0`. A free, active subscription is created with the current period start, no period end, and the database default monthly fee of zero.

**Successful status code:** `302 Found`

**Successful response example:**

```http
HTTP/1.1 302 Found
Location: /
Set-Cookie: adonis-session=...
```

No JSON success body is defined.

**Possible errors:**

- `302 Found` to `/` when already authenticated.
- `403 Forbidden` for an invalid or missing CSRF token; framework-generated body.
- `422 Unprocessable Entity` for validation failures, including duplicate email or phone.
- `500 Internal Server Error` when a craftsman omits `businessName` or `categoryId`; the controller throws `businessName and categoryId are required for craftsman signup`.
- Framework-generated database error for an invalid/nonexistent `categoryId` or a constraint race. No endpoint-specific body is defined.

**Ownership and authorization:** The user and profile are created together in a database transaction. Password hashing is performed by the user model's authentication hook. Public admin signup is not supported.

**Implementation:** `start/routes.ts`; `NewAccountController.store` in `app/controllers/new_account_controller.ts`; `signupValidator` in `app/validators/user.ts`.

#### Display the login form

**HTTP method:** `GET`<br>
**Full path:** `/login`<br>
**Route name:** `session.create`

**Purpose:** Renders the browser login form.

**Authentication requirement:** Guest-only.<br>
**Required role:** None.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```http
HTTP/1.1 200 OK
Content-Type: text/html

<!-- HTML rendered from resources/views/pages/auth/login.edge -->
```

**Possible errors:**

- `302 Found` to `/` when already authenticated.
- Framework-generated `500` if view rendering fails.

**Ownership and authorization:** No account lookup occurs while displaying the form.

**Implementation:** `start/routes.ts`; `SessionController.create` in `app/controllers/session_controller.ts`; `resources/views/pages/auth/login.edge`.

#### Log in

**HTTP method:** `POST`<br>
**Full path:** `/login`<br>
**Route name:** `session.store`

**Purpose:** Verifies email/password credentials and creates a web session.

**Authentication requirement:** Guest-only.<br>
**Required role:** None.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| `email` | Not validated | Functionally required | Read directly from the request and passed to `User.verifyCredentials` |
| `password` | Not validated | Functionally required | Read directly from the request and passed to `User.verifyCredentials` |

There is no dedicated login validator. Missing or falsy credentials are handled as invalid credentials.

**Successful status code:** `302 Found`

**Successful response example:**

```http
HTTP/1.1 302 Found
Location: /
Set-Cookie: adonis-session=...
```

**Possible errors:**

- `302 Found` to `/` when already authenticated.
- `403 Forbidden` for an invalid or missing CSRF token; framework-generated body.
- `400 Bad Request` for missing or invalid credentials. Confirmed JSON response:

  ```json
  {
    "errors": [
      {
        "message": "Invalid user credentials"
      }
    ]
  }
  ```

- `403 Forbidden` for a suspended account:

  ```json
  {
    "message": "Your account has been suspended"
  }
  ```

**Ownership and authorization:** Credential lookup uses email. The authentication mixin performs timing-attack mitigation for an unknown user. A suspended user is not logged in.

**Implementation:** `start/routes.ts`; `SessionController.store` in `app/controllers/session_controller.ts`; `app/models/user.ts`.

#### Log out

**HTTP method:** `POST`<br>
**Full path:** `/logout`<br>
**Route name:** `session.destroy`

**Purpose:** Logs out the current web session.

**Authentication requirement:** Required.<br>
**Required role:** Any authenticated role.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No application request body is read; a valid CSRF token is still required. |

**Successful status code:** `302 Found`

**Successful response example:**

```http
HTTP/1.1 302 Found
Location: /login
```

**Possible errors:**

- `403 Forbidden` for an invalid or missing CSRF token; framework-generated body.
- `401 Unauthorized` for unauthenticated JSON requests, or a redirect to `/login` for HTML/default negotiation.
- `403 Forbidden` with the confirmed suspension body when the session belongs to a suspended user. The auth middleware logs out the session before the controller runs.

**Ownership and authorization:** Only the current session is logged out. Other sessions and refresh-token records are not revoked.

**Implementation:** `start/routes.ts`; `SessionController.destroy` in `app/controllers/session_controller.ts`.

### Password Recovery

#### Request password recovery

**HTTP method:** `POST`<br>
**Full path:** `/password-recovery`<br>
**Route name:** `password_recovery_requests.store`

**Purpose:** Creates a one-hour password-recovery database record when the submitted email belongs to a user.

**Authentication requirement:** Guest-only.<br>
**Required role:** None.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| `email` | string | Yes | Valid email; maximum 254 characters |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "message": "If that email exists, a password recovery link has been sent"
}
```

This response is returned whether or not the email exists. When it exists, the application creates a random 48-character hexadecimal shortcode with a one-hour expiry. No email, SMS, queue, or other delivery service is implemented, so the response must not be interpreted as confirmation of actual delivery.

**Possible errors:**

- `302 Found` to `/` when already authenticated.
- `403 Forbidden` for an invalid or missing CSRF token; framework-generated body.
- `422 Unprocessable Entity` for an invalid or missing email.
- Framework-generated error if database insertion or secure random generation fails.

**Ownership and authorization:** The endpoint deliberately does not reveal whether the email exists. No rate limiting is implemented.

**Implementation:** `start/routes.ts`; `PasswordRecoveryRequestsController.store` in `app/controllers/password_recovery_requests_controller.ts`; `requestPasswordRecoveryValidator` in `app/validators/password_recovery.ts`.

#### Redeem password recovery

**HTTP method:** `PATCH`<br>
**Full path:** `/password-recovery/:shortcode`<br>
**Route name:** `password_recovery_requests.update`

**Purpose:** Uses an unexpired, unused recovery shortcode to change its associated user's password.

**Authentication requirement:** Guest-only.<br>
**Required role:** None.

**Path parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `shortcode` | string | Yes | No dedicated path validator or format/length rule; matched against the stored shortcode |

**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| `password` | string | Yes | 8–64 characters; confirmed by `passwordConfirmation` |
| `passwordConfirmation` | string | Yes | Must match `password` |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "message": "Password updated successfully"
}
```

**Possible errors:**

- `302 Found` to `/` when already authenticated.
- `403 Forbidden` for an invalid or missing CSRF token; framework-generated body.
- `422 Unprocessable Entity` for password validation failure.
- `404 Not Found` when the shortcode does not exist; framework-generated body.
- `400 Bad Request` when the shortcode has expired or was already used:

  ```json
  {
    "message": "This recovery link is invalid or has expired"
  }
  ```

**Ownership and authorization:** Possession of the shortcode is the authorization mechanism. The shortcode is stored in plaintext. Redemption marks the record as recovered, but the check and updates are not wrapped in a locking transaction. Existing sessions and refresh-token records are not invalidated.

**Implementation:** `start/routes.ts`; `PasswordRecoveryRequestsController.update` in `app/controllers/password_recovery_requests_controller.ts`; `redeemPasswordRecoveryValidator` in `app/validators/password_recovery.ts`.

### Refresh Tokens

These endpoints manage custom refresh-token database records. They do not issue, exchange, validate, or rotate tokens, and the session guard does not consume this table.

#### List refresh-token records

**HTTP method:** `GET`<br>
**Full path:** `/auth/refresh-tokens`<br>
**Route name:** `refresh_tokens.index`

**Purpose:** Lists the authenticated user's non-revoked refresh-token metadata.

**Authentication requirement:** Required.<br>
**Required role:** Any authenticated role.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "refreshTokens": [
    {
      "id": 14,
      "userId": 7,
      "expiresAt": "2026-08-30T10:00:00.000Z",
      "revoked": false,
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  ]
}
```

`tokenHash` is explicitly excluded from serialization. Results are ordered by creation time descending. Expired records remain visible when they have not been marked revoked.

**Possible errors:**

- `401 Unauthorized` or login redirect when unauthenticated.
- `403 Forbidden` with the suspension body for a suspended user.
- Framework-generated database error.

**Ownership and authorization:** The query filters by the authenticated user ID and `revoked = false`.

**Implementation:** `start/routes.ts`; `RefreshTokensController.index` in `app/controllers/refresh_tokens_controller.ts`; `app/models/refresh_token.ts`.

#### Revoke a refresh-token record

**HTTP method:** `DELETE`<br>
**Full path:** `/auth/refresh-tokens/:id`<br>
**Route name:** `refresh_tokens.destroy`

**Purpose:** Marks an owned refresh-token record as revoked.

**Authentication requirement:** Required.<br>
**Required role:** Any authenticated role.

**Path parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `id` | URL string, semantically an integer | Yes | No dedicated path validator |

**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No application body is read; a valid CSRF token is required. |

**Successful status code:** `204 No Content`

**Successful response example:**

```http
HTTP/1.1 204 No Content
```

**Possible errors:**

- `403 Forbidden` for an invalid or missing CSRF token.
- `401 Unauthorized` or login redirect when unauthenticated.
- `403 Forbidden` with the suspension body.
- `404 Not Found` when the record does not exist or belongs to another user; framework-generated body.

**Ownership and authorization:** Lookup requires both the supplied record ID and the authenticated user ID. The operation only changes the record's `revoked` flag.

**Implementation:** `start/routes.ts`; `RefreshTokensController.destroy` in `app/controllers/refresh_tokens_controller.ts`.

### Customer Profile

#### Get the customer profile

**HTTP method:** `GET`<br>
**Full path:** `/customer/profile`<br>
**Route name:** `customers.show`

**Purpose:** Returns the authenticated customer's own profile, user account data, and current default region dependency.

**Authentication requirement:** Required.<br>
**Required role:** Customer.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "customer": {
    "userId": 7,
    "fullName": "Example Customer",
    "defaultRegionId": 3,
    "language": "en",
    "smsOptIn": true,
    "createdAt": "2026-08-01T09:00:00.000Z",
    "user": {
      "id": 7,
      "email": "customer@example.com",
      "phoneNormalised": "+905551234567",
      "role": "customer",
      "status": "active",
      "createdAt": "2026-08-01T09:00:00.000Z",
      "updatedAt": null
    },
    "defaultRegion": {
      "id": 3,
      "nameEn": "Example Region",
      "nameTr": "Örnek Bölge",
      "createdAt": "2026-07-01T09:00:00.000Z"
    }
  }
}
```

`defaultRegionId` and `defaultRegion` may be `null`. `passwordHash` is not serialized.

**Possible errors:**

- `401 Unauthorized` or login redirect.
- `403 Forbidden` for suspension.
- `403 Forbidden` for a non-customer role.
- `404 Not Found` if an authenticated customer-role user has no customer profile row; framework-generated body.

**Ownership and authorization:** The profile query filters `user_id` by the authenticated user ID. No customer can select another customer's profile.

**Implementation:** `start/routes.ts`; `CustomersController.show` in `app/controllers/customers_controller.ts`; `app/models/customer.ts`.

#### Update the customer profile

**HTTP method:** `PATCH`<br>
**Full path:** `/customer/profile`<br>
**Route name:** `customers.update`

**Purpose:** Updates mutable fields on the authenticated customer's own profile.

**Authentication requirement:** Required.<br>
**Required role:** Customer.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| `fullName` | string | No | Trimmed; 2–160 characters |
| `defaultRegionId` | integer or null | No | No decimals; minimum 1; must exist in `regions.id`; nullable |
| `language` | string | No | Trimmed; 2–8 characters |
| `smsOptIn` | boolean | No | Boolean |

All fields are optional. An empty valid payload returns the unchanged profile.

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "customer": {
    "userId": 7,
    "fullName": "Updated Customer",
    "defaultRegionId": null,
    "language": "tr",
    "smsOptIn": false,
    "createdAt": "2026-08-01T09:00:00.000Z",
    "user": {
      "id": 7,
      "email": "customer@example.com",
      "phoneNormalised": "+905551234567",
      "role": "customer",
      "status": "active",
      "createdAt": "2026-08-01T09:00:00.000Z",
      "updatedAt": null
    },
    "defaultRegion": null
  }
}
```

**Possible errors:**

- CSRF `403`.
- Authentication, suspension, or role `401`/`403` responses.
- `422 Unprocessable Entity` for invalid profile values or a nonexistent `defaultRegionId`.
- `404 Not Found` when the profile row is missing.

**Ownership and authorization:** The customer primary key is the authenticated user ID. Email, phone, password, role, and user status cannot be changed here.

**Implementation:** `start/routes.ts`; `CustomersController.update` in `app/controllers/customers_controller.ts`; `updateCustomerValidator` in `app/validators/customer.ts`.

### Customer Addresses

#### List customer addresses

**HTTP method:** `GET`<br>
**Full path:** `/customer/addresses`<br>
**Route name:** `customer_addresses.index`

**Purpose:** Lists the authenticated customer's addresses with embedded region dependency data.

**Authentication requirement:** Required.<br>
**Required role:** Customer.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "addresses": [
    {
      "id": 12,
      "customerId": 7,
      "regionId": 3,
      "label": "Home",
      "street": "Example Street 10",
      "landmark": "Near the park",
      "isDefault": true,
      "createdAt": "2026-08-01T11:00:00.000Z",
      "region": {
        "id": 3,
        "nameEn": "Example Region",
        "nameTr": "Örnek Bölge",
        "createdAt": "2026-07-01T09:00:00.000Z"
      }
    }
  ]
}
```

Default addresses sort first, followed by ascending address ID.

**Possible errors:** Authentication, suspension, role, and framework-generated database errors.

**Ownership and authorization:** The query filters `customer_id` by the authenticated user ID.

**Implementation:** `start/routes.ts`; `CustomerAddressesController.index` in `app/controllers/customer_addresses_controller.ts`.

#### Create a customer address

**HTTP method:** `POST`<br>
**Full path:** `/customer/addresses`<br>
**Route name:** `customer_addresses.store`

**Purpose:** Creates an address owned by the authenticated customer.

**Authentication requirement:** Required.<br>
**Required role:** Customer.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| `regionId` | integer | Yes | No decimals; minimum 1; must exist in `regions.id` |
| `label` | string | Yes | Trimmed; 1–80 characters |
| `street` | string | Yes | Trimmed; 2–200 characters |
| `landmark` | string or null | No | Trimmed; maximum 200 characters; nullable |
| `isDefault` | boolean | No | Boolean; defaults to `false` |

**Successful status code:** `201 Created`

**Successful response example:**

```json
{
  "address": {
    "id": 12,
    "customerId": 7,
    "regionId": 3,
    "label": "Home",
    "street": "Example Street 10",
    "landmark": null,
    "isDefault": true,
    "createdAt": "2026-08-01T11:00:00.000Z",
    "region": {
      "id": 3,
      "nameEn": "Example Region",
      "nameTr": "Örnek Bölge",
      "createdAt": "2026-07-01T09:00:00.000Z"
    }
  }
}
```

If `isDefault` is true, existing addresses belonging to this customer are changed to non-default inside the same transaction.

**Possible errors:** CSRF `403`; authentication/suspension/role failures; `422` validation; framework-generated database errors.

**Ownership and authorization:** `customerId` is taken from the authenticated session, never from the request body.

**Implementation:** `start/routes.ts`; `CustomerAddressesController.store` in `app/controllers/customer_addresses_controller.ts`; `createCustomerAddressValidator` in `app/validators/customer_address.ts`.

#### Update a customer address

**HTTP method:** `PATCH`<br>
**Full path:** `/customer/addresses/:id`<br>
**Route name:** `customer_addresses.update`

**Purpose:** Updates an address owned by the authenticated customer.

**Authentication requirement:** Required.<br>
**Required role:** Customer.

**Path parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `id` | URL string, semantically an integer | Yes | No dedicated path validator |

**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| `regionId` | integer | No | No decimals; minimum 1; must exist in `regions.id` |
| `label` | string | No | Trimmed; 1–80 characters |
| `street` | string | No | Trimmed; 2–200 characters |
| `landmark` | string or null | No | Trimmed; maximum 200 characters; nullable |
| `isDefault` | boolean | No | Boolean |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "address": {
    "id": 12,
    "customerId": 7,
    "regionId": 3,
    "label": "Primary Home",
    "street": "Example Street 10",
    "landmark": "Blue door",
    "isDefault": true,
    "createdAt": "2026-08-01T11:00:00.000Z",
    "region": {
      "id": 3,
      "nameEn": "Example Region",
      "nameTr": "Örnek Bölge",
      "createdAt": "2026-07-01T09:00:00.000Z"
    }
  }
}
```

**Possible errors:** CSRF `403`; authentication/suspension/role failures; `422`; `404` for an unknown or non-owned address.

**Ownership and authorization:** The lookup requires both the address ID and the authenticated customer ID. Setting `isDefault: true` clears the flag from the customer's other addresses.

**Implementation:** `start/routes.ts`; `CustomerAddressesController.update` in `app/controllers/customer_addresses_controller.ts`; `updateCustomerAddressValidator` in `app/validators/customer_address.ts`.

#### Delete a customer address

**HTTP method:** `DELETE`<br>
**Full path:** `/customer/addresses/:id`<br>
**Route name:** `customer_addresses.destroy`

**Purpose:** Deletes an address owned by the authenticated customer.

**Authentication requirement:** Required.<br>
**Required role:** Customer.

**Path parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `id` | URL string, semantically an integer | Yes | No dedicated path validator |

**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No application body is read; a valid CSRF token is required. |

**Successful status code:** `204 No Content`

**Successful response example:**

```http
HTTP/1.1 204 No Content
```

**Possible errors:** CSRF `403`; authentication/suspension/role failures; `404` for an unknown or non-owned address.

**Ownership and authorization:** The lookup requires the address ID and authenticated customer ID. Deleting a default address does not promote another address.

**Implementation:** `start/routes.ts`; `CustomerAddressesController.destroy` in `app/controllers/customer_addresses_controller.ts`.

### Customer Favorites

#### List customer favorites

**HTTP method:** `GET`<br>
**Full path:** `/customer/favorites`<br>
**Route name:** `customer_favorites.index`

**Purpose:** Lists favorite relationship records belonging to the authenticated customer.

**Authentication requirement:** Required.<br>
**Required role:** Customer.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "favorites": [
    {
      "id": 21,
      "customerId": 7,
      "craftsmanId": 18,
      "createdAt": "2026-08-01T12:00:00.000Z"
    }
  ]
}
```

Results are ordered by descending ID. Craftsman profiles are not embedded.

**Possible errors:** Authentication, suspension, role, and framework-generated database errors.

**Ownership and authorization:** The query filters by the authenticated customer's user ID.

**Implementation:** `start/routes.ts`; `CustomerFavoritesController.index` in `app/controllers/customer_favorites_controller.ts`.

#### Add a customer favorite

**HTTP method:** `POST`<br>
**Full path:** `/customer/favorites`<br>
**Route name:** `customer_favorites.store`

**Purpose:** Adds a craftsman to the authenticated customer's favorites.

**Authentication requirement:** Required.<br>
**Required role:** Customer.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| `craftsmanId` | integer | Yes | No decimals; minimum 1; must exist in `craftsmen.user_id` |

**Successful status code:** `201 Created`

**Successful response example:**

```json
{
  "favorite": {
    "id": 21,
    "customerId": 7,
    "craftsmanId": 18,
    "createdAt": "2026-08-01T12:00:00.000Z"
  }
}
```

**Possible errors:**

- CSRF `403`; authentication/suspension/role failures.
- `422 Unprocessable Entity` for an invalid or nonexistent craftsman ID.
- `409 Conflict` when the relationship already exists:

  ```json
  {
    "message": "Craftsman is already in favorites"
  }
  ```

- A concurrent duplicate may instead produce a framework-generated database-constraint error.

**Ownership and authorization:** `customerId` comes only from the authenticated session.

**Implementation:** `start/routes.ts`; `CustomerFavoritesController.store` in `app/controllers/customer_favorites_controller.ts`; `createCustomerFavoriteValidator` in `app/validators/customer_favorite.ts`.

#### Remove a customer favorite

**HTTP method:** `DELETE`<br>
**Full path:** `/customer/favorites/:craftsmanId`<br>
**Route name:** `customer_favorites.destroy`

**Purpose:** Removes an owned favorite relationship by craftsman user ID.

**Authentication requirement:** Required.<br>
**Required role:** Customer.

**Path parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `craftsmanId` | URL string, semantically an integer | Yes | No dedicated path validator |

**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No application body is read; a valid CSRF token is required. |

**Successful status code:** `204 No Content`

**Successful response example:**

```http
HTTP/1.1 204 No Content
```

**Possible errors:** CSRF `403`; authentication/suspension/role failures; `404` when the owned favorite does not exist.

**Ownership and authorization:** Both the authenticated customer ID and path `craftsmanId` must match the relationship.

**Implementation:** `start/routes.ts`; `CustomerFavoritesController.destroy` in `app/controllers/customer_favorites_controller.ts`.

### Craftsmen

#### Browse craftsmen

**HTTP method:** `GET`<br>
**Full path:** `/craftsmen`<br>
**Route name:** `craftsmen.index`

**Purpose:** Publicly lists and optionally filters craftsman profiles.

**Authentication requirement:** None.<br>
**Required role:** None.

**Path parameters:** None.

**Query parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `search` | Unvalidated request input | No | Applied as a contains match to `business_name` or `bio` |
| `categoryId` | Unvalidated request input | No | Compared directly with the craftsman's category foreign key |

There is no dedicated query validator, pagination, or result limit.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "craftsmen": [
    {
      "userId": 18,
      "businessName": "Example Workshop",
      "category": {
        "id": 4,
        "nameEn": "Example Category",
        "nameTr": "Örnek Kategori",
        "createdAt": "2026-07-01T09:00:00.000Z"
      },
      "bio": "Example public biography.",
      "trustLevel": 1,
      "trustLevelLabel": "registered",
      "totalJobs": 5,
      "workPhotos": [
        {
          "id": 30,
          "craftsmanId": 18,
          "imageUrl": "https://example.com/work/photo.jpg",
          "createdAt": "2026-08-01T13:00:00.000Z"
        }
      ]
    }
  ]
}
```

Results are ordered by business name ascending.

**Possible errors:** No `422` query-validation response is implemented. Database failures are framework-generated.

**Ownership and authorization:** This route is public. The controller explicitly excludes contact information, `bizRegNo`, and `verbalConsent`. It does not filter by the related user's status, so suspended craftsmen may remain listed.

**Implementation:** `start/routes.ts`; `CraftsmenController.index` in `app/controllers/craftsmen_controller.ts`.

#### Get a public craftsman profile

**HTTP method:** `GET`<br>
**Full path:** `/craftsmen/:id`<br>
**Route name:** `craftsmen.show_public`

**Purpose:** Returns the public fields of one craftsman.

**Authentication requirement:** None.<br>
**Required role:** None.

**Path parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `id` | URL string, semantically a user ID | Yes | No dedicated path validator; matched against `craftsmen.user_id` |

**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "craftsman": {
    "userId": 18,
    "businessName": "Example Workshop",
    "category": {
      "id": 4,
      "nameEn": "Example Category",
      "nameTr": "Örnek Kategori",
      "createdAt": "2026-07-01T09:00:00.000Z"
    },
    "bio": "Example public biography.",
    "trustLevel": 1,
    "trustLevelLabel": "registered",
    "totalJobs": 5,
    "workPhotos": []
  }
}
```

**Possible errors:** `404 Not Found` when no craftsman has the supplied user ID; framework-generated body.

**Ownership and authorization:** Public endpoint with an explicit field allowlist. It does not filter suspended craftsmen.

**Implementation:** `start/routes.ts`; `CraftsmenController.showPublic` in `app/controllers/craftsmen_controller.ts`.

#### Get the craftsman's own profile

**HTTP method:** `GET`<br>
**Full path:** `/craftsman/profile`<br>
**Route name:** `craftsmen.show_own`

**Purpose:** Returns the authenticated craftsman's complete stored profile, embedded category dependency, and work photos.

**Authentication requirement:** Required.<br>
**Required role:** Craftsman.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "craftsman": {
    "userId": 18,
    "businessName": "Example Workshop",
    "categoryId": 4,
    "bio": "Example biography.",
    "trustLevel": 1,
    "bizRegNo": "REG-123",
    "verbalConsent": false,
    "totalJobs": 5,
    "createdAt": "2026-08-01T09:00:00.000Z",
    "category": {
      "id": 4,
      "nameEn": "Example Category",
      "nameTr": "Örnek Kategori",
      "createdAt": "2026-07-01T09:00:00.000Z"
    },
    "workPhotos": []
  }
}
```

The `trustLevelLabel` getter is not marked as a serialized computed property, so it is present in explicit public mappings but not in this model-backed response.

**Possible errors:** Authentication/suspension/role failures; `404` if the profile row is missing.

**Ownership and authorization:** The query filters by the authenticated user ID. Owner-only fields such as `bizRegNo` and `verbalConsent` are included.

**Implementation:** `start/routes.ts`; `CraftsmenController.showOwn` in `app/controllers/craftsmen_controller.ts`; `app/models/craftsman.ts`.

#### Update the craftsman's own profile

**HTTP method:** `PATCH`<br>
**Full path:** `/craftsman/profile`<br>
**Route name:** `craftsmen.update_own`

**Purpose:** Updates mutable fields on the authenticated craftsman's profile.

**Authentication requirement:** Required.<br>
**Required role:** Craftsman.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| `businessName` | string | No | Trimmed; 2–160 characters |
| `categoryId` | integer | No | No decimals; minimum 1; must exist in `categories.id` |
| `bio` | string or null | No | Trimmed; maximum 2,000 characters; nullable |
| `bizRegNo` | string or null | No | Trimmed; maximum 64 characters; nullable |
| `verbalConsent` | boolean | No | Boolean |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "craftsman": {
    "userId": 18,
    "businessName": "Updated Workshop",
    "categoryId": 4,
    "bio": "Updated biography.",
    "trustLevel": 1,
    "bizRegNo": "REG-123",
    "verbalConsent": true,
    "totalJobs": 5,
    "createdAt": "2026-08-01T09:00:00.000Z",
    "category": {
      "id": 4,
      "nameEn": "Example Category",
      "nameTr": "Örnek Kategori",
      "createdAt": "2026-07-01T09:00:00.000Z"
    }
  }
}
```

The update response loads `category` but does not load `workPhotos`.

**Possible errors:** CSRF `403`; authentication/suspension/role failures; `422`; `404` if the craftsman profile is missing.

**Ownership and authorization:** Lookup uses the authenticated user ID. The implementation currently allows a craftsman to set their own `verbalConsent` value.

**Implementation:** `start/routes.ts`; `CraftsmenController.updateOwn` in `app/controllers/craftsmen_controller.ts`; `updateCraftsmanValidator` in `app/validators/craftsman.ts`.

### Work Photos

#### List work photos

**HTTP method:** `GET`<br>
**Full path:** `/craftsman/work-photos`<br>
**Route name:** `work_photos.index`

**Purpose:** Lists work-photo URL records owned by the authenticated craftsman.

**Authentication requirement:** Required.<br>
**Required role:** Craftsman.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "workPhotos": [
    {
      "id": 30,
      "craftsmanId": 18,
      "imageUrl": "https://example.com/work/photo.jpg",
      "createdAt": "2026-08-01T13:00:00.000Z"
    }
  ]
}
```

Results are ordered by descending ID.

**Possible errors:** Authentication/suspension/role failures and framework-generated database errors.

**Ownership and authorization:** The query filters by the authenticated craftsman's user ID.

**Implementation:** `start/routes.ts`; `WorkPhotosController.index` in `app/controllers/work_photos_controller.ts`.

#### Add a work photo

**HTTP method:** `POST`<br>
**Full path:** `/craftsman/work-photos`<br>
**Route name:** `work_photos.store`

**Purpose:** Stores an image URL in the authenticated craftsman's portfolio.

**Authentication requirement:** Required.<br>
**Required role:** Craftsman.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| `imageUrl` | string | Yes | Trimmed; valid URL; maximum 500 characters |

**Successful status code:** `201 Created`

**Successful response example:**

```json
{
  "workPhoto": {
    "id": 30,
    "craftsmanId": 18,
    "imageUrl": "https://example.com/work/photo.jpg",
    "createdAt": "2026-08-01T13:00:00.000Z"
  }
}
```

**Possible errors:** CSRF `403`; authentication/suspension/role failures; `422`; framework-generated database errors.

**Ownership and authorization:** `craftsmanId` comes from the authenticated session. The application does not upload, fetch, scan, or verify ownership of the remote image and does not enforce a portfolio-size limit.

**Implementation:** `start/routes.ts`; `WorkPhotosController.store` in `app/controllers/work_photos_controller.ts`; `createWorkPhotoValidator` in `app/validators/work_photo.ts`.

#### Delete a work photo

**HTTP method:** `DELETE`<br>
**Full path:** `/craftsman/work-photos/:id`<br>
**Route name:** `work_photos.destroy`

**Purpose:** Deletes a work-photo record owned by the authenticated craftsman.

**Authentication requirement:** Required.<br>
**Required role:** Craftsman.

**Path parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `id` | URL string, semantically an integer | Yes | No dedicated path validator |

**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No application body is read; a valid CSRF token is required. |

**Successful status code:** `204 No Content`

**Successful response example:**

```http
HTTP/1.1 204 No Content
```

**Possible errors:** CSRF `403`; authentication/suspension/role failures; `404` for an unknown or non-owned photo.

**Ownership and authorization:** The lookup requires both the photo ID and the authenticated craftsman ID.

**Implementation:** `start/routes.ts`; `WorkPhotosController.destroy` in `app/controllers/work_photos_controller.ts`.

### Notifications

#### List notifications

**HTTP method:** `GET`<br>
**Full path:** `/notifications`<br>
**Route name:** `user_notifications.index`

**Purpose:** Lists notification records owned by the authenticated user.

**Authentication requirement:** Required.<br>
**Required role:** Customer or craftsman. Admin users are not allowed by the route middleware.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "notifications": [
    {
      "id": 45,
      "userId": 7,
      "type": "system",
      "title": "Example notification",
      "messageBody": "Example notification body.",
      "isRead": false,
      "sentAt": "2026-08-01T14:00:00.000Z"
    }
  ]
}
```

Results are ordered by `sentAt` descending.

**Possible errors:** Authentication/suspension/role failures and framework-generated database errors.

**Ownership and authorization:** The query filters by authenticated `user_id`. No endpoint is implemented for marking notifications read, deleting them, filtering unread records, or creating notifications. The list is unpaginated.

**Implementation:** `start/routes.ts`; `UserNotificationsController.index` in `app/controllers/user_notifications_controller.ts`; `app/models/user_notification.ts`.

### Admin Users

#### List users

**HTTP method:** `GET`<br>
**Full path:** `/admin/users`<br>
**Route name:** `users.index`

**Purpose:** Returns all users and their role-specific profile relationship, with optional role/status filters.

**Authentication requirement:** Required.<br>
**Required role:** Admin.

**Path parameters:** None.

**Query parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `role` | string | No | `customer`, `craftsman`, or `admin` |
| `status` | string | No | `active` or `suspended` |

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "users": [
    {
      "id": 7,
      "email": "customer@example.com",
      "phoneNormalised": "+905551234567",
      "role": "customer",
      "status": "active",
      "createdAt": "2026-08-01T09:00:00.000Z",
      "updatedAt": null,
      "customer": {
        "userId": 7,
        "fullName": "Example Customer",
        "defaultRegionId": 3,
        "language": "en",
        "smsOptIn": true,
        "createdAt": "2026-08-01T09:00:00.000Z"
      },
      "craftsman": null,
      "admin": null
    }
  ]
}
```

Craftsman profile objects include `businessName`, `categoryId`, `bio`, `trustLevel`, `bizRegNo`, `verbalConsent`, `totalJobs`, and `createdAt`. Admin profile objects include `fullName`, `department`, `clearanceLvl`, and `createdAt`. Password hashes are excluded. Results are ordered by descending user ID and are not paginated.

**Possible errors:** Authentication/suspension/role failures; `422` for an invalid filter; framework-generated database errors.

**Ownership and authorization:** Any admin can list every user. The response contains personal and operational fields including email, normalized phone, customer SMS preference, craftsman registration/consent values, and admin clearance data.

**Implementation:** `start/routes.ts`; `UsersController.index` in `app/controllers/users_controller.ts`; `listUsersValidator` in `app/validators/admin_user.ts`.

#### Get one user

**HTTP method:** `GET`<br>
**Full path:** `/admin/users/:id`<br>
**Route name:** `users.show`

**Purpose:** Returns one user and the matching role-specific profile relationship.

**Authentication requirement:** Required.<br>
**Required role:** Admin.

**Path parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `id` | URL string, semantically an integer | Yes | No dedicated path validator |

**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "user": {
    "id": 18,
    "email": "craftsman@example.com",
    "phoneNormalised": "+905559876543",
    "role": "craftsman",
    "status": "active",
    "createdAt": "2026-08-01T09:00:00.000Z",
    "updatedAt": null,
    "customer": null,
    "craftsman": {
      "userId": 18,
      "businessName": "Example Workshop",
      "categoryId": 4,
      "bio": "Example biography.",
      "trustLevel": 1,
      "bizRegNo": "REG-123",
      "verbalConsent": false,
      "totalJobs": 5,
      "createdAt": "2026-08-01T09:00:00.000Z"
    },
    "admin": null
  }
}
```

**Possible errors:** Authentication/suspension/role failures; `404` for an unknown user.

**Ownership and authorization:** Any admin can inspect any user, including another admin. No clearance-level restriction is enforced.

**Implementation:** `start/routes.ts`; `UsersController.show` in `app/controllers/users_controller.ts`.

#### Suspend a user

**HTTP method:** `PATCH`<br>
**Full path:** `/admin/users/:id/suspend`<br>
**Route name:** `users.suspend`

**Purpose:** Sets the target user's status to `suspended`.

**Authentication requirement:** Required.<br>
**Required role:** Admin.

**Path parameters:**

| Parameter | Type | Required | Validation rules |
|---|---|---:|---|
| `id` | URL string, semantically an integer | Yes | No dedicated path validator |

**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No application body is read; a valid CSRF token is required. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "user": {
    "id": 7,
    "email": "customer@example.com",
    "phoneNormalised": "+905551234567",
    "role": "customer",
    "status": "suspended",
    "createdAt": "2026-08-01T09:00:00.000Z",
    "updatedAt": "2026-08-02T10:00:00.000Z"
  }
}
```

This response does not preload role-specific profile relationships.

**Possible errors:** CSRF `403`; authentication/suspension/role failures; `404` for an unknown user; framework-generated database errors.

**Ownership and authorization:** Any admin may suspend any user, including themselves or another admin. There is no clearance check, suspension-reason body, separate audit operation, immediate global session revocation, unsuspend endpoint, or archive endpoint.

**Implementation:** `start/routes.ts`; `UsersController.suspend` in `app/controllers/users_controller.ts`.

### Subscriptions

#### Get the craftsman's subscription

**HTTP method:** `GET`<br>
**Full path:** `/craftsman/subscription`<br>
**Route name:** `subscriptions.show`

**Purpose:** Returns the authenticated craftsman's subscription record.

**Authentication requirement:** Required.<br>
**Required role:** Craftsman.

**Path parameters:** None.<br>
**Query parameters:** None.

**Request body:**

| Field | Type | Required | Validation rules |
|---|---|---:|---|
| — | — | No | No request body is read. |

**Successful status code:** `200 OK`

**Successful response example:**

```json
{
  "subscription": {
    "id": 9,
    "craftsmanId": 18,
    "planType": "free",
    "status": "active",
    "periodStart": "2026-08-01",
    "periodEnd": null,
    "monthlyFee": 0,
    "createdAt": "2026-08-01T09:00:00.000Z"
  }
}
```

**Possible errors:** Authentication/suspension/role failures; `404` when the craftsman has no subscription row.

**Ownership and authorization:** The query filters by the authenticated craftsman user ID.

**Implementation:** `start/routes.ts`; `SubscriptionsController.show` in `app/controllers/subscriptions_controller.ts`; `app/models/subscription.ts`.

## 7. Known Limitations and Implementation Notes

### Password-recovery delivery

The recovery-request endpoint creates a database record and returns a deliberately generic message. No email, SMS, queue, or other delivery service is implemented. The application therefore does not actually send the recovery shortcode or link.

### Refresh-token scope

The refresh-token implementation only:

- lists the authenticated user's non-revoked records; and
- marks an owned record as revoked.

It does not issue, exchange, validate, rotate, or automatically create tokens during signup/login. The application authenticates these routes with sessions, not these token records.

### Subscription scope

Implemented behavior is limited to:

- creating one free, active subscription during craftsman signup; and
- retrieving the authenticated craftsman's subscription.

Although the model/database allow paid, cancelled, and past-due states, no upgrade, cancellation, renewal, billing, payment, webhook, entitlement, or feature-gating flow is implemented.

### Missing administrative and verification flows

- Archive-user and restore-user endpoints are not implemented.
- Unsuspend/reactivate is not implemented.
- Account-verification issuance and redemption endpoints are not implemented.
- Signup creates an active user and immediately establishes a session.

### Signup form and validator mismatch

The signup HTML form currently renders `fullName`, `email`, `password`, and `passwordConfirmation`. It does not render the validator-required `phone` or `role` fields and does not provide craftsman `businessName` or `categoryId` controls. Submitting the rendered form as-is cannot satisfy the signup validator.

Craftsman-specific required fields are enforced by a generic controller error rather than conditional validation. Signup `categoryId` also lacks an existence check.

### Missing validators

- Login reads `email` and `password` directly without a dedicated validator.
- Public craftsmen `search` and `categoryId` query parameters have no dedicated validator.
- Path parameters for password recovery, refresh tokens, addresses, favorites, public craftsmen, work photos, and admin users have no dedicated format or numeric validators.

### Session and security limitations

- Password recovery does not invalidate existing sessions or refresh-token records.
- Logout ends only the current session.
- Suspending a user does not immediately revoke all sessions or token records.
- Public craftsmen endpoints do not filter suspended craftsmen.
- CSRF applies to JSON mutation requests; there is no API-route exemption or XSRF cookie.

### Ownership and data behavior

- Address updates/deletes and favorite/work-photo deletes conceal non-owned records as `404` through ownership-filtered lookups.
- Address deletion does not promote a replacement default address.
- Favorites perform an application-level duplicate check, but a concurrent duplicate can still reach the database unique constraint.
- Admin list/show responses contain personal and operational model fields. Password hashes remain hidden.
- List endpoints are not paginated.
- Work photos store remote URLs only; no upload or media validation pipeline is implemented.

### Route-name note

Most route names are inferred from controller names rather than explicitly assigned. Admin user paths therefore use route names such as `users.index`, not `admin.users.index`.
