import { useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Loader2, Shield, FileText } from 'lucide-react';
import { submitVehicleClaim } from '../lib/claims';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface SubmitVerificationModalProps {
  vehicleId: string;
  vehicleInfo: {
    make: string | null;
    model: string | null;
    year: number | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmitVerificationModal({
  vehicleId,
  vehicleInfo,
  onClose,
  onSuccess
}: SubmitVerificationModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const validFiles = selectedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError('Each file must be less than 10MB');
        return false;
      }
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setError('Files must be images or PDFs');
        return false;
      }
      return true;
    });

    if (validFiles.length + files.length > 5) {
      setError('Maximum 5 documents allowed');
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || files.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitVehicleClaim(vehicleId, user.id, {
        files,
        notes: notes.trim() || undefined
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit verification claim');
      }

      setSuccess(true);
      showToast('Verification claim submitted successfully!', 'success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to submit claim. Please try again.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = files.length > 0 && !isSubmitting;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 bg-surface border-b border-surfacehighlight p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent-primary" />
            <h2 className="text-xl font-bold">Submit Verification</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {success ? (
            <div className="bg-green-900/20 border border-green-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-300 mb-1">
                    Verification Claim Submitted!
                  </p>
                  <p className="text-sm text-green-400">
                    An admin will review your documents within 24-48 hours. You'll be notified once reviewed.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-orange-900/20 border border-orange-800 rounded-xl p-4">
                <p className="text-sm text-orange-300 mb-2">
                  Submit documents to verify ownership of your{' '}
                  {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
                </p>
                <p className="text-sm text-orange-300">
                  Accepted documents:
                </p>
                <ul className="mt-1 space-y-1 text-sm text-orange-300">
                  <li>• Vehicle registration</li>
                  <li>• Insurance card</li>
                  <li>• Title document</li>
                  <li>• Photo of you with the vehicle</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-wider text-secondary">
                  Upload Documents (Required)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="doc-upload"
                    disabled={isSubmitting || files.length >= 5}
                  />
                  <label
                    htmlFor="doc-upload"
                    className={`flex items-center justify-center gap-2 w-full px-4 py-8 bg-surfacehighlight border-2 border-dashed border-surfacehighlight rounded-xl hover:border-accent-primary cursor-pointer transition-colors ${
                      files.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-6 h-6 text-secondary" />
                    <span className="text-secondary">
                      {files.length === 0 ? 'Click to upload documents' : `${files.length} file(s) selected`}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-secondary">
                  Max 5 files. Each file must be under 10MB. Images or PDFs only.
                </p>

                {files.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-surfacehighlight rounded-lg"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-secondary flex-shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-secondary flex-shrink-0">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-surface rounded transition-colors flex-shrink-0"
                          disabled={isSubmitting}
                        >
                          <X className="w-4 h-4 text-secondary" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-wider text-secondary">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information that might help verify your ownership..."
                  rows={3}
                  className="w-full px-4 py-3 bg-surfacehighlight border border-surfacehighlight rounded-xl focus:outline-none focus:border-accent-primary resize-none"
                  disabled={isSubmitting}
                />
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
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 px-6 py-3 bg-accent-primary rounded-xl font-bold hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      <span>Submit for Review</span>
                    </>
                  )}
                </button>
              </div>

              {isSubmitting && (
                <div className="bg-orange-900/20 border border-orange-800 rounded-xl p-4">
                  <p className="text-sm text-orange-300 text-center">
                    Uploading documents and submitting claim...
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
