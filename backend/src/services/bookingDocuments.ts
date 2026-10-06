import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

export interface EncryptedDocument {
  encryptedContent: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export const getDocumentEncryptionKey = (): Buffer => {
  const configuredKey = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!configuredKey || !/^[0-9a-f]{64}$/i.test(configuredKey)) {
    throw new Error(
      "DOCUMENT_ENCRYPTION_KEY must be configured as 64 hexadecimal characters before document storage is enabled."
    );
  }
  return Buffer.from(configuredKey, "hex");
};

export const encryptBookingDocument = (
  content: Buffer,
  key: Buffer
): EncryptedDocument => {
  if (key.length !== 32) {
    throw new Error("Document encryption key must be exactly 32 bytes.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encryptedContent = Buffer.concat([
    cipher.update(content),
    cipher.final(),
  ]);
  return {
    encryptedContent,
    iv,
    authTag: cipher.getAuthTag(),
  };
};

export const decryptBookingDocument = (
  encryptedContent: Buffer,
  iv: Buffer,
  authTag: Buffer,
  key: Buffer
): Buffer => {
  if (key.length !== 32) {
    throw new Error("Document encryption key must be exactly 32 bytes.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encryptedContent),
    decipher.final(),
  ]);
};
