import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    projectId: v.id("projects"),
    label: v.optional(v.string()),
    commitSha: v.optional(v.string()),
    manifestJson: v.optional(v.string()),
    snapshotStorageId: v.optional(v.id("_storage")),
    sizeBytes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    const number = project.nextVersionNumber;
    const versionId = await ctx.db.insert("versions", {
      projectId: args.projectId,
      number,
      label: args.label,
      status: "draft",
      commitSha: args.commitSha,
      manifestJson: args.manifestJson,
      snapshotStorageId: args.snapshotStorageId,
      sizeBytes: args.sizeBytes,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.projectId, {
      nextVersionNumber: number + 1,
      currentVersionId: versionId,
    });

    return versionId;
  },
});

export const list = internalQuery({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("versions")
      .withIndex("by_project_and_number", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(Math.min(Math.max(args.limit ?? 50, 1), 100));
  },
});

export const markCurrent = internalMutation({
  args: { versionId: v.id("versions") },
  handler: async (ctx, { versionId }) => {
    const version = await ctx.db.get(versionId);

    if (!version) {
      throw new Error("Version not found");
    }

    const current = await ctx.db
      .query("versions")
      .withIndex("by_project_and_status", (q) =>
        q.eq("projectId", version.projectId).eq("status", "current"),
      )
      .take(100);

    for (const item of current) {
      await ctx.db.patch(item._id, { status: "ready" });
    }

    await ctx.db.patch(versionId, { status: "current" });
    await ctx.db.patch(version.projectId, { currentVersionId: versionId });
  },
});
