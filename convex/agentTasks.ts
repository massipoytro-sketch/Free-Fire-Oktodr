import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    projectId: v.optional(v.id("projects")),
    type: v.union(
      v.literal("plan"),
      v.literal("code"),
      v.literal("test"),
      v.literal("build"),
      v.literal("deploy"),
      v.literal("repair"),
      v.literal("sync"),
      v.literal("maintenance"),
    ),
    title: v.string(),
    inputJson: v.optional(v.string()),
    parentTaskId: v.optional(v.id("agentTasks")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentTasks", {
      projectId: args.projectId,
      type: args.type,
      status: "queued",
      title: args.title,
      inputJson: args.inputJson,
      parentTaskId: args.parentTaskId,
      createdAt: Date.now(),
    });
  },
});

export const update = internalMutation({
  args: {
    id: v.id("agentTasks"),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("blocked"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    outputJson: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      outputJson: args.outputJson,
      error: args.error,
      ...(args.status === "running" ? { startedAt: now } : {}),
      ...(args.status === "success" || args.status === "failed" || args.status === "cancelled"
        ? { finishedAt: now }
        : {}),
    });
  },
});

export const list = internalQuery({
  args: { projectId: v.optional(v.id("projects")), limit: v.optional(v.number()) },
  handler: async (ctx, { projectId, limit }) => {
    const size = Math.min(Math.max(limit ?? 100, 1), 200);

    if (projectId) {
      return await ctx.db
        .query("agentTasks")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .order("desc")
        .take(size);
    }

    return await ctx.db.query("agentTasks").order("desc").take(size);
  },
});
