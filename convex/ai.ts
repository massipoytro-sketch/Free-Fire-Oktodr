import { action, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { decryptSecretValue } from "./crypto";

const MODEL = "nvidia/nemotron-3-ultra-550b-a55b";
const ENDPOINT = "https://openrouter.ai/api/v1";

function requireSetupToken(token: string) {
  const expected = process.env.DEVOS_SETUP_TOKEN;
  if (!expected || token !== expected) {
    throw new Error("Invalid DevOS setup token");
  }
}

async function loadApiKey(ctx: any): Promise<string> {
  const connection = await ctx.runQuery(internal.aiStore.get, {});

  if (!connection) {
    throw new Error("OpenRouter is not configured");
  }

  const secret = await ctx.runQuery(internal.secretStore.getCurrent, {
    secretId: connection.secretId,
  });

  if (!secret) {
    throw new Error("OpenRouter secret is missing");
  }

  const master = process.env.DEVOS_MASTER_KEY;

  if (!master) {
    throw new Error("DEVOS_MASTER_KEY is not configured");
  }

  return await decryptSecretValue(
    secret.ciphertext,
    secret.iv,
    secret.authTag,
    master,
  );
}

export const status = query({
  args: {},
  handler: async (ctx) => {
    const connection = await ctx.db
      .query("aiConnections")
      .withIndex("by_provider", (q) => q.eq("provider", "openrouter"))
      .unique();

    if (!connection) {
      return {
        provider: "openrouter",
        model: MODEL,
        configured: false,
        status: "not_configured",
        keyHint: null,
        lastTestedAt: null,
        lastError: null,
      } as const;
    }

    return {
      provider: connection.provider,
      model: connection.model,
      configured: true,
      status: connection.status,
      keyHint: connection.keyHint ?? null,
      lastTestedAt: connection.lastTestedAt ?? null,
      lastError: connection.lastError ?? null,
    };
  },
});

export const saveOpenRouterKey = action({
  args: {
    setupToken: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    requireSetupToken(args.setupToken);

    const apiKey = args.apiKey.trim();

    if (apiKey.length < 10) {
      throw new Error("OpenRouter API key is too short");
    }

    const secretId = await ctx.runAction(internal.secrets.upsertSecret, {
      name: "OPENROUTER_API_KEY",
      provider: "openrouter",
      kind: "api_key",
      plaintext: apiKey,
    });

    const keyHint = `••••••••${apiKey.slice(-4)}`;

    await ctx.runMutation(internal.aiStore.upsert, {
      secretId,
      keyHint,
    });

    return {
      ok: true,
      provider: "openrouter",
      model: MODEL,
      keyHint,
    };
  },
});

export const testConnection = action({
  args: { setupToken: v.string() },
  handler: async (ctx, args) => {
    requireSetupToken(args.setupToken);
    const apiKey = await loadApiKey(ctx);

    const response = await fetch(`${ENDPOINT}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const body = await response.text();
      await ctx.runMutation(internal.aiStore.setTestResult, {
        status: "error",
        lastTestedAt: Date.now(),
        lastError: body.slice(0, 500),
      });
      throw new Error(`OpenRouter validation failed (${response.status})`);
    }

    await ctx.runMutation(internal.aiStore.setTestResult, {
      status: "configured",
      lastTestedAt: Date.now(),
    });

    return { ok: true, provider: "openrouter", model: MODEL };
  },
});
