import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { decryptSecretValue, encryptSecretValue } from "./crypto";

function masterSecret(): string {
  const value = process.env.DEVOS_MASTER_KEY;
  if (!value) {
    throw new Error("DEVOS_MASTER_KEY is not configured");
  }
  return value;
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
  handler: async (ctx, args) => {
    const encrypted = await encryptSecretValue(args.plaintext, masterSecret());

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

    if (!secret) {
      throw new Error("Secret not found");
    }

    return await decryptSecretValue(
      secret.ciphertext,
      secret.iv,
      secret.authTag,
      masterSecret(),
    );
  },
});
