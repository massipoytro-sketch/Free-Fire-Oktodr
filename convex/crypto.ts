export async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );

  return await crypto.subtle.importKey(
    "raw",
    material,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let value = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    value += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(value);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export async function encryptSecretValue(
  plaintext: string,
  masterSecret: string,
): Promise<{ ciphertext: string; iv: string; authTag: string }> {
  const key = await deriveAesKey(masterSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, tagLength: 128 },
      key,
      new TextEncoder().encode(plaintext),
    ),
  );

  const tagLength = 16;

  return {
    ciphertext: bytesToBase64(encrypted.slice(0, -tagLength)),
    iv: bytesToBase64(iv),
    authTag: bytesToBase64(encrypted.slice(-tagLength)),
  };
}

export async function decryptSecretValue(
  ciphertext: string,
  iv: string,
  authTag: string,
  masterSecret: string,
): Promise<string> {
  const key = await deriveAesKey(masterSecret);
  const encrypted = new Uint8Array([
    ...base64ToBytes(ciphertext),
    ...base64ToBytes(authTag),
  ]);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv), tagLength: 128 },
    key,
    encrypted,
  );

  return new TextDecoder().decode(decrypted);
}
