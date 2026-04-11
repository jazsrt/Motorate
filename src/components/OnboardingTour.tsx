import { useState, useEffect } from 'react';

interface OnboardingTourProps {
  userId: string;
  onDismiss: () => void;
}

const STEPS = [
  {
    position: 'left-feed',
    title: 'Feed',
    body: 'Your home base. Every spot, rating, and build from the MotoRate community shows up here in real time.',
    navIndex: 0,
  },
  {
    position: 'left-explore',
    title: 'Explore',
    body: 'Search any plate number, vehicle handle, or make and model. Find vehicles that have been spotted near you.',
    navIndex: 1,
  },
  {
    position: 'center',
    title: 'Spot',
    body: 'This is the main event. Tap here to scan any plate and log a vehicle to MotoRate. Rate it, sticker it, make it official.',
    navIndex: 2,
  },
  {
    position: 'right-rankings',
    title: 'Rankings',
    body: 'The leaderboard for real cars. See which vehicles have earned the most reputation in your area and nationally.',
    navIndex: 3,
  },
  {
    position: 'right-garage',
    title: 'Garage',
    body: 'Your profile and your vehicles. Claim your plate, manage your build, and track your reputation score.',
    navIndex: 4,
  },
];

export function OnboardingTour({ userId, onDismiss }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setVisible(false);
      setTimeout(() => {
        setStep(s => s + 1);
        setVisible(true);
      }, 200);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    localStorage.setItem(`motorate_tour_seen_${userId}`, 'true');
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const current = STEPS[step];

  // Calculate horizontal position of the bubble based on which nav item
  // Nav has 5 items evenly distributed across the screen width
  // positions: 10%, 30%, 50%, 70%, 90%
  const positions = ['10%', '30%', '50%', '70%', '90%'];
  const leftPercent = positions[current.navIndex];

  // Highlight overlay — dim everything except the nav area around the current item
  return (
    <>
      {/* Dim overlay — does NOT block the nav */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(0,0,0,0.6)',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }} />

      {/* Tap anywhere to advance */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 91, bottom: 72 }}
        onClick={handleNext}
      />

      {/* Tooltip bubble */}
      <div style={{
        position: 'fixed',
        bottom: 88,
        left: leftPercent,
        transform: 'translateX(-50%)',
        zIndex: 92,
        width: 220,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        pointerEvents: 'auto',
      }}>
        {/* Bubble */}
        <div style={{
          background: '#0d1117',
          border: '1px solid rgba(249,115,22,0.35)',
          borderRadius: 10,
          padding: '14px 16px',
          boxShadow: '0 0 30px rgba(249,115,22,0.12)',
          position: 'relative',
        }}>
          {/* Step counter */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 8, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: '#F97316', marginBottom: 4,
          }}>
            {step + 1} of {STEPS.length}
          </div>

          {/* Title */}
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 16, fontWeight: 700, color: '#eef4f8', marginBottom: 4,
          }}>
            {current.title}
          </div>

          {/* Body */}
          <div style={{
            fontFamily: "'Barlow', sans-serif",
            fontSize: 12, color: '#7a8e9e', lineHeight: 1.5, marginBottom: 12,
          }}>
            {current.body}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={e => { e.stopPropagation(); handleFinish(); }}
              style={{
                flex: 1, padding: '8px 0',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 2, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: '#5a6e7e',
              }}
            >
              Skip
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleNext(); }}
              style={{
                flex: 2, padding: '8px 0',
                background: '#F97316', border: 'none',
                borderRadius: 2, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: '#030508',
              }}
            >
              {step < STEPS.length - 1 ? 'Got It →' : 'Let\'s Go'}
            </button>
          </div>

          {/* Arrow pointing down toward the nav */}
          <div style={{
            position: 'absolute', bottom: -7, left: '50%',
            transform: 'translateX(-50%)',
            width: 12, height: 7,
            overflow: 'hidden',
          }}>
            <div style={{
              width: 12, height: 12,
              background: '#0d1117',
              border: '1px solid rgba(249,115,22,0.35)',
              transform: 'rotate(45deg)',
              marginTop: -6,
            }} />
          </div>
        </div>

        {/* Orange pulse dot on the nav item */}
        <div style={{
          position: 'absolute', bottom: -36,
          left: '50%', transform: 'translateX(-50%)',
          width: 8, height: 8, borderRadius: '50%',
          background: '#F97316',
          boxShadow: '0 0 0 4px rgba(249,115,22,0.2)',
          animation: 'motorate-pulse 1.5s ease-in-out infinite',
        }} />
      </div>
    </>
  );
}
