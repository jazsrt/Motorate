import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { verifyDocument, isValidVINFormat } from '../lib/verification';
import { useAuth } from '../contexts/AuthContext';
import { ModalShell, modalButtonPrimary, modalButtonGhost, modalInput, modalLabel } from './ui/ModalShell';

interface VerifyOwnershipModalProps {
  vehicleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function VerifyOwnershipModal({ vehicleId, onClose, onSuccess }: VerifyOwnershipModalProps) {
  const { user } = useAuth();
  const [vin, setVin] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [aiConsent, setAiConsent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string; reason?: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { setError('File size must be less than 10MB'); return; }
      if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') { setError('File must be an image or PDF'); return; }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleVerify = async () => {
    if (!file || !vin || !aiConsent || !user) return;
    if (!isValidVINFormat(vin)) { setError('Invalid VIN format. VIN must be 17 characters and cannot contain I, O, or Q.'); return; }
    setIsVerifying(true);
    setError(null);
    try {
      const verificationResult = await verifyDocument(vehicleId, file, vin, user.id);
      setResult(verificationResult);
      if (verificationResult.success) { setTimeout(() => { onSuccess(); onClose(); }, 2000); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const canSubmit = file && vin.length === 17 && aiConsent && !isVerifying;

  return (
    <ModalShell isOpen={true} onClose={onClose} eyebrow="Final Step" title="Verify Ownership"
      footer={!result ? (
        <>
          <button onClick={onClose} disabled={isVerifying} style={{ ...modalButtonGhost, opacity: isVerifying ? 0.5 : 1 }}>Cancel</button>
          <button onClick={handleVerify} disabled={!canSubmit}
            style={{ ...modalButtonPrimary, opacity: canSubmit ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {isVerifying ? (
              <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#030508', animation: 'spin 0.7s linear infinite' }} /> Verifying...</>
            ) : 'Verify Ownership'}
          </button>
        </>
      ) : undefined}
    >
      {result ? (
        <div style={{
          padding: '16px', borderRadius: 8,
          background: result.success ? 'rgba(32,192,96,0.08)' : 'rgba(249,115,22,0.06)',
          border: `1px solid ${result.success ? 'rgba(32,192,96,0.25)' : 'rgba(249,115,22,0.2)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {result.success ? (
              <CheckCircle style={{ width: 24, height: 24, color: '#20c060', flexShrink: 0 }} />
            ) : (
              <AlertCircle style={{ width: 24, height: 24, color: '#F97316', flexShrink: 0 }} />
            )}
            <div>
              <div style={{
                fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700,
                color: result.success ? '#20c060' : '#F97316', marginBottom: 4,
              }}>
                {result.success ? 'Verification Successful!' : 'Manual Review Required'}
              </div>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: result.success ? '#20c060' : '#F97316', lineHeight: 1.45 }}>
                {result.message}
              </p>
              {result.reason === 'vin_mismatch' && (
                <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', marginTop: 6 }}>
                  Our AI detected a different VIN. An admin will review your document within 24-48 hours.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Info banner */}
          <div style={{
            padding: '10px 12px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)',
            fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#F97316', lineHeight: 1.45,
          }}>
            Upload your vehicle registration document to verify ownership. This grants you full owner privileges.
          </div>

          {/* VIN input */}
          <div style={{ marginBottom: 16 }}>
            <label style={modalLabel}>Vehicle VIN</label>
            <input type="text" value={vin} onChange={e => setVin(e.target.value.toUpperCase())}
              placeholder="Enter 17-character VIN" maxLength={17}
              style={{ ...modalInput, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' as const, letterSpacing: '0.1em' }} />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#445566', textAlign: 'right' as const, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {vin.length}/17
            </div>
          </div>

          {/* Upload area */}
          <div style={{ marginBottom: 16 }}>
            <label style={modalLabel}>Registration Document</label>
            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} id="doc-upload" style={{ display: 'none' }} />
            <label htmlFor="doc-upload" style={{
              display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '28px 16px', borderRadius: 8, cursor: 'pointer',
              border: '2px dashed rgba(255,255,255,0.08)', background: '#131920',
              transition: 'border-color 0.15s',
            }}>
              <Upload style={{ width: 24, height: 24, color: file ? '#F97316' : '#445566' }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: file ? '#F97316' : '#7a8e9e' }}>
                {file ? file.name : 'Tap to upload'}
              </span>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#445566' }}>
                Max 10MB. JPG, PNG, or PDF
              </span>
            </label>
          </div>

          {/* AI consent */}
          <div style={{
            padding: '12px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={aiConsent} onChange={e => setAiConsent(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, accentColor: '#F97316' }} />
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#F97316', lineHeight: 1.45 }}>
                <strong style={{ display: 'block', marginBottom: 2 }}>AI Processing Consent (Required)</strong>
                I consent to AI processing of my document for verification. Data is deleted immediately after processing.
              </div>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <AlertCircle style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#ef4444', lineHeight: 1.45 }}>{error}</span>
            </div>
          )}

          {/* Processing indicator */}
          {isVerifying && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginTop: 12,
              background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)',
              fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#F97316', textAlign: 'center' as const,
            }}>
              AI is processing your document. This may take 5-10 seconds...
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ModalShell>
  );
}
