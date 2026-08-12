# NEXIVA — Branding & White-Label Transformation

## Role

You are a senior full-stack engineer, product designer, UI/UX engineer, and SaaS architecture specialist.

You are working on an existing ISP Management System.

Your task is to transform the current application branding into a professional, modern, enterprise-grade platform called:

# NEXIVA

**by NexGenBot**

**Next Infrastructure, Visibility & Automation**

Do NOT blindly rewrite the application. First inspect the existing codebase, architecture, database schema, authentication flow, routing, layouts, components, assets, environment variables, and existing branding implementation.

Preserve all existing functionality unless a change is explicitly required for the new branding architecture.

---

# 1. Core Branding Concept

NEXIVA is the technology platform / engine developed by NexGenBot.

NEXIVA provides ISP companies with an integrated platform covering:

* Customer self-registration
* Internet package management
* Customer management
* Billing
* Payment management
* Complaint / ticket management
* Customer active/offline monitoring
* PPPoE management
* MikroTik integration
* OLT integration
* ONU management
* GIS
* ODP / infrastructure mapping
* Network monitoring
* Provisioning
* Dashboard and analytics

The important architectural concept is:

```text
NexGenBot
    │
    └── NEXIVA
          │
          ├── ISP / Company A
          ├── ISP / Company B
          ├── ISP / Company C
          └── ISP / Company D
```

NEXIVA is therefore a multi-tenant / white-label platform.

---

# 2. VERY IMPORTANT: White-Label Branding

Do NOT make "NEXIVA" the only visible brand throughout the customer-facing application.

Each ISP/company that uses the platform must be able to configure its own identity.

Example:

```text
NEXIVA
    │
    ├── Tenant: PT Jaringanku Sarana Nusantara
    │       Brand: Jaringanku
    │       Logo: custom logo
    │       Primary Color: custom
    │       Secondary Color: custom
    │       Favicon: custom
    │       Contact Information: custom
    │
    └── Tenant: Example ISP
            Brand: ExampleNet
            Logo: custom logo
            ...
```

The end customer should primarily see the ISP's branding, NOT the internal NEXIVA branding.

For example:

```text
JARINGANKU
Internet Service Provider

Customer Portal
Login
Register
Check Package
Billing
Complaints
```

NEXIVA should operate as the underlying technology platform.

---

# 3. Branding Hierarchy

Implement a clear branding hierarchy:

## Platform Brand

```text
NEXIVA
by NexGenBot
Next Infrastructure, Visibility & Automation
```

This is the platform identity.

It may appear in:

* Super Admin dashboard
* Platform administration
* System information
* Footer / technology attribution
* Documentation
* Internal platform settings

## Tenant Brand

Each ISP/company can configure:

* Company name
* Brand name
* Logo
* Favicon
* Primary color
* Secondary color
* Accent color
* Login page branding
* Customer portal branding
* Email branding
* Invoice branding
* PDF branding
* WhatsApp/message branding where applicable
* Contact information
* Address
* Website
* Support contact

Tenant branding must take precedence over the NEXIVA branding on tenant-facing pages.

---

# 4. Multi-Tenant Branding Architecture

Before modifying the UI, inspect the existing database.

If a tenant/company/organization model already exists, reuse it.

If it does not exist, design a proper tenant/company entity.

Recommended conceptual structure:

```text
organizations
    id
    name
    legal_name
    brand_name
    slug
    logo
    favicon
    primary_color
    secondary_color
    accent_color
    website
    email
    phone
    address
    support_email
    support_phone
    created_at
    updated_at
```

If the current architecture uses another name such as:

* companies
* tenants
* businesses
* providers
* organizations

reuse the existing architecture rather than introducing unnecessary duplicate concepts.

Every tenant-specific entity should be associated with the appropriate tenant/company scope where required.

Do NOT break the existing data model.

---

# 5. Centralized State Store for Branding

