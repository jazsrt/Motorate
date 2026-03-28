import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, Check } from 'lucide-react';

interface CameraCaptureModalProps {
  title: string;
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCaptureModal({ title, onCapture, onClose }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);
    }, 'image/jpeg', 0.9);
  }

  function retake() {
    setCapturedImage(null);
    startCamera();
  }

  async function confirmCapture() {
    if (!canvasRef.current || !capturedImage) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;

      const timestamp = new Date().getTime();
      const file = new File([blob], `capture-${timestamp}.jpg`, { type: 'image/jpeg' });

      stopCamera();
      onCapture(file);
      onClose();
    }, 'image/jpeg', 0.9);
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-surface border border-surfacehighlight rounded-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-surfacehighlight flex items-center justify-between">
          <h3 className="text-lg font-heading font-bold uppercase tracking-tight">{title}</h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera/Preview Area */}
        <div className="relative aspect-video bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="text-center">
                <Camera className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-red-400 mb-2 font-bold">Camera Access Error</p>
                <p className="text-sm text-secondary">{error}</p>
              </div>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-sm text-white/70 bg-black/50 inline-block px-4 py-2 rounded-full">
                  Position yourself in frame
                </p>
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-surfacehighlight">
          {error ? (
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95"
            >
              Close
            </button>
          ) : capturedImage ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={retake}
                className="px-6 py-3 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retake
              </button>
              <button
                onClick={confirmCapture}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Use Photo
              </button>
            </div>
          ) : (
            <button
              onClick={capturePhoto}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-[#F97316] hover:from-orange-600 hover:to-[#F97316] rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Take Photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
