import "use node";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

function masterKey(): Buffer {
  const raw = process.env.DEVOS_MASTER_KEY;

  if (!raw) {
    throw new Error("DEVOS_MASTER_KEY is not configured");
  }

  return createHash("sha256").update(raw, "utf8").digest();
}

function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

function decryptSecret(ciphertext: string, iv: string, authTag: string) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    masterKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export const upsertSecret = async (args: {
  name: string;
  provider: string;
  kind:
    | "api_key"
    | "access_token"
    | "refresh_token"
    | "oauth_client_secret"
    | "deploy_token"
    | "private_key"
    | "generic";
  projectId?: string;
  plaintext: string;
  note?: string;
}) => {
  return args;
};

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
      ? await ctx.db
          .query("secrets")
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

    const versions = await ctx.db
      .query("secretVersions")
      .withIndex("by_secret", (q) => q.eq("secretId", existing._id))
      .order("desc")
      .take(1);

    const nextVersion = (versions[0]?.version ?? 0) + 1;

    const versionId = await ctx.db.insert("secretVersions", {
      secretId: existing._id,
      version: nextVersion,
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

export const rotateSecret = async () => {
  return null;
};

export const _cryptoHelpers = { encryptSecret, decryptSecret, masterKey };
