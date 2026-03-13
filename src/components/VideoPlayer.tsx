import { useState } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export function VideoPlayer({ src, poster, className = '' }: VideoPlayerProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!src) {
    return null;
  }

  if (error) {
    return (
      <div className="bg-surface border border-surfacehighlight p-4 rounded-xl text-center text-secondary">
        <p>Video format not supported</p>
        <a href={src} target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">
          Download video
        </a>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-surfacehighlight animate-pulse" />
      )}
      <video
        poster={poster}
        controls
        className="w-full h-full"
        style={{ objectFit: 'cover', aspectRatio: '16/9' }}
        onLoadedData={() => {
          setLoading(false);
        }}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        preload="metadata"
      >
        <source src={src} type="video/mp4" />
        <source src={src} type="video/webm" />
        <source src={src} type="video/ogg" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
