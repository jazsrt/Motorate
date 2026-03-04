import { useState } from 'react';
import { X, Upload, Camera, FileText, User, Check, AlertCircle } from 'lucide-react';
import { submitVehicleClaim, ClaimDocuments } from '../lib/claims';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { CameraCaptureModal } from './CameraCaptureModal';

interface ClaimVehicleModalVerificationProps {
  vehicleId: string;
  userId?: string;
  vehicleInfo: {
    year: number;
    make: string;
    model: string;
    color?: string;
    state?: string;
    plateState?: string;
    plateNumber?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function ClaimVehicleModalVerification({
  vehicleId,
  userId: userIdProp,
  vehicleInfo,
  onClose,
  onSuccess
}: ClaimVehicleModalVerificationProps) {
  const { user } = useAuth();
  const userId = userIdProp || user?.id || '';
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<ClaimDocuments>({
    registration: null,
    insurance: null,
    photo: null,
    selfie: null
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'photo' | 'selfie' | null>(null);

  function handleFileSelect(docType: keyof ClaimDocuments, file: File | null) {
    setDocuments(prev => ({
      ...prev,
      [docType]: file
    }));
    setError(null);
  }

  async function handleSubmit() {
    // Check if at least one document is uploaded
    const hasAnyDocument = documents.registration || documents.insurance || documents.photo || documents.selfie;

    if (!hasAnyDocument) {
      setError('At least one document is required');
      showToast('Please upload at least one verification document', 'error');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const result = await submitVehicleClaim(vehicleId, userId, documents);

      if (result.success) {
        // Show appropriate message based on what was submitted
        const hasFullDocs = documents.registration || documents.insurance;
        if (hasFullDocs) {
          showToast('Claim submitted! Full verification in 24-48 hours.', 'success');
        } else {
          showToast('Conditional claim submitted! Limited access granted. Submit registration for full access.', 'info');
        }
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Failed to submit claim');
        showToast(result.error || 'Failed to submit claim', 'error');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to submit claim';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setUploading(false);
    }
  }

  const allRequiredUploaded = !!(documents.registration || documents.insurance || documents.photo || documents.selfie);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-2xl w-full my-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-surfacehighlight flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Check className="w-7 h-7 text-green-500" />
              Claim Vehicle Ownership
            </h2>
            <p className="text-secondary mt-1 text-sm">
              {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
              {vehicleInfo.color && ` • ${vehicleInfo.color}`}
              {(vehicleInfo.state || vehicleInfo.plateState) && ` • ${vehicleInfo.state || vehicleInfo.plateState}`}
              {vehicleInfo.plateNumber && ` • ${vehicleInfo.plateNumber}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition-colors"
            disabled={uploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <h3 className="font-bold text-orange-300 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              What You'll Need:
            </h3>
            <ul className="text-sm text-orange-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">•</span>
                <span><strong>Vehicle registration</strong> (best) - Full access including modifications tab</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">•</span>
                <span><strong>Insurance card</strong> (good) - Full access to most features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-primary font-bold">•</span>
                <span><strong>Photo of license plate</strong> (basic) - Conditional access, no mods tab</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-primary font-bold">•</span>
                <span><strong>Selfie with vehicle</strong> (basic) - Conditional access, no mods tab</span>
              </li>
            </ul>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                1. Vehicle Registration <span className="text-green-500">(Recommended for full access)</span>
              </label>
              <p className="text-xs text-secondary mb-3">
                Must clearly show your name and this license plate number
              </p>
              <FileUploadBox
                icon={<FileText className="w-8 h-8 text-secondary" />}
                label="Upload Registration"
                file={documents.registration}
                onFileSelect={(file) => handleFileSelect('registration', file)}
                accept="image/*,application/pdf"
                required={true}
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                2. Insurance Card <span className="text-green-500">(Also grants full access)</span>
              </label>
              <p className="text-xs text-secondary mb-3">Alternative to registration for full verification</p>
              <FileUploadBox
                icon={<FileText className="w-8 h-8 text-secondary" />}
                label="Upload Insurance"
                file={documents.insurance}
                onFileSelect={(file) => handleFileSelect('insurance', file)}
                accept="image/*,application/pdf"
                required={false}
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                3. Photo of License Plate <span className="text-accent-primary">(Conditional Access)</span>
              </label>
              <p className="text-xs text-secondary mb-3">Grants basic access without modifications tab</p>
              <CameraUploadBox
                icon={<Camera className="w-8 h-8 text-secondary" />}
                label="Take Plate Photo"
                file={documents.photo}
                onCameraClick={() => setCameraMode('photo')}
                onRemove={() => handleFileSelect('photo', null)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                4. Selfie with Vehicle <span className="text-accent-primary">(Conditional Access)</span>
              </label>
              <p className="text-xs text-secondary mb-3">Grants basic access without modifications tab</p>
              <CameraUploadBox
                icon={<User className="w-8 h-8 text-secondary" />}
                label="Take Selfie"
                file={documents.selfie}
                onCameraClick={() => setCameraMode('selfie')}
                onRemove={() => handleFileSelect('selfie', null)}
              />
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-sm text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                <strong className="block mb-1">Verification Tiers</strong>
                <strong className="text-green-400">Registration/Insurance:</strong> Full access including mods tab (review in 24-48 hours)<br/>
                <strong className="text-accent-primary">Photo/Selfie only:</strong> Immediate conditional access (no mods tab until full documents submitted)
              </span>
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-surfacehighlight flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-surfacehighlight border border-surfacehighlight rounded-xl font-bold uppercase tracking-wider hover:bg-surfacehighlight/80 transition-all active:scale-95"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={!allRequiredUploaded || uploading}
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Submit Claim</span>
              </>
            )}
          </button>
        </div>
      </div>

      {cameraMode && (
        <CameraCaptureModal
          title={cameraMode === 'photo' ? 'Photo of License Plate' : 'Selfie with Vehicle'}
          onCapture={(file) => {
            handleFileSelect(cameraMode, file);
            setCameraMode(null);
          }}
          onClose={() => setCameraMode(null)}
        />
      )}
    </div>
  );
}

interface FileUploadBoxProps {
  icon: React.ReactNode;
  label: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  accept: string;
  required: boolean;
}

function FileUploadBox({ icon, label, file, onFileSelect, accept, required }: FileUploadBoxProps) {
  const inputId = `upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={`border-2 border-dashed rounded-xl p-6 transition-all ${
      file
        ? 'border-green-500/50 bg-green-500/10'
        : required
          ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
          : 'border-surfacehighlight hover:border-accent-primary/50'
    }`}>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
        className="hidden"
        id={inputId}
      />
      <label htmlFor={inputId} className="flex flex-col items-center cursor-pointer">
        {file ? (
          <div className="w-full">
            <div className="text-green-500 mb-3 mx-auto w-fit">
              <Check className="w-10 h-10" />
            </div>
            <p className="text-base font-bold text-center mb-1">{file.name}</p>
            <p className="text-xs text-secondary text-center mb-3">
              {(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1].toUpperCase()}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById(inputId)?.click();
                }}
                className="flex-1 px-4 py-2 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
              >
                Change File
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFileSelect(null);
                }}
                className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3">
              {icon}
            </div>
            <p className="text-base font-bold mb-1">{label}</p>
            <p className="text-xs text-secondary">Click to select file or drag & drop</p>
            {required && (
              <p className="text-xs text-red-400 mt-2 font-semibold">Required</p>
            )}
          </>
        )}
      </label>
    </div>
  );
}


interface CameraUploadBoxProps {
  icon: React.ReactNode;
  label: string;
  file: File | null;
  onCameraClick: () => void;
  onRemove: () => void;
}

function CameraUploadBox({ icon, label, file, onCameraClick, onRemove }: CameraUploadBoxProps) {
  return (
    <div className={`border-2 border-dashed rounded-xl p-6 transition-all ${
      file
        ? "border-green-500/50 bg-green-500/10"
        : "border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50"
    }`}>
      {file ? (
        <div className="w-full">
          <div className="text-green-500 mb-3 mx-auto w-fit">
            <Check className="w-10 h-10" />
          </div>
          <p className="text-base font-bold text-center mb-1">{file.name}</p>
          <p className="text-xs text-secondary text-center mb-3">
            {(file.size / 1024).toFixed(1)} KB • {file.type.split("/")[1].toUpperCase()}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCameraClick}
              className="flex-1 px-4 py-2 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onCameraClick}
          className="w-full flex flex-col items-center cursor-pointer"
        >
          <div className="mb-3">
            {icon}
          </div>
          <p className="text-base font-bold mb-1">{label}</p>
          <p className="text-xs text-secondary">Opens camera to take photo</p>
        </button>
      )}
    </div>
  );
}