To avoid duplicate API calls and scattered states, we implement a centralized Zustand branding store (`useBrandingStore.ts`) that manages the fetching and caching of dynamic public configurations. This store fetches data from the public endpoint `/api/v1/configs/public`, runs on initial application mount, and shares the values globally.

### Store Schema

```typescript
export interface BrandingConfig {
  brandName: string;
  brandLogoUrl: string;
  brandFooterTagline: string;
  brandFooterCopyright: string;
  websiteHeroTitle: string;
  websiteHeroSubtitle: string;
  websiteContactPhone: string;
  websiteContactEmail: string;
  websiteAddress: string;
  brandPrimaryColor: string;    // HEX string (e.g. "#2563eb")
  brandSecondaryColor: string;  // HEX string
  brandAccentColor: string;     // HEX string
}

interface BrandingStore {
  config: BrandingConfig | null;
  isLoading: boolean;
  fetchConfig: () => Promise<void>;
}
```

Components consume branding attributes via:
```typescript
const brandName = useBrandingStore((s) => s.config?.brandName || 'NEXIVA');
```

---

# 6. Dynamic HSL Variable Injection

Because the project uses Tailwind CSS and shadcn/ui configured with HSL variables (e.g., `hsl(var(--primary))`), tenant HEX colors must be dynamically converted to raw HSL values and injected into the document root element (`:root`).

### Hex to HSL Conversion

Hex colors must be parsed into their component H, S, L parts and formatted as `H S% L%` (e.g. `221.2 83.2% 53.3%`) without the `hsl(...)` function wrapper:

```typescript
export function hexToHslString(hex: string): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
```

### Applying Variables to the DOM

Once the configuration is fetched, the HSL strings are applied directly to `document.documentElement` styles:

```typescript
export function applyTenantTheme(config: BrandingConfig) {
  const root = document.documentElement;
  
  if (config.brandPrimaryColor) {
    const primaryHsl = hexToHslString(config.brandPrimaryColor);
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--ring', primaryHsl);
  }
  if (config.brandSecondaryColor) {
    const secondaryHsl = hexToHslString(config.brandSecondaryColor);
    root.style.setProperty('--secondary', secondaryHsl);
  }
}
```

---

# 7. Login Page

The login page must dynamically display the current tenant's identity.

For example:

```text
[ ISP LOGO ]

Welcome Back

Login to your customer portal

Email
Password

[ Login ]

Need help?
Contact Support
```

Do not automatically display:

```text
NEXIVA
```

as the main logo on a tenant's customer login page.

Instead:

```text
[ Tenant Logo ]
Tenant Brand Name
```

NEXIVA can optionally appear as a subtle technology attribution:

```text
Powered by NEXIVA
```

or:

```text
Technology by NEXIVA
```

depending on the configured white-label level.

---

# 8. Super Admin vs Tenant Admin

Create a clear distinction.

## NEXIVA Super Admin

The platform owner can manage:

* Tenants
* Companies
* Subscriptions
* Platform configuration
* Global settings
* Tenant branding
* Integrations
* System health
* Platform analytics

The Super Admin interface may use:

```text
NEXIVA
by NexGenBot
```

## Tenant Admin

The ISP/company administrator sees:

```text
[Their Logo]
[Their Brand]
```

Their dashboard should feel like their own ISP management system.

---

# 9. Tenant Branding Settings

Create or update a tenant settings page.

Recommended sections:

## Identity

* Legal Company Name
* Brand Name
* Logo
* Favicon
* Website

## Appearance

* Primary Color
* Secondary Color
* Accent Color
* Light/Dark preference if supported

## Contact

* Email
* Phone
* WhatsApp
* Address
* Customer Support

## Customer Portal

* Login page logo
* Login page title
* Login page description
* Footer text
* Support information

## Documents

* Invoice logo
* Invoice company information
* PDF footer
* Billing identity

Provide a live preview where practical.

---

# 10. Domain / Subdomain Architecture

Prepare the architecture for future custom domains.

Examples:

```text
customer.isp-example.com
portal.isp-example.com
billing.isp-example.com
```

