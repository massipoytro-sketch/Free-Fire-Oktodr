import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    projectId: v.id("projects"),
    versionId: v.optional(v.id("versions")),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("deployments", {
      projectId: args.projectId,
      versionId: args.versionId,
      provider: args.provider,
      status: "queued",
    });
  },
});

export const update = internalMutation({
  args: {
    id: v.id("deployments"),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    externalDeploymentId: v.optional(v.string()),
    url: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      externalDeploymentId: args.externalDeploymentId,
      url: args.url,
      error: args.error,
      ...(args.status === "running" ? { startedAt: now } : {}),
      ...(args.status === "success" || args.status === "failed" || args.status === "cancelled"
        ? { finishedAt: now }
        : {}),
    });
  },
});

export const list = internalQuery({
  args: { projectId: v.id("projects"), limit: v.optional(v.number()) },
  handler: async (ctx, { projectId, limit }) => {
    return await ctx.db
      .query("deployments")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(Math.min(Math.max(limit ?? 50, 1), 100));
  },
});
