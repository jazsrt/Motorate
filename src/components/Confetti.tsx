import { useEffect, useState } from 'react';

interface ConfettiProps {
  duration?: number;
}

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  emoji: string;
  rotation: number;
}

const CONFETTI_EMOJIS = ['🎉', '⭐', '✨', '🏆', '🎊', '💫', '🌟', '🔥'];

export function Confetti({ duration: _duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const particleCount = 30;
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 500,
        duration: 2000 + Math.random() * 1000,
        emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
        rotation: Math.random() * 360
      });
    }

    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute text-2xl animate-confetti-fall"
          style={{
            left: `${particle.left}%`,
            top: '-10%',
            animationDelay: `${particle.delay}ms`,
            animationDuration: `${particle.duration}ms`,
            transform: `rotate(${particle.rotation}deg)`
          }}
        >
          {particle.emoji}
        </div>
      ))}
      <style>
        {`
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(120vh) rotate(720deg);
              opacity: 0;
            }
          }
          .animate-confetti-fall {
            animation: confetti-fall 3s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
}
