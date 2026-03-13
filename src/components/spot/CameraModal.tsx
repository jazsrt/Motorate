import { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, AlertCircle, Zap } from 'lucide-react';
import { extractPlateFromImage } from '../../lib/ocr';

interface CameraModalProps {
  onClose: () => void;
  onPlateDetected: (plateNumber: string) => void;
}

export function CameraModal({ onClose, onPlateDetected }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [detectedPlate, setDetectedPlate] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError('Unable to access camera. Please check permissions in your browser settings.');
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    setError(null);
    setProcessing(true);
    setProgress(0);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Canvas not supported');
      setProcessing(false);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError('Failed to capture image');
        setProcessing(false);
        return;
      }

      try {
        const file = new File([blob], 'plate.jpg', { type: 'image/jpeg' });
        const result = await extractPlateFromImage(file, (p) => setProgress(p));
        setConfidence(result.confidence);

        if (result.plateNumber && result.confidence > 50) {
          setDetectedPlate(result.plateNumber);
        } else if (result.confidence <= 50 && result.plateNumber) {
          setError(`Plate detected but low confidence (${result.confidence.toFixed(0)}%). Try again with better lighting or angle.`);
          setDetectedPlate(result.plateNumber);
        } else {
          setError('No license plate detected. Please ensure the plate is clearly visible and try again.');
        }
      } catch {
        setError('Failed to process image. Please try again.');
      } finally {
        setProcessing(false);
        setProgress(0);
      }
    }, 'image/jpeg', 0.95);
  }

  function retake() {
    setDetectedPlate(null);
    setError(null);
    setConfidence(0);
  }

  function handleConfirm() {
    if (detectedPlate) {
      onPlateDetected(detectedPlate);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface/95 backdrop-blur-lg p-4 border-b border-surfacehighlight rounded-t-2xl flex items-center justify-between z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-accent-primary" />
            Scan License Plate
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div className="border-4 border-accent-primary/60 rounded-lg w-64 h-24 flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white" />
                  <p className="text-white text-sm bg-black/70 px-3 py-1 rounded z-10">
                    Position plate here
                  </p>
                </div>
              </div>
            </div>

            {processing && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-accent-primary/20 border-t-accent-primary rounded-full animate-spin" />
                  <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-accent-primary" />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold mb-3">Reading License Plate...</p>
                  <div className="w-64 h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent-primary to-[#fb923c] transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-secondary mt-2">{progress}%</p>
                </div>
              </div>
            )}

            {detectedPlate && !processing && !error && (
              <div className="absolute inset-0 bg-green-500/30 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                <div className="bg-green-500 rounded-full p-4 animate-bounce">
                  <Check className="w-12 h-12 text-white" />
                </div>
                <div className="bg-black/90 px-8 py-4 rounded-xl border-2 border-green-500">
                  <p className="text-white text-3xl font-bold tracking-wider font-mono">
                    {detectedPlate}
                  </p>
                  <p className="text-sm text-green-400 text-center mt-2">
                    Confidence: {confidence.toFixed(0)}%
                  </p>
                </div>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 text-sm font-medium">{error}</p>
                {detectedPlate && (
                  <button
                    onClick={handleConfirm}
                    className="text-red-300 text-xs underline mt-2 hover:text-red-200"
                  >
                    Use this plate anyway: {detectedPlate}
                  </button>
                )}
              </div>
            </div>
          )}

          {!processing && !detectedPlate && (
            <div className="bg-surfacehighlight rounded-xl p-4">
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-accent-primary" />
                Tips for Best Results
              </h4>
              <ul className="text-sm text-secondary space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-accent-primary mt-0.5">-</span>
                  <span>Ensure good, even lighting (avoid shadows and glare)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-primary mt-0.5">-</span>
                  <span>Position plate within the guide rectangle</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-primary mt-0.5">-</span>
                  <span>Keep camera steady when capturing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-primary mt-0.5">-</span>
                  <span>Capture straight-on (not at an angle)</span>
                </li>
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {!detectedPlate || error ? (
              <>
                <button
                  onClick={capturePhoto}
                  disabled={processing || !stream}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-hover text-white py-4 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6" />
                      Capture Plate
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={processing}
                  className="px-8 py-4 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-hover text-white py-4 rounded-xl font-bold uppercase tracking-wider transition-all"
                >
                  <Check className="w-5 h-5" />
                  Confirm & Search
                </button>
                <button
                  onClick={retake}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl font-bold uppercase tracking-wider transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  Retake
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
