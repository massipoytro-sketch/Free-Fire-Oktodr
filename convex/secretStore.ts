import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const storeEncrypted = internalMutation({
  args: {
    name: v.string(),
    provider: v.string(),
    kind: v.union(
      v.literal("api_key"),
      v.literal("access_token"),
      v.literal("refresh_token"),
      v.literal("oauth_client_secret"),
      v.literal("deploy_token"),
      v.literal("private_key"),
      v.literal("generic"),
    ),
    projectId: v.optional(v.id("projects")),
    ciphertext: v.string(),
    iv: v.string(),
    authTag: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = args.projectId
      ? await ctx.db.query("secrets")
          .withIndex("by_project_and_name", (q) =>
            q.eq("projectId", args.projectId).eq("name", args.name),
          )
          .unique()
      : null;

    if (!existing) {
      const secretId = await ctx.db.insert("secrets", {
        name: args.name,
        provider: args.provider,
        kind: args.kind,
        projectId: args.projectId,
        enabled: true,
      });

      const versionId = await ctx.db.insert("secretVersions", {
        secretId,
        version: 1,
        algorithm: "AES-256-GCM",
        ciphertext: args.ciphertext,
        iv: args.iv,
        authTag: args.authTag,
        createdAt: Date.now(),
        note: args.note,
      });

      await ctx.db.patch(secretId, { currentVersionId: versionId });
      return secretId;
    }

    const versions = await ctx.db.query("secretVersions")
      .withIndex("by_secret", (q) => q.eq("secretId", existing._id))
      .order("desc")
      .take(1);

    const version = (versions[0]?.version ?? 0) + 1;
    const versionId = await ctx.db.insert("secretVersions", {
      secretId: existing._id,
      version,
      algorithm: "AES-256-GCM",
      ciphertext: args.ciphertext,
      iv: args.iv,
      authTag: args.authTag,
      createdAt: Date.now(),
      note: args.note,
    });

    await ctx.db.patch(existing._id, {
      provider: args.provider,
      kind: args.kind,
      enabled: true,
      currentVersionId: versionId,
    });

    return existing._id;
  },
});

export const getCurrent = internalQuery({
  args: { secretId: v.id("secrets") },
  handler: async (ctx, { secretId }) => {
    const secret = await ctx.db.get(secretId);
    if (!secret?.currentVersionId) return null;

    const version = await ctx.db.get(secret.currentVersionId);
    if (!version) return null;

    return {
      secretId,
      version: version.version,
      ciphertext: version.ciphertext,
      iv: version.iv,
      authTag: version.authTag,
    };
  },
});

export const listMetadata = internalQuery({
  args: {
    projectId: v.optional(v.id("projects")),
    provider: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);

    if (args.projectId) {
      return await ctx.db.query("secrets")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .take(limit);
    }

    if (args.provider) {
      return await ctx.db.query("secrets")
        .withIndex("by_provider", (q) => q.eq("provider", args.provider))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("secrets").order("desc").take(limit);
  },
});

export const disable = internalMutation({
  args: { secretId: v.id("secrets") },
  handler: async (ctx, { secretId }) => {
    await ctx.db.patch(secretId, { enabled: false });
  },
});
