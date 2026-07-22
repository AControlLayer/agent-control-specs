import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";
import {
  BasicConstraintsExtension,
  cryptoProvider,
  KeyUsageFlags,
  KeyUsagesExtension,
  X509Certificate,
  X509CertificateGenerator,
} from "@peculiar/x509";
import { verifyCertificateSignatureChain } from "./lib/validators/aip-signature.mjs";

cryptoProvider.set(webcrypto);

const algorithm = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
  publicExponent: new Uint8Array([1, 0, 1]),
  modulusLength: 2048,
};

async function certificatePair({ expired = false } = {}) {
  const issuerKeys = await webcrypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  const leafKeys = await webcrypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  const now = Date.now();
  const issuer = await X509CertificateGenerator.createSelfSigned({
    serialNumber: "1",
    name: "CN=Test Issuer",
    notBefore: new Date(now - 60_000),
    notAfter: new Date(now + 3_600_000),
    signingAlgorithm: algorithm,
    keys: issuerKeys,
    extensions: [
      new BasicConstraintsExtension(true, undefined, true),
      new KeyUsagesExtension(KeyUsageFlags.keyCertSign, true),
    ],
  });
  const leaf = await X509CertificateGenerator.create({
    serialNumber: "2",
    subject: "CN=Test Leaf",
    issuer: issuer.subject,
    notBefore: expired ? new Date(now - 120_000) : new Date(now - 60_000),
    notAfter: expired ? new Date(now - 60_000) : new Date(now + 60_000),
    signingAlgorithm: algorithm,
    publicKey: leafKeys.publicKey,
    signingKey: issuerKeys.privateKey,
  });
  return { issuer, leaf };
}

async function certificateWithIssuerConstraints({ ca, keyCertSign }) {
  const issuerKeys = await webcrypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  const leafKeys = await webcrypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  const now = Date.now();
  const issuer = await X509CertificateGenerator.createSelfSigned({
    name: "CN=Constrained Issuer",
    notBefore: new Date(now - 60_000),
    notAfter: new Date(now + 3_600_000),
    signingAlgorithm: algorithm,
    keys: issuerKeys,
    extensions: [
      new BasicConstraintsExtension(ca, undefined, true),
      new KeyUsagesExtension(
        keyCertSign ? KeyUsageFlags.keyCertSign : KeyUsageFlags.digitalSignature,
        true,
      ),
    ],
  });
  const leaf = await X509CertificateGenerator.create({
    subject: "CN=Leaf",
    issuer: issuer.subject,
    notBefore: new Date(now - 60_000),
    notAfter: new Date(now + 60_000),
    signingAlgorithm: algorithm,
    publicKey: leafKeys.publicKey,
    signingKey: issuerKeys.privateKey,
  });
  return { issuer, leaf };
}

async function partialChain({ rootPathLength = 1 } = {}) {
  const rootKeys = await webcrypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  const intermediateKeys = await webcrypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  const leafKeys = await webcrypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  const now = Date.now();
  const root = await X509CertificateGenerator.createSelfSigned({
    name: "CN=Root",
    notBefore: new Date(now - 60_000),
    notAfter: new Date(now + 3_600_000),
    signingAlgorithm: algorithm,
    keys: rootKeys,
    extensions: [new BasicConstraintsExtension(true, rootPathLength, true), new KeyUsagesExtension(KeyUsageFlags.keyCertSign, true)],
  });
  const intermediate = await X509CertificateGenerator.create({
    subject: "CN=Intermediate",
    issuer: root.subject,
    notBefore: new Date(now - 60_000),
    notAfter: new Date(now + 1_800_000),
    signingAlgorithm: algorithm,
    publicKey: intermediateKeys.publicKey,
    signingKey: rootKeys.privateKey,
    extensions: [new BasicConstraintsExtension(true, 0, true), new KeyUsagesExtension(KeyUsageFlags.keyCertSign, true)],
  });
  const leaf = await X509CertificateGenerator.create({
    subject: "CN=Leaf",
    issuer: intermediate.subject,
    notBefore: new Date(now - 60_000),
    notAfter: new Date(now + 60_000),
    signingAlgorithm: algorithm,
    publicKey: leafKeys.publicKey,
    signingKey: intermediateKeys.privateKey,
  });
  return { root, intermediate, leaf };
}

test("accepts a current leaf signed by the supplied issuer without claiming anchor trust", async () => {
  const { issuer, leaf } = await certificatePair();
  const result = await verifyCertificateSignatureChain(leaf, [issuer]);
  assert.equal(result.verified, true);
  assert.equal(result.anchorTrusted, false);
});

test("rejects a leaf when the supplied issuer is wrong", async () => {
  const [{ leaf }, { issuer: wrongIssuer }] = await Promise.all([
    certificatePair(),
    certificatePair(),
  ]);
  assert.equal((await verifyCertificateSignatureChain(leaf, [wrongIssuer])).verified, false);
});

test("rejects a certificate whose signed bytes were tampered", async () => {
  const { issuer, leaf } = await certificatePair();
  const tampered = new Uint8Array(leaf.rawData);
  tampered[tampered.length - 1] ^= 1;
  const tamperedLeaf = new X509Certificate(tampered);
  assert.equal((await verifyCertificateSignatureChain(tamperedLeaf, [issuer])).verified, false);
});

test("rejects an expired leaf even when its signature is correct", async () => {
  const { issuer, leaf } = await certificatePair({ expired: true });
  assert.equal((await verifyCertificateSignatureChain(leaf, [issuer])).verified, false);
});

test("rejects a linked intermediate when the terminal root is omitted", async () => {
  const { intermediate, leaf } = await partialChain();
  assert.equal((await verifyCertificateSignatureChain(leaf, [intermediate])).verified, false);
});

test("rejects a complete chain that exceeds the root pathLength constraint", async () => {
  const { root, intermediate, leaf } = await partialChain({ rootPathLength: 0 });
  assert.equal(
    (await verifyCertificateSignatureChain(leaf, [intermediate, root])).verified,
    false,
  );
});

test("rejects a cryptographic signer whose basic constraints deny CA use", async () => {
  const { issuer, leaf } = await certificateWithIssuerConstraints({ ca: false, keyCertSign: true });
  assert.equal((await verifyCertificateSignatureChain(leaf, [issuer])).verified, false);
});

test("rejects a CA certificate without keyCertSign usage", async () => {
  const { issuer, leaf } = await certificateWithIssuerConstraints({ ca: true, keyCertSign: false });
  assert.equal((await verifyCertificateSignatureChain(leaf, [issuer])).verified, false);
});
