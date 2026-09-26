import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const get = internalQuery({
  args: {},
  handler: async (ctx) =>
    await ctx.db
      .query("aiConnections")
      .withIndex("by_provider", (q) => q.eq("provider", "openrouter"))
      .unique(),
});

export const upsert = internalMutation({
  args: {
    secretId: v.id("secrets"),
    keyHint: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiConnections")
      .withIndex("by_provider", (q) => q.eq("provider", "openrouter"))
      .unique();

    const data = {
      provider: "openrouter" as const,
      model: "nvidia/nemotron-3-ultra-550b-a55b",
      secretId: args.secretId,
      enabled: true,
      keyHint: args.keyHint,
      status: "configured" as const,
      endpoint: "https://openrouter.ai/api/v1",
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...data,
        lastError: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("aiConnections", data);
  },
});

export const setTestResult = internalMutation({
  args: {
    status: v.union(v.literal("configured"), v.literal("error")),
    lastTestedAt: v.number(),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiConnections")
      .withIndex("by_provider", (q) => q.eq("provider", "openrouter"))
      .unique();

    if (!existing) {
      throw new Error("OpenRouter connection is not configured");
    }

    const patch = {
      status: args.status,
      lastTestedAt: args.lastTestedAt,
      ...(args.lastError !== undefined ? { lastError: args.lastError } : {}),
    };

    await ctx.db.patch(existing._id, patch);
  },
});