or:

```text
isp-example.nexiva.app
```

The tenant should be resolvable from:

```text
domain
subdomain
tenant slug
```

Do not necessarily implement full custom-domain infrastructure if it is outside the current project scope, but structure the application so this can be added later without rewriting the branding architecture.

---

# 11. URL / Tenant Resolution (Client-Side Initialization)

To decouple layout logic and avoid passing tenant information down manually, resolution is handled at the root level of the application using a layout applier component (`ThemeApplier` or a dedicated initialization hook).

### Initial Resolution Flow

```typescript
// Inside the root ThemeApplier / Initialization hook
useEffect(() => {
  async function resolveTenantAndBranding() {
    // 1. Fetch public configurations
    await fetchConfig();
    
    // 2. Apply theme colors dynamically to document root
    if (config) {
      applyTenantTheme(config);
      
      // 3. Update Browser Metadata (Title, Favicon)
      document.title = `${config.brandName} - Portal Pelanggan`;
      if (config.brandLogoUrl) {
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (favicon) {
          favicon.href = config.brandLogoUrl;
        }
      }
    }
  }
  resolveTenantAndBranding();
}, []);
```

# 12. NEXIVA Branding

Replace the old generic/system branding with:

# NEXIVA

### by NexGenBot

**Next Infrastructure, Visibility & Automation**

The visual identity should feel:

* Modern
* Professional
* Enterprise
* Technological
* Clean
* Trustworthy
* Infrastructure-oriented

Avoid:

* Generic AI-looking gradients
* Excessive glassmorphism
* Overly colorful dashboards
* Excessive animations
* Unnecessary glowing effects
* Template-like SaaS visuals
* Random decorative elements

The UI should look like a serious commercial ISP operations platform.

---

# 13. Logo Usage

Do not assume a logo asset already exists.

Inspect the current assets first.

If the project already contains a logo system, adapt it.

Use semantic components such as:

```text
<PlatformLogo />
<TenantLogo />
<BrandLogo />
```

or the equivalent architecture.

The application should be able to switch between:

```text
NEXIVA logo
```

and:

```text
Tenant logo
```

without modifying individual pages.

---

# 14. Browser Metadata

Make browser metadata tenant-aware where technically possible.

Support:

```text
<title>{Tenant Brand} — Customer Portal</title>
```

instead of always:

```text
NEXIVA
```

For platform administration:

```text
NEXIVA — Platform Administration
```

Also support tenant-specific:

* favicon
* meta title
* meta description
* Open Graph image where appropriate

---

# 15. Invoice / Billing Branding

Invoices and billing documents must use the tenant identity.

Example:

```text
[JARINGANKU LOGO]

PT Jaringanku Sarana Nusantara

INVOICE
INV-2026-000123

Customer
Package
Billing Period
Amount
Due Date

--------------------------------

Thank you for choosing Jaringanku.
```

Do not make NEXIVA the primary invoice identity.

NEXIVA may only appear as a small technology attribution if the white-label configuration allows it.

---

# 16. Customer-Facing Pages

Review all customer-facing pages and replace hard-coded platform branding.

This includes:

* Login
* Registration
* Dashboard
* Package list
* Package details
* Billing
* Invoice
* Payment
* Complaint
* Ticket
* Profile
* Service status
* Network status
* Customer information
* Public landing page
* Error pages
* Email templates
* Notification templates

The customer should feel that they are interacting directly with their ISP.

---

# 17. Public Landing Page

Prepare the system so the tenant can have a branded public landing page.

Example:

```text
[JARINGANKU LOGO]

Internet Cepat untuk Rumah dan Bisnis

Paket Internet
Coverage
Tentang Kami
Bantuan

[ Daftar Sekarang ]
```

The underlying platform should remain NEXIVA.

---

# 18. Tenant Isolation

Branding must never leak between tenants.

For example:

Tenant A must NEVER see:

