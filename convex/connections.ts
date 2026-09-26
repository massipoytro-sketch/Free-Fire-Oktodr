import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const upsert = internalMutation({
  args: {
    provider: v.string(),
    displayName: v.string(),
    authType: v.union(
      v.literal("api_key"),
      v.literal("oauth"),
      v.literal("token"),
      v.literal("basic"),
      v.literal("service_account"),
    ),
    projectId: v.optional(v.id("projects")),
    secretId: v.optional(v.id("secrets")),
    externalAccountId: v.optional(v.string()),
    metadata: v.optional(v.string()),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = args.projectId
      ? await ctx.db
          .query("connections")
          .withIndex("by_project_and_provider", (q) =>
            q.eq("projectId", args.projectId).eq("provider", args.provider),
          )
          .unique()
      : null;

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        authType: args.authType,
        secretId: args.secretId,
        externalAccountId: args.externalAccountId,
        metadata: args.metadata,
        enabled: args.enabled,
      });
      return existing._id;
    }

    return await ctx.db.insert("connections", {
      provider: args.provider,
      displayName: args.displayName,
      authType: args.authType,
      projectId: args.projectId,
      secretId: args.secretId,
      externalAccountId: args.externalAccountId,
      metadata: args.metadata,
      enabled: args.enabled,
    });
  },
});

export const list = internalQuery({
  args: {
    projectId: v.optional(v.id("projects")),
    provider: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);

    if (args.projectId) {
      return await ctx.db
        .query("connections")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .take(limit);
    }

    const provider = args.provider;

    if (provider) {
      return await ctx.db
        .query("connections")
        .withIndex("by_provider", (q) => q.eq("provider", provider))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("connections").order("desc").take(limit);
  },
});

export const markValidated = internalMutation({
  args: { id: v.id("connections") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { lastValidatedAt: Date.now() });
  },
});
