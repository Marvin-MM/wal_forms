import Elysia from "elysia";

const authPlugin = new Elysia({ name: 'auth' })
  .derive({ as: 'scoped' }, () => { return { auth: { wallet: '123' } } })
  .onBeforeHandle({ as: 'scoped' }, () => { });

const createFormsRoutes = () => new Elysia({ prefix: '/forms' })
  .get('/:formId', () => "forms get")
  .use(authPlugin)
  .post('/', () => "forms post")
  .put('/:formId', () => "forms put");

const createBrandingRoutes = () => new Elysia()
  .get('/forms/:formId/branding', () => "branding get")
  .use(authPlugin)
  .put('/forms/:formId/branding', () => "branding put");

const app = new Elysia()
  .use(createFormsRoutes())
  .use(createBrandingRoutes())
  .listen(5005);

console.log("Listening 5005");
