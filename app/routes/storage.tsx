import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MobileNav } from '~/components/mobile/MobileNav';

export const meta = () => [
  { title: 'DevOS Storage' },
  { name: 'description', content: 'DevOS project file and artifact storage' },
];

export default function StorageRoute() {
  const [setupToken, setSetupToken] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('Ready for large project uploads.');
  const requestUploadUrl = useAction(api.storage.requestUploadUrl);
  const finalizeUpload = useAction(api.storage.finalizeUpload);

  const upload = async () => {
    if (!file || !setupToken.trim()) {
      setStatus('Enter the setup token and choose a file.');
      return;
    }

    setStatus('Creating secure upload URL…');

    try {
      const uploadUrl = await requestUploadUrl({ setupToken: setupToken.trim() });
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
      }

      const body = (await response.json()) as { storageId: string };

      await finalizeUpload({
        setupToken: setupToken.trim(),
        storageId: body.storageId as never,
        kind: 'project_file',
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
      });

      setStatus(`Uploaded ${file.name} successfully.`);
      setFile(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed.');
    }
  };

  return (
    <main className="min-h-full bg-bolt-elements-bg-depth-1 px-4 pb-28 pt-6 text-bolt-elements-textPrimary sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-bolt-elements-borderColor bg-bolt-elements-bg-depth-2 p-5 shadow-2xl sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/15 px-3 py-1 text-xs font-semibold text-accent-300">
                <span className="i-ph:hard-drives text-sm" />
                Convex Storage
              </div>
              <h1 className="text-2xl font-bold sm:text-4xl">DevOS Storage Center</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-bolt-elements-textSecondary sm:text-base">
                Large project files, snapshots, archives, build artifacts, exports, logs and AI outputs are stored as
                Convex Storage objects while searchable metadata stays in the database.
              </p>
            </div>
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-300 sm:flex">
              <span className="i-ph:database text-2xl" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Project files', 'project_file'],
              ['Snapshots & archives', 'snapshot'],
              ['Artifacts & exports', 'build_artifact'],
            ].map(([title, value]) => (
              <div key={value} className="rounded-2xl border border-bolt-elements-borderColor bg-bolt-elements-bg-depth-1 p-4">
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-1 text-xs text-bolt-elements-textTertiary">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-bolt-elements-borderColor bg-bolt-elements-bg-depth-2 p-5 shadow-xl sm:p-8">
          <h2 className="text-lg font-bold sm:text-xl">Secure upload</h2>
          <p className="mt-1 text-sm text-bolt-elements-textSecondary">
            Files are uploaded directly to Convex Storage; the database stores only the storage reference and metadata.
          </p>

          <div className="mt-5 grid gap-3">
            <input
              type="password"
              value={setupToken}
              onChange={(event) => setSetupToken(event.target.value)}
              placeholder="DevOS setup token"
              className="w-full rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-bg-depth-1 px-4 py-3 outline-none focus:border-accent-500"
            />
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-bg-depth-1 px-3 py-3 text-sm"
            />
            <button
              type="button"
              onClick={upload}
              disabled={!file || !setupToken.trim()}
              className="min-h-12 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Upload to DevOS Storage
            </button>
            <div className="rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-bg-depth-1 px-4 py-3 text-sm text-bolt-elements-textSecondary">
              {status}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-bolt-elements-borderColor bg-bolt-elements-bg-depth-2 p-5">
            <div className="i-ph:shield-check text-2xl text-accent-400" />
            <h3 className="mt-3 font-semibold">Protected</h3>
            <p className="mt-1 text-sm leading-5 text-bolt-elements-textSecondary">
              Upload and read operations require the server-side DevOS setup token.
            </p>
          </div>
          <div className="rounded-2xl border border-bolt-elements-borderColor bg-bolt-elements-bg-depth-2 p-5">
            <div className="i-ph:stack text-2xl text-accent-400" />
            <h3 className="mt-3 font-semibold">Scalable by design</h3>
            <p className="mt-1 text-sm leading-5 text-bolt-elements-textSecondary">
              Binary data stays outside Convex documents, preventing large files from bloating query payloads.
            </p>
          </div>
        </section>
      </div>
      <MobileNav />
    </main>
  );
}
