import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = "sha512";

function getEncryptionKey(): string {
  const key = process.env.API_KEY_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "API_KEY_ENCRYPTION_KEY environment variable is required for API key encryption. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return key;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
}

export function encryptSecret(plaintext: string): string {
  const password = getEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: salt:iv:tag:ciphertext (all hex-encoded)
  return [
    salt.toString("hex"),
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptSecret(encryptedPayload: string): string {
  const password = getEncryptionKey();
  const parts = encryptedPayload.split(":");

  if (parts.length !== 4) {
    // Not an encrypted value — return as-is (backward compatibility during migration)
    return encryptedPayload;
  }

  const [saltHex, ivHex, tagHex, dataHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");

  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 4 && parts.every((p) => /^[0-9a-f]+$/.test(p));
}
