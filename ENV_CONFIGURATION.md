# Environment Configuration Guide

This document explains how to configure environment variables for local development and production deployment.

## IMPORTANT: Configuration Requirements

⚠️ **The following environment variables MUST be configured in `.env` files. The application will throw an error if they are missing:**

- `APP_URL` - Web application URL (used in emails and redirects)
- `API_BASE_URL` - API server URL (used in email verification links)

These must be set to actual production URLs when deploying to production.

## Overview

The application consists of multiple services that need proper URL configuration:
- **Web App** (Next.js): Frontend application
- **API Server** (Node.js): Backend API and email service
- **Email Verification**: Links generated in emails must use correct URLs

## Environment Variables

### Web Application (`apps/web/.env.local`)

```env
# Frontend URL (used for OG images and social sharing)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API endpoint
NEXT_PUBLIC_API_URL=http://localhost:4000

# CMS URL (if applicable)
NEXT_PUBLIC_CMS_URL=http://localhost:1337
```

**For Production:**
```env
NEXT_PUBLIC_APP_URL=https://sewa-innovation-challenge.wb.gov.in
NEXT_PUBLIC_API_URL=https://api.sewa-innovation-challenge.wb.gov.in
NEXT_PUBLIC_CMS_URL=https://cms.sewa-innovation-challenge.wb.gov.in
```

### API Server (`apps/api/.env`)

```env
# Server port and host
PORT=4000
HOST=0.0.0.0

# Critical: These URLs are REQUIRED and must be configured
# Application will throw an error if missing
APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000

# CORS configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inno_challenge
DB_USER=postgres
DB_PASSWORD=postgres

# JWT configuration
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# SMTP configuration (for sending emails)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
MAIL_FROM_NAME=Sewa First Innovation Challenge
MAIL_FROM_EMAIL=noreply@example.com

# Email verification token lifetime
EMAIL_VERIFICATION_TOKEN_TTL_MINUTES=1440
```

**For Production:**
```env
PORT=4000
HOST=0.0.0.0

# These MUST match your production domains - APPLICATION WILL ERROR IF MISSING
APP_URL=https://sewa-innovation-challenge.wb.gov.in
API_BASE_URL=https://api.sewa-innovation-challenge.wb.gov.in

# Update for production origins
CORS_ORIGINS=https://sewa-innovation-challenge.wb.gov.in

# Production database
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_NAME=production_db
DB_USER=prod_user
DB_PASSWORD=strong_password

# Secure JWT secret
JWT_SECRET=your-very-secure-random-secret-key

# Production SMTP
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=production-email@example.com
SMTP_PASS=production-password
```

## Email Verification Flow

The email verification process works as follows:

1. **User registers** → Backend generates verification token
2. **Email sent** with verification link:
   ```
   ${API_BASE_URL}/api/v1/registrations/verify-email?token=XXX&locale=en&applicationId=123
   ```
3. **User clicks link** → Browser sends request to backend
4. **Token verified** → Backend redirects to:
   ```
   ${APP_URL}/en/register?emailVerified=1&applicationId=123&participantId=456&applicationNumber=ABC123
   ```

### Critical Configuration Points

⚠️ **Important**: For email links to work correctly:

- `API_BASE_URL` must be the public URL of your API server
- `APP_URL` must be the public URL of your web application
- Both must be accessible from the user's browser
- Links will be sent in emails, so they must be externally reachable

## Team Member Email Flow

When a team lead adds team members to their application:

1. **Team lead submits application** with team member emails
2. **Email sent** to each team member containing:
   ```
   Portal URL: ${APP_URL}
   ```
3. **Team member clicks link** → Opens main portal page
4. **Team member can** register, login, and access applications

## Environment Variable Resolution

The application uses the following precedence for URL configuration:

**Web App (Next.js):**
```javascript
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sewa-innovation-challenge.wb.gov.in";
const ogImageUrl = `${siteUrl}/images/og-image.jpg`;
```

**API Server (Node.js):**
```javascript
function getApiBaseUrl() {
  const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("API base URL must be configured...");
  }
  return apiUrl.replace(/\/+$/, "");
}

function getAppBaseUrl() {
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("App base URL must be configured...");
  }
  return appUrl.replace(/\/+$/, "");
}

function getPortalUrl() {
  const portalUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!portalUrl) {
    throw new Error("Portal URL must be configured...");
  }
  return portalUrl.replace(/\/$/, "");
}
```

**Key Points:**
- ✅ No hardcoded fallback URLs in production
- ✅ Application will error if required environment variables are missing
- ✅ Ensures proper URLs are used in all environments
- ⚠️ Missing configuration will be caught immediately at runtime

## Deployment Checklist

### CRITICAL - Must be configured (application will error if missing):
- [ ] Set `APP_URL` in `apps/api/.env` to production web URL (e.g., https://sewa-innovation-challenge.wb.gov.in)
- [ ] Set `API_BASE_URL` in `apps/api/.env` to production API URL (e.g., https://api.sewa-innovation-challenge.wb.gov.in)

### Important - Should be configured for production:
- [ ] Set `NEXT_PUBLIC_APP_URL` in `apps/web/.env.local` to production web URL
- [ ] Set `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` to production API URL
- [ ] Update `CORS_ORIGINS` in `apps/api/.env` to production domain
- [ ] Update `SMTP_*` variables with production email credentials
- [ ] Update `JWT_SECRET` with a secure random string

### Testing:
- [ ] Test email verification links work with production URLs
- [ ] Verify OG images display correctly on social media
- [ ] Test team member emails include correct portal URL
- [ ] Verify all email links are clickable and lead to correct URLs

## Testing Email Verification

To test the email verification flow:

1. Start the API server with correct `API_BASE_URL` and `APP_URL`
2. Start the web app with correct `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_URL`
3. Register a user with a test email address
4. Check the email for the verification link
5. Verify the URL contains the correct domain (not `localhost`)
6. Click the link and verify it redirects correctly

## Common Issues

### Issue: Email links show `http://localhost:4000` in production

**Cause:** `API_BASE_URL` not set in production environment

**Solution:** Set `API_BASE_URL=https://api.your-domain.com` in `apps/api/.env`

**Error Message:** 
```
Error: API base URL must be configured. Set either API_BASE_URL or NEXT_PUBLIC_API_URL in .env file
```

### Issue: OG images show wrong path

**Cause:** `NEXT_PUBLIC_APP_URL` not set in production

**Solution:** Set `NEXT_PUBLIC_APP_URL=https://your-domain.com` in `apps/web/.env.local`

### Issue: CORS errors when submitting forms

**Cause:** `CORS_ORIGINS` doesn't match the frontend URL

**Solution:** Update `CORS_ORIGINS` in `apps/api/.env` to include the production domain

### Issue: Team member emails show incorrect portal URL

**Cause:** `APP_URL` not configured in `apps/api/.env`

**Solution:** Set `APP_URL=https://sewa-innovation-challenge.wb.gov.in` in `apps/api/.env`

**Error Message:**
```
Error: Portal URL must be configured. Set either APP_URL or NEXT_PUBLIC_APP_URL in .env file
```

### Issue: Application crashes with "URL must be configured"

**Cause:** Required environment variables are missing

**Solution:** Ensure both `APP_URL` and `API_BASE_URL` are set in `apps/api/.env`

## Security Notes

- Never commit `.env` files to version control
- Use `.env.example` as a template for configuration
- Always use HTTPS URLs in production
- Ensure `JWT_SECRET` is a strong random string
- Rotate `SMTP_PASS` and `JWT_SECRET` regularly in production
