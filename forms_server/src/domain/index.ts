/**
 * Domain barrel export.
 */

// Entities
export type { Form } from './entities/form.js';
export type { SchemaVersion } from './entities/schema-version.js';
export type { Submission } from './entities/submission.js';
export type { UploadSession } from './entities/upload-session.js';
export type { Admin } from './entities/admin.js';
export type { Analysis } from './entities/analysis.js';
export type { ExportJob } from './entities/export-job.js';

// Schemas
export {
  FormSchemaDefinition,
  FormFieldSchema,
  FormSchemaDefinition as FormSchema,
  FieldTypeEnum,
  FieldValidationSchema,
  FieldOptionSchema,
  type FormSchemaType,
  type FormField,
  type FieldType,
} from './schemas/form-schema.js';

export {
  RequestNonceSchema,
  VerifySiWSSchema,
  CreateFormSchema,
  UpdateFormSchemaInput,
  ListFormsQuerySchema,
  CreateSubmissionSchema,
  UpdateSubmissionSchema,
  ListSubmissionsQuerySchema,
  AddAdminSchema,
  GenerateSchemaSchema,
  CreateUploadSessionSchema,
  ConfirmUploadSchema,
  FormIdParamSchema,
  SubmissionIdParamSchema,
} from './schemas/request-schemas.js';
