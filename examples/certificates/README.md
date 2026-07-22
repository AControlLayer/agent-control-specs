# Sample AIP-1 Certificates

This directory contains example X.509 certificates demonstrating the AIP-1 certificate profile.

## Files

- `sample-agent.crt` - Example agent certificate with AIP OID extensions
- `sample-ca.crt` - Example CA certificate for verification

## Certificate Profile

AIP-1 certificates include the following custom OID extensions:

<!-- spec-contract:aip-1-example-extensions:start -->
| OID | Name | Example Value |
|-----|------|---------------|
| `1.3.6.1.4.1.59999.1.1` | AIP-Version | `1` |
| `1.3.6.1.4.1.59999.1.2` | Agent-Role | `researcher` |
| `1.3.6.1.4.1.59999.1.3` | Tenant-ID | `00000000-0000-4000-8000-000000000123` |
| `1.3.6.1.4.1.59999.1.4` | Capability-Set | `["agent:researcher","perm:files:read"]` |
| `1.3.6.1.4.1.59999.1.5` | Anchor-Chain | `ethereum:sepolia` |
| `1.3.6.1.4.1.59999.1.6` | AIP-Audience | `api.example.com` |
| `1.3.6.1.4.1.59999.1.7` | AIP-Environment | `production` |
<!-- spec-contract:aip-1-example-extensions:end -->

## Verification Commands

```bash
# View certificate details
openssl x509 -in sample-agent.crt -text -noout

# Extract AIP extensions
openssl x509 -in sample-agent.crt -text -noout | grep -A2 "1.3.6.1.4.1.59999"

# Verify certificate chain
openssl verify -CAfile sample-ca.crt sample-agent.crt

# Check validity period
openssl x509 -in sample-agent.crt -noout -dates
```

## Note

These are example certificates for documentation purposes. Production implementations should generate certificates using secure key management practices.
