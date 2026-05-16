/**
 * Forms routes: CRUD operations.
 */
import Elysia from 'elysia';
import { CreateFormSchema, UpdateFormSchemaInput, ListFormsQuerySchema, FormIdParamSchema } from '../../domain/schemas/request-schemas.js';
import { createForm, getForm, updateFormSchema, listForms, deleteForm, type FormDeps } from '../../application/forms/index.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';

export function createFormsRoutes(jwtService: JwtService, deps: FormDeps) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia({ prefix: '/forms' })
    // Public: get form by ID
    .get('/:formId', async ({ params }) => {
      const { formId } = FormIdParamSchema.parse(params);
      const form = await getForm(formId, deps);
      return successResponse(form);
    })
    // Protected routes
    .use(authPlugin)
    .post('/', async (ctx) => {
      const parsed = CreateFormSchema.parse(ctx.body);
      const form = await createForm(parsed, ctx.auth.wallet, deps);
      return successResponse(form);
    })
    .get('/', async (ctx) => {
      const query = ListFormsQuerySchema.parse(ctx.query);
      const result = await listForms(ctx.auth.wallet, query.page, query.pageSize, deps);
      return successResponse(result);
    })
    .put('/:formId', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const parsed = UpdateFormSchemaInput.parse(ctx.body);
      const form = await updateFormSchema(formId, parsed, ctx.auth.wallet, deps);
      return successResponse(form);
    })
    .delete('/:formId', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      await deleteForm(formId, ctx.auth.wallet, deps);
      return successResponse({ message: 'Form deleted' });
    });
}
