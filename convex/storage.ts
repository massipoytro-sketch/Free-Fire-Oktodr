import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

function requireSetupToken(token: string) {
  const expected = process.env.DEVOS_SETUP_TOKEN;

  if (!expected || token !== expected) {
    throw new Error("Invalid DevOS setup token");
  }
}

const storageKind = v.union(
  v.literal("project_file"),
  v.literal("snapshot"),
  v.literal("archive"),
  v.literal("build_artifact"),
  v.literal("export"),
  v.literal("log"),
  v.literal("ai_output"),
);

export const requestUploadUrl = action({
  args: { setupToken: v.string() },
  handler: async (ctx, args) => {
    requireSetupToken(args.setupToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeUpload = action({
  args: {
    setupToken: v.string(),
    projectId: v.optional(v.id("projects")),
    versionId: v.optional(v.id("versions")),
    storageId: v.id("_storage"),
    kind: storageKind,
    path: v.optional(v.string()),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireSetupToken(args.setupToken);

    const stored = await ctx.runQuery(internal.storage.getStoredMetadata, {
      storageId: args.storageId,
    });

    if (!stored) {
      throw new Error("Uploaded object was not found");
    }

    return await ctx.runMutation(internal.storage.registerObject, {
      projectId: args.projectId,
      versionId: args.versionId,
      storageId: args.storageId,
      kind: args.kind,
      path: args.path,
      fileName: args.fileName,
      contentType: args.contentType ?? stored.contentType ?? undefined,
      sizeBytes: stored.size,
      sha256: stored.sha256,
      metadata: args.metadata,
    });
  },
});

export const getObjectUrl = query({
  args: {
    setupToken: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    requireSetupToken(args.setupToken);
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getStoredMetadata = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.db.system.get(storageId);
  },
});

export const registerObject = internalMutation({
  args: {
    projectId: v.optional(v.id("projects")),
    versionId: v.optional(v.id("versions")),
    storageId: v.id("_storage"),
    kind: storageKind,
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
