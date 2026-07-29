import {
  BasicConstraintsExtension,
  KeyUsageFlags,
  KeyUsagesExtension,
  X509ChainBuilder,
} from "@peculiar/x509";

const isCurrentAt = (certificate, date) =>
  certificate.notBefore.getTime() <= date.getTime() &&
  certificate.notAfter.getTime() >= date.getTime();

/**
 * Verifies certificate signatures and validity within the supplied issuer set.
 * This deliberately does not establish trust in the terminal certificate; trust
 * anchor verification is a separate AIP-1 Level 3 operation.
 */
export async function verifyCertificateSignatureChain(
  leaf,
  suppliedIssuers,
  date = new Date(),
) {
  if (suppliedIssuers.length === 0) {
    return {
      verified: false,
      anchorTrusted: false,
      message: "No issuer certificate was supplied; signature verification cannot be performed.",
    };
  }

  try {
    const chain = await new X509ChainBuilder({
      certificates: suppliedIssuers,
    }).build(leaf);

    if (chain.length < 2) {
      return {
        verified: false,
        anchorTrusted: false,
        message: "No supplied certificate both names and cryptographically verifies as the leaf issuer.",
      };
    }

    const terminal = chain[chain.length - 1];
    if (!(await terminal.isSelfSigned())) {
      return {
        verified: false,
        anchorTrusted: false,
        message: "The supplied chain is incomplete: its terminal certificate is not self-signed.",
      };
    }

    for (let index = 0; index < chain.length; index += 1) {
      if (!isCurrentAt(chain[index], date)) {
        return {
          verified: false,
          anchorTrusted: false,
          message: `Certificate in supplied chain is outside its validity window: ${chain[index].subject}`,
        };
      }
      if (index < chain.length - 1) {
        const signatureValid = await chain[index].verify({
          date,
          publicKey: chain[index + 1].publicKey,
        });
        if (!signatureValid) {
          return {
            verified: false,
            anchorTrusted: false,
            message: `Certificate signature does not verify against supplied issuer: ${chain[index + 1].subject}`,
          };
        }
      }
      if (index > 0) {
        const issuer = chain[index];
        const basicConstraints = issuer.getExtension(BasicConstraintsExtension);
        if (!basicConstraints?.ca) {
          return {
            verified: false,
            anchorTrusted: false,
            message: `Issuer is not authorized as a CA by BasicConstraints: ${issuer.subject}`,
          };
        }
        const keyUsage = issuer.getExtension(KeyUsagesExtension);
        if (!keyUsage || !(keyUsage.usages & KeyUsageFlags.keyCertSign)) {
          return {
            verified: false,
            anchorTrusted: false,
            message: `Issuer is not authorized for certificate signing by KeyUsage: ${issuer.subject}`,
          };
        }
        const subordinateCaCount = index - 1;
        if (
          basicConstraints.pathLength !== undefined &&
          subordinateCaCount > basicConstraints.pathLength
        ) {
          return {
            verified: false,
            anchorTrusted: false,
            message: `Issuer BasicConstraints path length was exceeded: ${issuer.subject}`,
          };
        }
      }
    }

    return {
      verified: true,
      anchorTrusted: false,
      message: "Complete certificate chain, CA constraints, key usage, signatures, and validity verified. External trust-anchor status was not evaluated (AIP-1 Level 3).",
    };
  } catch (error) {
    return {
      verified: false,
      anchorTrusted: false,
      message: `Certificate signature verification failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
