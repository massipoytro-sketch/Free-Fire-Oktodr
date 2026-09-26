import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

function requireSetupToken(token: string) {
  const expected = process.env.DEVOS_SETUP_TOKEN;

  if (!expected || token !== expected) {
    throw new Error("Invalid DevOS setup token");
  }
}

export const requestUploadUrl = action({
  args: { setupToken: v.string() },
  handler: async (ctx, args) => {
    requireSetupToken(args.setupToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerObject = internalMutation({
  args: {
    projectId: v.optional(v.id("projects")),
    versionId: v.optional(v.id("versions")),
    storageId: v.id("_storage"),
    kind: v.union(
      v.literal("project_file"),
      v.literal("snapshot"),
      v.literal("archive"),
      v.literal("build_artifact"),
      v.literal("export"),
      v.literal("log"),
      v.literal("ai_output"),
    ),
    path: v.optional(v.string()),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    sha256: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("storageObjects", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listObjects = internalQuery({
  args: {
    projectId: v.id("projects"),
    versionId: v.optional(v.id("versions")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);

    if (args.versionId) {
      return await ctx.db
        .query("storageObjects")
        .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("storageObjects")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(limit);
  },
});

export const deleteObject = internalMutation({
  args: { id: v.id("storageObjects") },
  handler: async (ctx, { id }) => {
    const object = await ctx.db.get(id);

    if (!object) {
      return;
    }

    await ctx.storage.delete(object.storageId);
    await ctx.db.delete(id);
  },
});
