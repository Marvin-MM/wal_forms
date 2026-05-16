import Elysia from "elysia";

const app1 = new Elysia({ prefix: '/forms' })
  .get('/:id', () => "form by id");

const app2 = new Elysia({ prefix: '/forms' })
  .get('/:id/branding', () => "form branding");

const main = new Elysia()
  .use(app1)
  .use(app2)
  .listen(5001);

console.log("Server listening");
