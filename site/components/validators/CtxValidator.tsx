import React, { useState } from 'react';
import ctxContract from '../../../contracts/ctx-1.json';
import { validateCtx } from '../../lib/validators/ctx';

const exampleCapability = ctxContract.reservedPrefixes[0].examples[0];

export const CtxValidator = () => {
  const [input, setInput] = useState(exampleCapability);
  const [result, setResult] = useState<{valid: boolean; message: string} | null>(null);

  const handleValidate = () => {
    const res = validateCtx(input);
    setResult(res);
  };

  const downloadReport = () => {
    if (!result) return;
    const report = {
        timestamp: new Date().toISOString(),
        validator: 'CTX-1',
        input: input,
        result: result
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ctx-validation-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="validator-section">
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#999' }}>
          Validate a <strong>CTX-1 Capability String</strong>.
        </p>
      </div>
      <div style={{ display: 'flex',gap: '1rem', flexDirection: 'column' }}>
        
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`e.g., ${exampleCapability}`}
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: '#0F0F0F',
            color: '#E0E0E0',
            border: '1px solid #333',
            fontFamily: 'monospace',
            fontSize: '16px',
            borderRadius: '4px'
          }}
        />
        
        <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={handleValidate}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#D4AF37',
            color: '#121212',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          Validate Capability
        </button>
        {result && (
            <button
            onClick={downloadReport}
            style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                marginLeft: 'auto'
            }}
            >
            ⬇ Download Report
            </button>
        )}
        </div>
      </div>

      {result && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: '4px',
          backgroundColor: result.valid ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 68, 68, 0.1)',
          border: `1px solid ${result.valid ? '#D4AF37' : '#FF4444'}`
        }}>
           <div style={{ color: result.valid ? '#D4AF37' : '#FF4444', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>{result.valid ? '✓' : '✕'}</span> 
              {result.message}
            </div>
        </div>
      )}
    </div>
  );
};
