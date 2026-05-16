/**
 * Form Branding Domain Entity
 *
 * Defines visual customization for a form's public page.
 * Custom CSS is explicitly excluded — it's a phishing/XSS risk.
 * Arbitrary font loading is also excluded — privacy + performance risk.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Curated font allowlist
// ---------------------------------------------------------------------------
export const ALLOWED_FONT_FAMILIES = [
  'Inter',
  'Roboto',
  'Outfit',
  'Space Grotesk',
  'DM Sans',
  'Lato',
  'Nunito',
  'Open Sans',
  'Poppins',
  'Source Sans 3',
  'Merriweather',
] as const;

export type AllowedFontFamily = (typeof ALLOWED_FONT_FAMILIES)[number];

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/** Validates 3-digit and 6-digit hex color strings including the # prefix. */
const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color (e.g. #fff or #3b82f6)')
  .nullable()
  .optional();

const fontFamilySchema = z
  .enum(ALLOWED_FONT_FAMILIES)
  .nullable()
  .optional();

// ---------------------------------------------------------------------------
// Entity Schema
// ---------------------------------------------------------------------------
export const FormBrandingSchema = z.object({
  formId: z.string().uuid(),
  /** Walrus blob ID of the logo image (null if not set). */
  logoWalrusBlobId: z.string().max(255).nullable().optional(),
  accentColor: hexColorSchema,
  backgroundColor: hexColorSchema,
  fontFamily: fontFamilySchema,
  /** Text shown on the submit button. Max 50 chars. */
  submitButtonText: z.string().max(50).nullable().optional(),
  /** Message shown after submission. Max 500 chars. */
  thankYouMessage: z.string().max(500).nullable().optional(),
  /** Whether to display the WalrusForms powered-by badge. */
  showWalrusFormsBranding: z.boolean().default(true),
});

export type FormBranding = z.infer<typeof FormBrandingSchema>;

/** Schema for the API request body (excludes formId — taken from route param). */
export const UpsertFormBrandingBodySchema = FormBrandingSchema.omit({ formId: true });
export type UpsertFormBrandingBody = z.infer<typeof UpsertFormBrandingBodySchema>;

/** MIME types allowed for branding logo uploads. */
export const BRANDING_LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const;

/** Max file size for branding logo: 2 MB. */
export const BRANDING_LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024;
