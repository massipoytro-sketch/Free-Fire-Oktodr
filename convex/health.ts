import { query } from "./_generated/server";

export const status = query({
  args: {},
  handler: async () => {
    return {
      service: "devos-backend",
      status: "ok",
      model: "nvidia/nemotron-3-ultra-550b-a55b",
      storage: "convex",
    };
  },
});
