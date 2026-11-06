import path from "node:path";

import { defineConfig } from "orval";

/**
 * Single source of truth for codegen: the vendored snapshot of the backend
 * contract. Refresh it with `pnpm contract:sync`, then run `pnpm codegen`.
 * `CONTRACT_SPEC_PATH` is only for explicitly testing another backend checkout.
 */
const inputTarget = process.env.CONTRACT_SPEC_PATH
  ? path.resolve(process.env.CONTRACT_SPEC_PATH)
  : path.resolve(process.cwd(), "openapi/openapi.json");

export default defineConfig({
  mobile: {
    input: {
      target: inputTarget,
    },
    output: {
      mode: "tags-split",
      target: "src/shared/api/gen/index.ts",
      schemas: "src/shared/api/gen/model",
      client: "fetch",
      clean: true,
      override: {
        mutator: {
          path: "./src/shared/api/orval-mutator.ts",
          name: "mobileMutator",
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
