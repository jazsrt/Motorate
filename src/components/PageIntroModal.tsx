import { useState, useEffect } from 'react';

interface Section {
  label: string;
  detail: string;
}

interface PageIntro {
  page: string;
  title: string;
  subtitle: string;
  sections: Section[];
  cta: string;
}

const INTROS: PageIntro[] = [
  {
    page: 'feed',
    title: 'The Feed',
    subtitle: 'This is the pulse of MotoRate. Every spot, badge unlock, and community moment surfaces here in real time.',
    sections: [
      { label: 'Live Ticker', detail: 'The strip at the top streams live spot activity from across the platform — who just spotted what, and where. It never stops moving.' },
      { label: 'Filter Pills', detail: 'Narrow the feed by All activity, people you Follow, Spots only, or Badge earns. Switch tabs without losing your place.' },
      { label: 'Spot Cards', detail: 'Each card shows the vehicle photo, make and model, ratings across looks, sound, and condition, and the bumper stickers the community has applied. Tap the vehicle to go to its full profile.' },
      { label: 'Reputation Earned', detail: 'Every spot you submit earns you RP. Every spot your vehicle receives adds to its score. The feed is where that activity becomes visible to everyone.' },
    ],
    cta: 'Start Scrolling',
  },
  {
    page: 'search',
    title: 'Explore',
    subtitle: 'Every vehicle on MotoRate has a profile. This is how you find it — by plate, by handle, or by who owns it.',
    sections: [
      { label: 'Plate Lookup', detail: 'Enter any U.S. state and plate number. If it\'s been spotted, you\'ll see the full vehicle profile with its history, ratings, and stickers. If it hasn\'t, you\'re the first.' },
      { label: 'Vehicle Handles', detail: 'Owners who claim their vehicle get to choose a handle — like @BlackWidow or @DailyBeater. You can search those directly.' },
      { label: 'User Search', detail: 'Find other spotters and owners by their MotoRate handle. Follow them, see their fleet, send a message.' },
      { label: 'Recent Searches', detail: 'Your last few lookups stay cached so you can jump back to vehicles you\'ve been tracking without re-entering the plate.' },
    ],
    cta: 'Start Searching',
  },
  {
    page: 'scan',
    title: 'Spot a Vehicle',
    subtitle: 'This is what MotoRate is built on. See a car worth documenting? Here\'s how you put it on the record permanently.',
    sections: [
      { label: 'Plate Entry', detail: 'Select the state, enter the plate. The system runs a lookup against the MotoRate database first, then hits the national registry if it needs to. Most plates resolve to a make, model, and year instantly.' },
      { label: 'Rating Categories', detail: 'You score the vehicle on Looks, Sound, and Condition — each on a five-star scale. These ratings stack with every other spotter\'s scores to build the vehicle\'s permanent reputation.' },
      { label: 'Bumper Stickers', detail: 'Slap a community label on it. Super Clean. Civic Menace. Parking Lot Hero. Stickers are permanent and public. Choose carefully.' },
      { label: 'Photo', detail: 'Optional but worth it. A photo you upload becomes part of the vehicle\'s profile and shows in the feed. The best spot photos get the most engagement.' },
      { label: 'Reputation Points', detail: 'Every spot you submit earns you RP toward your own tier. Hit milestones and unlock badges. The more detailed and accurate your spots, the more the community notices.' },
    ],
    cta: 'Got It',
  },
  {
    page: 'rankings',
    title: 'Rankings',
    subtitle: 'Reputation is earned on the street. This is where it gets ranked.',
    sections: [
      { label: 'Your Model', detail: 'How does your specific make and model stack up against every other one on the platform? This scope filters to vehicles identical to yours and ranks them by reputation score.' },
      { label: 'City', detail: 'The top vehicles in your city based on where your claimed vehicle is registered. Local dominance is its own kind of status.' },
      { label: 'State', detail: 'Zoom out to your state. More competition, more context. Some of the most spotted vehicles on MotoRate never leave their home state.' },
      { label: 'National', detail: 'The full platform. Every vehicle, every score. These are the most respected builds in the country according to the community that spotted them.' },
    ],
    cta: 'See the Board',
  },
  {
    page: 'my-garage',
    title: 'Your Garage',
    subtitle: 'Your corner of MotoRate. Everything tied to your identity and your vehicles lives here.',
    sections: [
      { label: 'Reputation Tier', detail: 'Your tier — from Permit to Iconic — reflects your total platform activity: spots submitted, vehicles claimed, badges earned, community engagement. It updates automatically as you build history.' },
      { label: 'Your Fleet', detail: 'Every vehicle you\'ve claimed via VIN verification appears here. Unclaimed vehicles show as shadows until ownership is confirmed. Claimed vehicles unlock full management tools.' },
      { label: 'Claim a Vehicle', detail: 'Own the car that\'s been sitting in the database getting spotted by strangers? Verify via VIN and take control of the profile. Upload your own photos, respond to spots, pick a vehicle handle.' },
      { label: 'Spot History', detail: 'Every plate you\'ve spotted is logged here. Your contribution to the database is permanent — even if a vehicle is later claimed or modified by its owner.' },
      { label: 'Badges', detail: 'Milestones you\'ve hit are displayed here. First spot, 10 spots, 100 spots, first fan, first claim. Each badge has tiers — Bronze through Platinum — and they carry over to your public profile.' },
    ],
    cta: 'Explore Your Garage',
  },
];

interface PageIntroModalProps {
  page: string;
  userId: string;
  onDismiss: () => void;
}

function storageKey(page: string, userId: string) {
  return `motorate_intro_${page}_${userId}`;
}

export function hasSeenIntro(page: string, userId: string): boolean {
  try {
    return !!localStorage.getItem(storageKey(page, userId));
  } catch { return true; }
}

export function PageIntroModal({ page, userId, onDismiss }: PageIntroModalProps) {
  const [visible, setVisible] = useState(false);
  const intro = INTROS.find(i => i.page === page);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  if (!intro) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(storageKey(page, userId), 'true'); } catch {}
    setVisible(false);
    setTimeout(onDismiss, 250);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: visible ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
        transition: 'background 0.25s ease',
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleDismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: '#0d1117',
          borderRadius: '16px 16px 0 0',
          border: '1px solid rgba(249,115,22,0.18)',
          borderBottom: 'none',
          padding: '0 0 40px',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(249,115,22,0.10)' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#F97316', marginBottom: 6 }}>
            MotoRate
          </div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 26, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 8 }}>
            {intro.title}
          </div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.55 }}>
            {intro.subtitle}
          </div>
        </div>

        {/* Sections */}
        <div style={{ padding: '8px 0' }}>
          {intro.sections.map((section, i) => (
            <div
              key={i}
              style={{
                padding: '14px 24px',
                borderBottom: i < intro.sections.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}
            >
              {/* Orange tick */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F97316' }} />
              </div>

              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#eef4f8', marginBottom: 4 }}>
                  {section.label}
                </div>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', lineHeight: 1.6 }}>
                  {section.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '16px 24px 0' }}>
          <button
            onClick={handleDismiss}
            style={{
              width: '100%', padding: '14px',
              background: '#F97316', border: 'none', borderRadius: 8,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12, fontWeight: 700, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: '#030508', cursor: 'pointer',
            }}
          >
            {intro.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
