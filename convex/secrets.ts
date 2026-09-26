"use node";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

function masterKey() {
  const raw = process.env.DEVOS_MASTER_KEY;
  if (!raw) throw new Error("DEVOS_MASTER_KEY is not configured");
  return createHash("sha256").update(raw, "utf8").digest();
}

function encryptSecret(plaintext: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptSecret(ciphertext: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export const upsertSecret = internalAction({
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
    plaintext: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"secrets">> => {
    const encrypted = encryptSecret(args.plaintext);
    return await ctx.runMutation(internal.secretStore.storeEncrypted, {
      name: args.name,
      provider: args.provider,
      kind: args.kind,
      projectId: args.projectId,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      note: args.note,
    });
  },
});

export const readSecret = internalAction({
  args: { secretId: v.id("secrets") },
  handler: async (ctx, { secretId }): Promise<string> => {
    const secret = await ctx.runQuery(internal.secretStore.getCurrent, { secretId });
    if (!secret) throw new Error("Secret not found");
    return decryptSecret(secret.ciphertext, secret.iv, secret.authTag);
  },
});
