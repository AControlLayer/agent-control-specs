import { PemConverter, X509Certificate } from '@peculiar/x509';
import aipContract from '../../../contracts/aip-1.json';
import ctxContract from '../../../contracts/ctx-1.json';
import { validateAipExtensionValue } from './aip-extension-values.mjs';
import { verifyCertificateSignatureChain } from './aip-signature.mjs';

const extensionOid = (extension: { suffix: number }) =>
  `${aipContract.oidBase}.${extension.suffix}`;
const coreConformance = aipContract.conformance.levels.find(
  ({ level }) => level === 1,
);

if (!coreConformance) {
  throw new Error('AIP-1 contract must define Level 1 conformance');
}

export const AIP_OIDS = Object.fromEntries(
  aipContract.extensions.map((extension) => [extension.constant, extensionOid(extension)]),
) as Record<string, string>;

export interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  checks: CheckResult[];
}

const parseIssuerCertificates = (pem: string) =>
  PemConverter.decodeWithHeaders(pem)
    .filter(({ type }) => type === PemConverter.CertificateTag)
    .map(({ rawData }) => new X509Certificate(rawData));

export async function validateAip(
  pem: string,
  issuerChainPem: string,
): Promise<ValidationResult> {
  const checks: CheckResult[] = [];
  let isValid = true;

  try {
    if (!pem?.trim()) throw new Error('Empty leaf certificate input');

    const cert = new X509Certificate(pem);
    checks.push({ name: 'Format', passed: true, message: 'Valid X.509 certificate format' });

    const notBefore = cert.notBefore.getTime();
    const notAfter = cert.notAfter.getTime();
    const durationMinutes = (notAfter - notBefore) / (1000 * 60);
    const now = Date.now();

    if (now > notAfter) {
      checks.push({ name: 'Expiration', passed: false, message: `Certificate expired at ${cert.notAfter.toISOString()}` });
      isValid = false;
    } else if (now < notBefore) {
      checks.push({ name: 'Activation', passed: false, message: `Certificate is not valid until ${cert.notBefore.toISOString()}` });
      isValid = false;
    } else {
      checks.push({ name: 'Validity', passed: true, message: 'Certificate is currently within its validity window' });
    }

    if (durationMinutes > aipContract.certificateLifetime.maximumMinutes) {
      checks.push({ name: 'Lifetime', passed: false, message: `Duration is ${durationMinutes.toFixed(1)} minutes (maximum: ${aipContract.certificateLifetime.maximumMinutes})` });
      isValid = false;
    } else {
      checks.push({ name: 'Lifetime', passed: true, message: `Duration is ${durationMinutes.toFixed(1)} minutes (maximum: ${aipContract.certificateLifetime.maximumMinutes})` });
    }

    const requiredExtensions = new Set(coreConformance.requiredExtensions);
    for (const extension of aipContract.extensions) {
      const oid = extensionOid(extension);
      const matches = cert.extensions.filter(({ type }) => type === oid);
      const required = requiredExtensions.has(extension.constant);
      if (matches.length === 0 && !required) continue;
      checks.push({
        name: `OID: ${extension.name}`,
        passed: matches.length === 1,
        message: matches.length === 1
          ? `Found ${oid}`
          : matches.length === 0
            ? `Missing required extension ${oid}`
            : `Duplicate extension ${oid}`,
      });
      if (matches.length !== 1) {
        isValid = false;
        continue;
      }
      try {
        validateAipExtensionValue(extension, matches[0].value, ctxContract);
        checks.push({
          name: `DER: ${extension.name}`,
          passed: true,
          message: `Valid ${extension.dataType} encoding and contract value`,
        });
      } catch (error) {
        checks.push({
          name: `DER: ${extension.name}`,
          passed: false,
          message: error instanceof Error ? error.message : String(error),
        });
        isValid = false;
      }
    }

    const issuers = issuerChainPem?.trim()
      ? parseIssuerCertificates(issuerChainPem)
      : [];
    const signature = await verifyCertificateSignatureChain(cert, issuers);
    checks.push({
      name: 'Signature',
      passed: signature.verified,
      message: signature.message,
    });
    if (!signature.verified) isValid = false;
  } catch (error) {
    checks.push({
      name: 'Format',
      passed: false,
      message: `Failed to parse or verify certificate: ${error instanceof Error ? error.message : String(error)}`,
    });
    isValid = false;
  }

  return { valid: isValid, checks };
}
