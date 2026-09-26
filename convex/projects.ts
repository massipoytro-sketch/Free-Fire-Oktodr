import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    repository: v.optional(v.string()),
    defaultBranch: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("projects", {
      slug: args.slug,
      name: args.name,
      description: args.description,
      repository: args.repository,
      defaultBranch: args.defaultBranch ?? "main",
      status: "active",
      nextVersionNumber: 1,
      metadata: args.metadata,
    });
  },
});

export const getBySlug = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const list = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(Math.min(Math.max(limit ?? 50, 1), 100));
  },
});
