import { Schema } from "effect";

const schema = Schema.BigInt;

const result = Schema.decodeUnknownSync(schema)(null, { disableChecks: true });
console.log(result);
