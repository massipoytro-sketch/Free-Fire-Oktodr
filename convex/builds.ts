import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    projectId: v.id("projects"),
    versionId: v.optional(v.id("versions")),
    provider: v.optional(v.string()),
    command: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("builds", {
      projectId: args.projectId,
      versionId: args.versionId,
      provider: args.provider,
      command: args.command,
      status: "queued",
    });
  },
});

export const update = internalMutation({
  args: {
    id: v.id("builds"),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    externalBuildId: v.optional(v.string()),
    artifactStorageId: v.optional(v.id("_storage")),
    logsStorageId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const patch = {
      status: args.status,
      ...(args.externalBuildId !== undefined ? { externalBuildId: args.externalBuildId } : {}),
      ...(args.artifactStorageId !== undefined ? { artifactStorageId: args.artifactStorageId } : {}),
      ...(args.logsStorageId !== undefined ? { logsStorageId: args.logsStorageId } : {}),
      ...(args.error !== undefined ? { error: args.error } : {}),
      ...(args.status === "running" ? { startedAt: now } : {}),
      ...(args.status === "success" || args.status === "failed" || args.status === "cancelled"
        ? { finishedAt: now }
        : {}),
    };

    await ctx.db.patch(args.id, patch);
  },
});

export const list = internalQuery({
  args: { projectId: v.id("projects"), limit: v.optional(v.number()) },
  handler: async (ctx, { projectId, limit }) => {
    return await ctx.db
      .query("builds")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(Math.min(Math.max(limit ?? 50, 1), 100));
  },
});
