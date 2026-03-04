import { useState } from 'react';
import { Search, Award, Car, Zap, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <Zap size={64} strokeWidth={1.2} style={{ color: 'var(--accent)' }} />,
      title: 'Welcome to MotoRate',
      description: 'Build your reputation by spotting and reviewing vehicles in your community.',
      action: 'Get Started'
    },
    {
      icon: <Search size={64} strokeWidth={1.2} style={{ color: 'var(--accent)' }} />,
      title: 'Spot Vehicles',
      description: 'Search any license plate to spot vehicles. Quick spot in 15 seconds earns +15 rep.',
      action: 'Got It'
    },
    {
      icon: <Award size={64} strokeWidth={1.2} style={{ color: 'var(--gold-h)' }} />,
      title: 'Earn Reputation',
      description: 'Every review, photo, and interaction earns reputation. Build your profile and unlock badges.',
      action: 'Next'
    },
    {
      icon: <Car size={64} strokeWidth={1.2} style={{ color: 'var(--positive)' }} />,
      title: 'Build Your Garage',
      description: 'Claim your vehicles to verify ownership and showcase your collection.',
      action: 'Start Exploring'
    }
  ];

  async function handleComplete() {
    onComplete(); // Close immediately — never block on network
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user!.id);
    } catch (e) {
      console.error('Failed to save onboarding status:', e);
    }
  }

  function handleNext() {
    if (currentStep === steps.length - 1) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleSkip() {
    handleComplete();
  }

  const step = steps[currentStep];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(6,10,14,0.95)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="max-w-md w-full">
        {/* Step Counter + Skip */}
        <div className="flex items-center justify-between mb-6">
          <span
            className="text-[10px] font-mono font-medium"
            style={{ color: 'var(--t4)', letterSpacing: '1.5px' }}
          >
            {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={handleSkip}
            className="text-[10px] font-semibold uppercase transition-colors"
            style={{ color: 'var(--t3)', letterSpacing: '1.5px' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
          >
            Skip Tour
          </button>
        </div>

        {/* Content Card */}
        <div className="card-v3 p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {step.icon}
          </div>

          {/* Title */}
          <h2
            className="text-2xl font-semibold mb-4"
            style={{ color: 'var(--t1)', letterSpacing: '0.5px' }}
          >
            {step.title}
          </h2>

          {/* Description */}
          <p
            className="text-[14px] mb-8 leading-relaxed"
            style={{ color: 'var(--t3)' }}
          >
            {step.description}
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: index === currentStep ? '32px' : '8px',
                  background: index === currentStep ? 'var(--accent)' : 'var(--border-2)',
                }}
              />
            ))}
          </div>

          {/* Action Button */}
          <button
            onClick={handleNext}
            className="w-full rounded-xl px-6 py-4 font-semibold uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--orange), var(--accent))',
              color: 'white',
              letterSpacing: '1px',
            }}
          >
            {step.action}
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
