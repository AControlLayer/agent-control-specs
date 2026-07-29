import React, { useState } from 'react';
import {
  BasicConstraintsExtension,
  cryptoProvider,
  Extension,
  KeyUsageFlags,
  KeyUsagesExtension,
  X509CertificateGenerator,
} from '@peculiar/x509';
import aipContract from '../../../contracts/aip-1.json';
import ctxContract from '../../../contracts/ctx-1.json';
import { validateAip, CheckResult } from '../../lib/validators/aip';
import { encodeAipExtensionValue } from '../../lib/validators/aip-extension-values.mjs';

const coreConformance = aipContract.conformance.levels.find(
  ({ level }) => level === 1,
);
if (!coreConformance) {
  throw new Error('AIP-1 contract must define Level 1 conformance');
}
const aipExtensionByConstant = Object.fromEntries(
  aipContract.extensions.map((extension) => [extension.constant, extension]),
);
const extensionOid = (extension: { suffix: number }) =>
  `${aipContract.oidBase}.${extension.suffix}`;

export const AipValidator = () => {
  const [input, setInput] = useState('');
  const [issuerChain, setIssuerChain] = useState('');
  const [results, setResults] = useState<{valid: boolean; checks: CheckResult[]} | null>(null);

  const handleValidate = async () => {
    if (!input.trim()) {
      setResults(null);
      return;
    }
    const res = await validateAip(input, issuerChain);
    setResults(res);
  };

  const generateTestCert = async () => {
    try {
      if (typeof window === 'undefined' || !window.crypto) {
        alert("Web Crypto API not available");
        return;
      }
      const crypto = window.crypto;
      cryptoProvider.set(crypto);
      const alg = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256", publicExponent: new Uint8Array([1, 0, 1]), modulusLength: 2048 };
      const issuerKeys = await crypto.subtle.generateKey(alg, true, ["sign", "verify"]);
      const leafKeys = await crypto.subtle.generateKey(alg, true, ["sign", "verify"]);
      const notBefore = new Date(
        Date.now() -
          aipContract.certificateLifetime.issuerBackdateMinutes.minimum * 60 * 1000,
      );
      const notAfter = new Date(
        notBefore.getTime() +
          aipContract.certificateLifetime.recommendedMinutes * 60 * 1000,
      );

      const issuer = await X509CertificateGenerator.createSelfSigned({
        serialNumber: "1",
        name: "CN=AIP Test Issuer",
        notBefore: new Date(Date.now() - 60_000),
        notAfter: new Date(Date.now() + 60 * 60 * 1000),
        signingAlgorithm: alg,
        keys: issuerKeys,
        extensions: [
          new BasicConstraintsExtension(true, undefined, true),
          new KeyUsagesExtension(KeyUsageFlags.keyCertSign, true),
        ],
      });
      const cert = await X509CertificateGenerator.create({
        serialNumber: "2",
        subject: "CN=Test Agent",
        issuer: issuer.subject,
        notBefore,
        notAfter,
        signingAlgorithm: alg,
        publicKey: leafKeys.publicKey,
        signingKey: issuerKeys.privateKey,
        extensions: coreConformance.requiredExtensions.map((constant) => {
          const extension = aipExtensionByConstant[constant];
          return new Extension(
            extensionOid(extension),
            false,
            encodeAipExtensionValue(extension, extension.example, ctxContract),
          );
        }),
      });
      
      setInput(cert.toString('pem'));
      setIssuerChain(issuer.toString('pem'));
      setResults(null); // Clear previous results
    } catch (e: any) {
        alert("Failed to generate certificate: " + e.message);
    }
  };

  const downloadReport = () => {
    if (!results) return;
    const report = {
        timestamp: new Date().toISOString(),
        validator: 'AIP-1',
        input: input,
        issuerChain,
        result: results
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aip-validation-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="validator-section">
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#999' }}>
          Validate an <strong>AIP-1 X.509 Certificate</strong> (PEM format).
        </p>
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="-----BEGIN CERTIFICATE-----..."
        style={{
          width: '100%',
          height: '200px',
          backgroundColor: '#0F0F0F',
          color: '#E0E0E0',
          border: '1px solid #333',
          padding: '1rem',
          fontFamily: 'monospace',
          fontSize: '11px',
          borderRadius: '4px'
        }}
      />
      <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.4rem' }}>
        Issuer certificate or chain (PEM). Signature verification is required for Level 1;
        blockchain/root-anchor trust is a separate Level 3 check and is not performed here.
      </p>
      <textarea
        value={issuerChain}
        onChange={(e) => setIssuerChain(e.target.value)}
        placeholder="-----BEGIN CERTIFICATE-----... issuer certificate or chain"
        style={{
          width: '100%',
          height: '140px',
          backgroundColor: '#0F0F0F',
          color: '#E0E0E0',
          border: '1px solid #333',
          padding: '1rem',
          fontFamily: 'monospace',
          fontSize: '11px',
          borderRadius: '4px'
        }}
      />
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleValidate}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#D4AF37',
            color: '#121212',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px'
          }}
        >
          Validate Certificate
        </button>
        <button
          onClick={generateTestCert}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            color: '#D4AF37',
            border: '1px solid #D4AF37',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Generate Test Cert
        </button>
        {results && (
            <button
            onClick={downloadReport}
            style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                marginLeft: 'auto'
            }}
            >
            ⬇ Download Report
            </button>
        )}
      </div>

      {results && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ color: results.valid ? '#D4AF37' : '#FF4444', marginTop: 0 }}>
            {results.valid ? '✓ AIP-1 Level 1 Valid (Anchor Trust Not Evaluated)' : '✕ Validation Failed'}
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem' }}>
            {results.checks.map((check, i) => (
              <li key={i} style={{marginBottom: '0.5rem', padding: '0.5rem', background: '#222', borderRadius: '4px', borderLeft: `3px solid ${check.passed ? '#4CAF50' : '#FF4444'}`}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: 'bold', color: '#E0E0E0'}}>{check.name}</span>
                    <span style={{color: check.passed ? '#4CAF50' : '#FF4444'}}>{check.passed ? 'PASS' : 'FAIL'}</span>
                </div>
                <div style={{fontSize: '0.8rem', color: '#888', marginTop: '0.2rem'}}>{check.message}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
