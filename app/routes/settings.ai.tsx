import { useState } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

export default function AiSettings() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl font-bold">DevOS AI Connection</h1>
        <p className="mt-2 text-zinc-400">
          OpenRouter · NVIDIA Nemotron 3 Ultra
        </p>
        <ClientOnly fallback={<p className="mt-8 text-zinc-400">Loading…</p>}>
          {() =>
            convexUrl ? (
              <AiSettingsClient />
            ) : (
              <section className="mt-8 rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
                <h2 className="font-semibold">Convex is not connected</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Set VITE_CONVEX_URL in the deployment environment first.
                </p>
              </section>
            )
          }
        </ClientOnly>
      </div>
    </main>
  );
}

function AiSettingsClient() {
  const status = useQuery(api.ai.status, {});
  const save = useAction(api.ai.saveOpenRouterKey);
  const test = useAction(api.ai.testConnection);
  const [setupToken, setSetupToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function saveKey() {
    setWorking(true);
    setMessage(null);

    try {
      const result = await save({ setupToken, apiKey });
      setApiKey("");
      setMessage(`Saved ${result.keyHint}. Model: ${result.model}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save key");
    } finally {
      setWorking(false);
    }
  }

  async function testConnection() {
    setWorking(true);
    setMessage(null);

    try {
      const result = await test({ setupToken });
      setMessage(`Connection OK: ${result.model}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection test failed");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mt-8 space-y-5">
      <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">AI connection</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {status === undefined
                ? "Checking…"
                : status.configured
                  ? `Configured · ${status.keyHint}`
                  : "Not configured"}
            </p>
          </div>
          <span className="rounded-full border border-zinc-600 px-3 py-1 text-xs">
            {status?.status ?? "loading"}
          </span>
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          Model: {status?.model ?? "nvidia/nemotron-3-ultra-550b-a55b"}
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
        <h2 className="font-semibold">OpenRouter API key</h2>
        <div className="mt-4 space-y-3">
          <input
            value={setupToken}
            onChange={(e) => setSetupToken(e.target.value)}
            type="password"
            placeholder="DevOS setup token"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
          />
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            placeholder="OpenRouter API key"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveKey}
              disabled={working || !setupToken || !apiKey}
              className="rounded-xl bg-violet-600 px-4 py-3 font-semibold disabled:opacity-40"
            >
              Save encrypted key
            </button>
            <button
              type="button"
              onClick={testConnection}
              disabled={working || !setupToken || !status?.configured}
              className="rounded-xl border border-zinc-600 px-4 py-3 font-semibold disabled:opacity-40"
            >
              Test connection
            </button>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm">
          {message}
        </div>
      )}

      <p className="text-xs leading-5 text-zinc-500">
        The key is never returned by the status query. DevOS stores only its encrypted
        value and a masked hint.
      </p>
    </div>
  );
}
