# Email & Phone Verification System

## Overview
A complete email and phone verification system with:
- Email validation (proper email format)
- Phone validation (international E.164 format)
- 6-digit verification codes
- 10-minute expiration
- Rate limiting (5 attempts max)
- Secure code generation

## Files Created

### 1. Database Migration
**File:** `database/migrations/1790000001400_create_verification_codes_table.ts`

Creates `verification_codes` table with:
- `id` - Primary key
- `user_id` - Foreign key to users
- `type` - 'email' or 'phone'
- `code` - 6-digit code
- `target` - Email or phone number to verify
- `is_verified` - Boolean flag
- `attempts` - Number of failed attempts
- `expires_at` - Expiration timestamp
- `verified_at` - When it was verified
- Indexes on user_id, type, and expires_at

### 2. Model
**File:** `app/models/verification_code.ts`

Lucid ORM model with:
- `VerificationType` enum ('email' | 'phone')
- Relationships to User model
- Type-safe columns

### 3. Validators
**File:** `app/validators/verification.ts`

Three validators:
- `sendEmailVerificationValidator` - Validates email format (RFC 5322)
- `sendPhoneVerificationValidator` - Validates phone (E.164 format: +1234567890)
- `verifyCodeValidator` - Validates 6-digit code

### 4. Service
**File:** `app/services/verification_service.ts`

Static methods:
- `generateCode()` - Generates secure 6-digit code
- `sendEmailVerification(user, email)` - Creates and sends email code
- `sendPhoneVerification(user, phone)` - Creates and sends phone code
- `verifyCode(user, type, code)` - Validates code with:
  - Expiration check
  - Duplicate use prevention
  - Attempt limiting
  - Code validation
- `getActiveCode(user, type)` - Retrieves active code

### 5. Controller
**File:** `app/controllers/verification_controller.ts`

Endpoints:

#### Public (Guest) Endpoints:
- `POST /api/verification/send-email-code`
  - Body: `{ email: string }`
  - Returns: Success message
  - Security: Doesn't reveal if email exists

- `POST /api/verification/send-phone-code`
  - Body: `{ phone: string }`
  - Returns: Success message
  - Security: Doesn't reveal if phone exists

#### Protected (Authenticated) Endpoints:
- `POST /api/verification/verify-email`
  - Body: `{ code: string }`
  - Returns: Success message
  - Requires: Authentication

- `POST /api/verification/verify-phone`
  - Body: `{ code: string }`
  - Returns: Success message
  - Requires: Authentication

## API Usage Examples

### 1. Send Email Verification Code (Guest)
```bash
POST /api/verification/send-email-code
Content-Type: application/json

{
  "email": "user@example.com"
}

Response:
{
  "message": "If an account with this email exists, a verification code has been sent"
}
```

### 2. Send Phone Verification Code (Guest)
```bash
POST /api/verification/send-phone-code
Content-Type: application/json

{
  "phone": "+14155552671"
}

Response:
{
  "message": "If an account with this phone exists, a verification code has been sent"
}
```

### 3. Verify Email Code (Authenticated)
```bash
POST /api/verification/verify-email
Content-Type: application/json
Authorization: Bearer <token>

{
  "code": "123456"
}

Response:
{
  "message": "Email verified successfully"
}
```

### 4. Verify Phone Code (Authenticated)
```bash
POST /api/verification/verify-phone
Content-Type: application/json
Authorization: Bearer <token>

{
  "code": "123456"
}

Response:
{
  "message": "Phone verified successfully"
}
```

## Phone Number Format
The system validates phone numbers using E.164 format:
- Valid: `+14155552671` (US)
- Valid: `+442071838750` (UK)
- Valid: `+33123456789` (France)
- Invalid: `123456789` (no country code)
- Invalid: `+1` (incomplete)

## Email Validation
Standard RFC 5322 email validation:
- Valid: `user@example.com`
- Valid: `john.doe+tag@example.co.uk`
- Invalid: `user@` (no domain)
- Invalid: `@example.com` (no local part)

## Security Features

1. **Code Generation**: Uses `randomBytes()` for cryptographically secure random codes
2. **Expiration**: Codes expire after 10 minutes
3. **Attempt Limiting**: Maximum 5 failed attempts before code invalidation
4. **One-time Use**: Verified codes cannot be reused
5. **Privacy**: Doesn't reveal if email/phone exists (prevents user enumeration)
6. **Validation**: Strict input validation on email and phone format

## Integration with Email/SMS Services

To integrate with real email and SMS services, update the service file:

### For Email (using Adonis Mail):
```typescript
// In VerificationService.sendEmailVerification()
await mail.send(new VerificationCodeEmail(email, code))
```

### For SMS (using Twilio):
```typescript
// In VerificationService.sendPhoneVerification()
import twilio from 'twilio'
const client = twilio(accountSid, authToken)
await client.messages.create({
  body: `Your verification code is: ${code}`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: phone,
})
```

## Database Setup

Run the migration:
```bash
node ace migration:run
```

## Testing

### Test with cURL:
```bash
# Send email code
curl -X POST http://localhost:3333/api/verification/send-email-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Verify with code (need auth token first)
curl -X POST http://localhost:3333/api/verification/verify-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{"code":"123456"}'
```

## Notes

- Development logging: Check console for generated codes
- Codes are stored in database for verification
- Each user can have one active code per type (email/phone)
- Previous codes for same type are automatically deleted