* Tenant B logo
* Tenant B company name
* Tenant B colors
* Tenant B billing information
* Tenant B customer information

This is a critical multi-tenant requirement.

Review authorization, data filtering, middleware, queries, and API responses.

Do not only hide UI elements.

Tenant isolation must exist at the data/application layer.

---

# 19. Existing Functionality

Do not remove or break:

* Authentication
* Authorization
* Customer management
* Billing
* Package management
* Payment
* Ticketing
* MikroTik integration
* OLT integration
* GIS
* Monitoring
* Provisioning
* Existing API integrations

First understand how the existing system works.

Then implement branding around the existing architecture.

---

# 20. Code Quality

Follow existing project conventions.

Avoid:

* unnecessary dependencies
* unnecessary database migrations
* duplicated components
* duplicated CSS
* hard-coded tenant IDs
* hard-coded branding
* hard-coded colors
* hard-coded company information

Create reusable abstractions.

Prefer:

```text
BrandingService
TenantContext
TenantProvider
ThemeProvider
TenantLogo
PlatformLogo
```

or equivalent patterns appropriate to the current stack.

---

# 21. Search the Entire Codebase

Before finishing, search for old branding strings.

Look for:

* old application name
* old logo paths
* old company names
* hard-coded titles
* hard-coded footer text
* hard-coded colors
* old favicon
* old metadata
* old login branding
* old invoice branding

Replace only where appropriate.

Do not blindly replace strings that belong to business/domain terminology.

---

# 22. Design Direction

NEXIVA should visually communicate:

```text
Connectivity
Infrastructure
Intelligence
Automation
Visibility
Reliability
```

The visual language should be:

* Clean
* Precise
* Technical
* Modern
* Enterprise
* Minimal
* Data-oriented

Think of the quality level of a professional network operations SaaS rather than a generic admin template.

---

# 23. Final Branding Model

The final architecture should conceptually be:

```text
                    NEXGENBOT
                 Technology Company
                         │
                         ▼
                      NEXIVA
       Next Infrastructure, Visibility & Automation
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       ISP A           ISP B          ISP C
          │              │              │
       Brand A         Brand B        Brand C
          │              │              │
       Customers       Customers      Customers
```

The most important principle:

> **NEXIVA is the platform. The ISP is the brand experienced by the end customer.**

---

# 24. Expected Result

After implementation, I should be able to:

1. Create a tenant/company.
2. Configure its legal name.
3. Configure its brand name.
4. Upload its logo.
5. Configure favicon.
6. Configure primary/secondary/accent colors.
7. Configure support/contact information.
8. Open the tenant's customer portal.
9. See the tenant's branding automatically applied.
10. Login as that tenant's customer.
11. See the tenant's branding throughout the customer experience.
12. Generate an invoice with tenant branding.
13. Switch to another tenant and see a completely different brand.
14. Login to NEXIVA Super Admin and see NEXIVA branding.

---

# 25. Important Development Process

Before modifying anything:

### Step 1

Inspect the entire project architecture.

### Step 2

Identify:

* framework
* database
* authentication
* tenant/company model
* layouts
* theme system
* API architecture
* asset management
* document generation
* email/notification system

### Step 3

Create a short implementation plan based on the actual codebase.

### Step 4

Implement the branding architecture.

### Step 5

Implement NEXIVA branding.

### Step 6

Implement tenant/white-label branding.

### Step 7

Update customer-facing pages.

### Step 8

Test tenant isolation.

### Step 9

Test responsive behavior.

### Step 10

Run existing tests/build/lint/type checks.

### Step 11

Fix any regressions.

Do not stop after changing the logo.

The goal is a complete, consistent, production-ready branding architecture.

---

# Final Principle

Do not treat this as a simple rebranding task.

Treat it as the foundation for a **multi-tenant, white-label ISP SaaS platform**.

The product identity is:

> **NEXIVA**

> **by NexGenBot**

> **Next Infrastructure, Visibility & Automation**

while every ISP/customer company can maintain its own identity on top of the platform.
