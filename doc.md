🔹 Complete Development Roadmap for AegisVault
________________________________________
Frontend (React + Vite + TS + Tailwind)
Core Layout
•	DashboardLayout.tsx → Sidebar + Topbar wrapper
•	Sidebar.tsx → Nav links (Vault, Inheritance, Search, Audit, Settings)
•	Topbar.tsx → Tenant logo + user profile dropdown
Auth & Onboarding
•	LoginPage.tsx
o	Email/password login
o	WebAuthn login button
•	RegisterPage.tsx
o	Email/password signup
o	Setup WebAuthn MFA
o	Recovery kit download button
•	AuthForm.tsx (shared component)
•	WebAuthnButton.tsx (handles biometric login)
Vault
•	VaultPage.tsx → list of vault items (docs, secrets)
•	ItemCard.tsx → displays name, type, tags, last modified
•	UploadModal.tsx → upload new file (client-side encryption before upload)
•	SecureReveal.tsx → blur/tap-to-reveal for secrets, copy-once timer
Inheritance
•	InheritancePage.tsx → create/manage inheritance plans
•	PlanForm.tsx → form to configure trustees, beneficiaries, k-of-n, waiting period
•	PlanCard.tsx → active plans with status + trustee approvals
OCR/AI (Document Processing)
•	OCRPreview.tsx → show extracted OCR text (toggle)
•	TagChips.tsx → auto-generated tags (e.g., Insurance, Property)
•	RedactionSuggestion.tsx → sensitive data highlights with redact button
Search & Retrieval
•	SearchPage.tsx → search interface
•	SearchBar.tsx → input with encrypted metadata search
•	Filters.tsx → filter by type, date, tag
•	SecureViewer.tsx → decrypted document viewer with protections
Audit & Compliance
•	AuditPage.tsx → list of immutable audit logs
•	AuditTable.tsx → table view
•	ExportButton.tsx → export CSV/PDF
Settings
•	SettingsPage.tsx → manage profile + preferences
•	ProfileForm.tsx → change password/passphrase, enable MFA
•	NotificationPreferences.tsx → email, SMS, push toggle
________________________________________
Backend (Node.js + Express.js + Postgres + MinIO)
Auth Service
•	Endpoints:
o	POST /auth/register → create user (Argon2id hashed password)
o	POST /auth/login → return JWT + refresh token
o	POST /auth/webauthn/register → register MFA device
o	POST /auth/webauthn/verify → login with MFA
•	Middleware:
o	JWT validation
o	Role-based access control (owner, trustee, beneficiary, admin)
Tenant Service
•	Endpoints:
o	POST /tenants → create tenant
o	GET /tenants/:id → fetch tenant branding/policies
•	Middleware:
o	Tenant isolation (scopes requests by tenantId)
Vault Service
•	Endpoints:
o	POST /items → create item metadata + presigned MinIO URL
o	GET /items/:id → fetch item metadata
o	POST /items/:id/versions → upload new version
•	Middleware:
o	Validate client-encrypted CEK exists before accepting upload
o	Ensure user has vault access rights
Inheritance Service
•	Endpoints:
o	POST /plans → create inheritance plan (trustees, beneficiaries, k, n)
o	POST /plans/:id/approve → trustee approves release
o	POST /plans/:id/trigger → trigger inheritance (manual/dead-man switch)
•	Middleware:
o	Verify k-of-n trustee approvals before release
o	Handle waiting period (delayed release)
OCR Service
•	Endpoints:
o	POST /ocr → accept encrypted doc, run OCR, return encrypted OCR text
•	Middleware:
o	Only allow OCR requests with encrypted payloads
o	Return encrypted results (never plaintext)
Audit Service
•	Endpoints:
o	POST /audit → log an action
o	GET /audit/:vaultId → fetch logs for vault
•	Middleware:
o	Hash-chained immutable logging (prevHash validation)
Notification Service
•	Endpoints:
o	POST /notify → send email/SMS/push notification
•	Middleware:
o	Throttle notifications (prevent spam)
________________________________________
Middleware / Glue Code
These sit between frontend & backend to enforce rules:
•	Auth Middleware
o	Validates JWT
o	Checks roles (owner, trustee, beneficiary, admin)
•	Tenant Isolation Middleware
o	Ensures requests are scoped by tenantId
•	Encryption Middleware (Client-Side)
o	VMK derived using Argon2id
o	CEKs generated per item (AES-GCM)
o	CEKs wrapped with VMK before upload
•	SSS Middleware (Frontend)
o	Shamir’s Secret Sharing → split/reconstruct recovery/inheritance keys
•	Secure Upload Middleware (Vault Service)
o	Generate presigned MinIO URLs
o	Validate encrypted CEK attached
•	Audit Logging Middleware
o	Every action triggers audit-service entry
o	Hash-chained logs
________________________________________
Infrastructure
•	Postgres → metadata (users, tenants, items, inheritance plans, audit logs)
•	MinIO → encrypted blobs (documents, secrets, versions)
•	Docker Compose → runs Postgres + MinIO + backend services
________________________________________
🔹 Development Flow
1.	Start with Frontend Skeleton (all pages/components, dummy data).
2.	Build Auth + Tenant Service → connect login/register + branding.
3.	Build Vault Service → connect upload/encrypt/decrypt in frontend.
4.	Add Inheritance Service → trustee/beneficiary workflows.
5.	Add OCR Integration → auto-tagging + redaction.
6.	Add Search & Audit → compliance features.
7.	Add Notifications → email/SMS/push alerts.
8.	Test full flow → owner uploads → trustee approves → beneficiary retrieves.
________________________________________
🔹 AegisVault Task Checklist for Cursor
________________________________________
Phase 1 – Project Setup
✅ Goal: Create skeleton structure, infra ready.
Task 1 – Initialize project
Prompt:
Create a monorepo with two folders: frontend (React + Vite + TypeScript + Tailwind) and backend (Node.js + Express + TypeScript). Add a root docker-compose.yml with services for Postgres and MinIO.
Task 2 – Configure Docker Compose
Prompt:
Write a docker-compose.yml that runs Postgres (user: admin, pass: admin123, db: aegisvault) and MinIO (user: admin, pass: admin123) with exposed ports.
________________________________________
Phase 2 – Frontend Skeleton
✅ Goal: Build full UI structure (empty pages, routing).
Task 3 – Create base layout
Prompt:
In the frontend, generate a dashboard layout with sidebar and topbar. Sidebar links: Vault, Inheritance, Search, Audit, Settings. Topbar shows tenant logo and profile dropdown.
Task 4 – Add pages
Prompt:
Add pages in frontend: Login, Register, Vault, Inheritance, Search, Audit, Settings. Wire them up with React Router. Each page should have placeholder content.
Task 5 – Add auth UI
Prompt:
Build LoginPage and RegisterPage with email/password fields. Include a button for WebAuthn login/registration. Add a button to download a recovery kit (placeholder now).
________________________________________
Phase 3 – Backend Auth & Tenant Service
✅ Goal: Secure onboarding + multi-tenant.
Task 6 – Auth service
Prompt:
In backend/auth-service, implement Express APIs:
•	POST /auth/register (Argon2id hash password, create user in Postgres).
•	POST /auth/login (verify password, return JWT + refresh token).
•	POST /auth/webauthn/register (store MFA credential).
•	POST /auth/webauthn/verify (login with MFA).
Task 7 – Tenant service
Prompt:
In backend/tenant-service, implement APIs:
•	POST /tenants → create tenant with name, domain, branding.
•	GET /tenants/:id → fetch tenant data.
Add Postgres models for Tenant and User.
Task 8 – Connect frontend auth
Prompt:
Update LoginPage and RegisterPage to call backend APIs. On successful login, store JWT in local storage and show the dashboard.
________________________________________
Phase 4 – Vault Service
✅ Goal: Upload and store encrypted files.
Task 9 – Vault service
Prompt:
In backend/vault-service, implement APIs:
•	POST /items → create item metadata and return presigned MinIO URL.
•	GET /items/:id → fetch metadata.
•	POST /items/:id/versions → upload new version.
Use Postgres for metadata and MinIO for file storage.
Task 10 – Client-side crypto
Prompt:
In frontend, add utilities to:
•	Derive a Vault Master Key (VMK) from passphrase using Argon2id.
•	Generate random Content Encryption Keys (CEKs).
•	Encrypt files with AES-GCM before uploading.
•	Encrypt CEK with VMK and send to backend.
Task 11 – Vault UI
Prompt:
In VaultPage, show a list of uploaded items with type, tags, last modified. Add an UploadModal that encrypts and uploads a file. Add a SecureReveal component for secrets with blur/tap-to-reveal.
________________________________________
Phase 5 – Inheritance Service
✅ Goal: Trustee/beneficiary workflows.
Task 12 – Inheritance service
Prompt:
In backend/inheritance-service, implement APIs:
•	POST /plans → create inheritance plan with trustees, beneficiaries, k-of-n, waiting period.
•	POST /plans/:id/approve → trustee approves release.
•	POST /plans/:id/trigger → trigger inheritance flow.
Task 13 – Shamir’s Secret Sharing
Prompt:
In frontend, implement key splitting/assembling using Shamir’s Secret Sharing (secrets.js). Trustees get encrypted shares. Beneficiaries assemble shares locally to decrypt CEKs.
Task 14 – Inheritance UI
Prompt:
In InheritancePage, add PlanForm to create a plan (select trustees/beneficiaries, k-of-n threshold, waiting period, items). Show active plans with approval status in PlanCard.
________________________________________
Phase 6 – OCR & AI
✅ Goal: Auto-tagging and sensitive data detection.
Task 15 – OCR service
Prompt:
In backend/ocr-service, implement POST /ocr that accepts an encrypted blob, decrypts, runs Tesseract.js OCR, and returns encrypted text.
Task 16 – OCR frontend
Prompt:
In upload flow, use Tesseract.js in browser first. If unavailable, call backend OCR. Show OCR text in OCRPreview, auto-tags in TagChips, and sensitive highlights in RedactionSuggestion.
________________________________________
Phase 7 – Search & Retrieval
✅ Goal: Metadata search + secure viewer.
Task 17 – Search API
Prompt:
Extend vault-service to support encrypted metadata search (type, tag, sensitivity) using Postgres.
Task 18 – Search frontend
Prompt:
In SearchPage, add SearchBar, Filters, and show results as ItemCards. Add SecureViewer to decrypt and view documents with protections (disable copy/save).
________________________________________
Phase 8 – Audit & Compliance
✅ Goal: Immutable logs.
Task 19 – Audit service
Prompt:
In backend/audit-service, implement:
•	POST /audit → log action (hash-chained).
•	GET /audit/:vaultId → fetch logs.
Task 20 – Audit frontend
Prompt:
In AuditPage, display logs in AuditTable. Add an ExportButton to download CSV/PDF.
________________________________________
Phase 9 – Notifications
✅ Goal: Alerts for trustees, owners, beneficiaries.
Task 21 – Notification service
Prompt:
In backend/notification-service, implement POST /notify. Support email (nodemailer), SMS (Twilio), and push (Firebase).
Task 22 – Notification frontend
Prompt:
In SettingsPage, add NotificationPreferences with toggles for Email, SMS, Push.
________________________________________
Phase 10 – Testing & Hardening
✅ Goal: Security & reliability.
Task 23 – Unit tests
Prompt:
Add Jest tests for:
•	VMK derivation (Argon2id).
•	CEK encryption/decryption.
•	Shamir’s Secret Sharing.
•	Upload → OCR → search flow.
Task 24 – Security middleware
Prompt:
Add Express middleware for:
•	JWT validation.
•	Role-based access (owner, trustee, beneficiary, admin).
•	Tenant isolation (scope by tenantId).
•	Request validation (using zod or joi).
________________________________________
✅ That’s the complete step-by-step checklist.
If you go through it in Cursor, you’ll end up with:
•	A React dashboard frontend (all pages + UI).
•	A modular backend with all services (auth, vault, inheritance, OCR, audit, notifications).
•	Middleware to glue it all securely.
•	Postgres + MinIO infra in Docker.
________________________________________

