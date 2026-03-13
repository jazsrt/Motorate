import { useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Loader2, Shield } from 'lucide-react';
import { verifyDocument, isValidVINFormat } from '../lib/verification';
import { useAuth } from '../contexts/AuthContext';

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
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
        setError('File must be an image or PDF');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleVerify = async () => {
    if (!file || !vin || !aiConsent || !user) return;

    if (!isValidVINFormat(vin)) {
      setError('Invalid VIN format. VIN must be 17 characters and cannot contain I, O, or Q.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const verificationResult = await verifyDocument(vehicleId, file, vin, user.id);
      setResult(verificationResult);
      
      if (verificationResult.success) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const canSubmit = file && vin.length === 17 && aiConsent && !isVerifying;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-surfacehighlight p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent-primary" />
            <h2 className="text-xl font-bold">Verify Ownership</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {result ? (
            <div className={`p-4 rounded-xl border ${
              result.success 
                ? 'bg-green-900/20 border-green-800' 
                : 'bg-amber-900/20 border-amber-800'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-accent-primary flex-shrink-0" />
                )}
                <div>
                  <p className={`font-semibold mb-1 ${
                    result.success ? 'text-green-300' : 'text-accent-primary'
                  }`}>
                    {result.success ? 'Verification Successful!' : 'Manual Review Required'}
                  </p>
                  <p className={`text-sm ${
                    result.success ? 'text-green-400' : 'text-accent-primary'
                  }`}>
                    {result.message}
                  </p>
                  {result.reason === 'vin_mismatch' && (
                    <p className="text-xs text-secondary mt-2">
                      Our AI detected a different VIN. An admin will review your document within 24-48 hours.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-orange-900/20 border border-orange-800 rounded-xl p-4">
                <p className="text-sm text-orange-300">
                  Upload your vehicle registration document to verify ownership. This grants you full owner privileges including God Mode access.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-wider text-secondary">
                  Vehicle VIN
                </label>
                <input
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder="Enter 17-character VIN"
                  maxLength={17}
                  className="w-full px-4 py-3 bg-surfacehighlight border border-surfacehighlight rounded-xl focus:outline-none focus:border-accent-primary uppercase font-mono"
                />
                <p className="text-xs text-secondary">
                  {vin.length}/17 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-wider text-secondary">
                  Registration Document
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="doc-upload"
                  />
                  <label
                    htmlFor="doc-upload"
                    className="flex items-center justify-center gap-2 w-full px-4 py-8 bg-surfacehighlight border-2 border-dashed border-surfacehighlight rounded-xl hover:border-accent-primary cursor-pointer transition-colors"
                  >
                    <Upload className="w-6 h-6 text-secondary" />
                    <span className="text-secondary">
                      {file ? file.name : 'Click to upload image or PDF'}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-secondary">
                  Max file size: 10MB. Accepted: JPG, PNG, PDF
                </p>
              </div>

              <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiConsent}
                    onChange={(e) => setAiConsent(e.target.checked)}
                    className="w-5 h-5 rounded border-amber-700 bg-surfacehighlight mt-0.5 flex-shrink-0"
                  />
                  <div className="text-sm text-accent-primary">
                    <strong className="block mb-1">AI Processing Consent (Required)</strong>
                    <p>
                      I consent to the use of third-party AI (OpenAI) to process my document for verification purposes. I understand this data is deleted immediately after processing and is not used for model training.
                    </p>
                  </div>
                </label>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-surfacehighlight rounded-xl font-bold hover:bg-surfacehighlight/80 transition-colors"
                  disabled={isVerifying}
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerify}
                  disabled={!canSubmit}
                  className="flex-1 px-6 py-3 bg-accent-primary rounded-xl font-bold hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    'Verify Ownership'
                  )}
                </button>
              </div>

              {isVerifying && (
                <div className="bg-orange-900/20 border border-orange-800 rounded-xl p-4">
                  <p className="text-sm text-orange-300 text-center">
                    AI is processing your document. This may take 5-10 seconds...
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
