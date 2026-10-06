import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import {
  decryptBookingDocument,
  encryptBookingDocument,
} from "../src/services/bookingDocuments.js";

test("booking documents are encrypted and authenticated", () => {
  const key = randomBytes(32);
  const content = Buffer.from("private identity document");
  const encrypted = encryptBookingDocument(content, key);

  assert.notDeepEqual(encrypted.encryptedContent, content);
  assert.deepEqual(
    decryptBookingDocument(
      encrypted.encryptedContent,
      encrypted.iv,
      encrypted.authTag,
      key
    ),
    content
  );

  const tampered = Buffer.from(encrypted.encryptedContent);
  tampered[0] ^= 1;
  assert.throws(() =>
    decryptBookingDocument(tampered, encrypted.iv, encrypted.authTag, key)
  );
});
