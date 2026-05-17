import { z } from "zod";
const S1 = z.object({ foo: z.string().nullish().transform(v => v ?? undefined) });
type T1 = z.infer<typeof S1>;
// can we omit foo?
const a: T1 = {};
console.log(S1.parse({ foo: null }));
console.log(S1.parse({ foo: "hello" }));
console.log(S1.parse({ }));
