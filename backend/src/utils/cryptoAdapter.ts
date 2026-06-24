async function deriveKey(password: string, salt: Uint8Array, iterations: number, keyLength: number): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, keyLength * 8);
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const derivedBits = await deriveKey(password, salt, 100000, 32);
  return { hash: toBase64(derivedBits), salt: toBase64(salt) };
}

export async function verifyPassword(password: string, hashBase64: string, saltBase64: string): Promise<boolean> {
  const salt = fromBase64(saltBase64);
  const derivedBits = await deriveKey(password, salt, 100000, 32);
  const computed = toBase64(derivedBits);
  if (computed.length !== hashBase64.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) result |= computed.charCodeAt(i) ^ hashBase64.charCodeAt(i);
  return result === 0;
}

async function deriveAESKey(masterKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(masterKey), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('smart-learn-encryption-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptApiKey(plaintext: string, masterKey: string): Promise<{ encrypted: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAESKey(masterKey);
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  return { encrypted: toBase64(encrypted), iv: toBase64(iv) };
}

export async function decryptApiKey(encryptedBase64: string, ivBase64: string, masterKey: string): Promise<string> {
  const iv = fromBase64(ivBase64);
  const key = await deriveAESKey(masterKey);
  const encrypted = fromBase64(encryptedBase64);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}