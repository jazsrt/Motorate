import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import { ArrowLeft } from 'lucide-react';

interface AboutPageProps {
  onNavigate: OnNavigate;
}

const S = {
  page: { maxWidth: 600, margin: '0 auto', padding: '52px 20px 120px' } as React.CSSProperties,
  wordmark: { fontFamily: "'Rajdhani', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#eef4f8' },
  tagline: { fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#5a6e7e', marginTop: 4, marginBottom: 32 },
  sectionHead: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginBottom: 10, marginTop: 28 } as React.CSSProperties,
  body: { fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.7, margin: '0 0 10px' } as React.CSSProperties,
  divider: { height: 1, background: 'rgba(255,255,255,0.04)', margin: '20px 0' } as React.CSSProperties,
  link: { color: '#F97316', textDecoration: 'none' as const },
};

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div style={S.page}>
        <button
          onClick={() => onNavigate('profile')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6e7e', padding: 0 }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Wordmark */}
        <div>
          <div style={S.wordmark}>
            MOTO<span style={{ color: '#F97316' }}>R</span>ATE
          </div>
          <div style={S.tagline}>Reputation for Real Cars</div>
        </div>

        {/* What it is */}
        <div style={S.sectionHead}>What Is MotoRate?</div>
        <p style={S.body}>
          MotoRate is a vehicle-first social platform where cars, trucks, and motorcycles build real community reputation through spotting, ratings, and engagement. Every vehicle has its own profile. Every spot adds to its history. Owners can claim their plates, upload builds, respond to spots, and track their vehicle's standing in local and national rankings.
        </p>
        <p style={S.body}>
          Unlike driver-rating apps, MotoRate rates the vehicles — not the people. Your car's reputation is built from the ground up by the community of spotters who encounter it.
        </p>

        <div style={S.divider} />

        {/* Core features */}
        <div style={S.sectionHead}>Core Features</div>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Spot:</b> Scan any plate, rate the vehicle, and log it to the MotoRate database. Every spot is permanent and contributes to the vehicle's reputation score.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Claim:</b> Own the vehicle? Verify via VIN to unlock your vehicle's profile, upload photos, build out your spec sheet, and manage your reputation.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Rankings:</b> Vehicles compete for top positions by make/model, city, state, and nationally. Rankings are driven by reputation points earned through community activity.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Badges:</b> Vehicles and spotters earn badges for milestones — first spot, 100 spots, building out your spec sheet, earning fans, and more.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Bumper Stickers:</b> The community can slap stickers on any vehicle — Civic Menace, Parking Lot Hero, Daily Driver. They stick.</p>

        <div style={S.divider} />

        {/* Version */}
        <div style={S.sectionHead}>Version</div>
        <p style={S.body}>MotoRate Beta · Version 1.0</p>
        <p style={{ ...S.body, color: '#3a4e60' }}>motorate.vercel.app</p>

        <div style={S.divider} />

        {/* Legal links */}
        <div style={S.sectionHead}>Legal</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => onNavigate('privacy')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#F97316', textAlign: 'left', padding: 0 }}
          >
            Privacy Policy →
          </button>
          <button
            onClick={() => onNavigate('terms')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#F97316', textAlign: 'left', padding: 0 }}
          >
            Terms of Service →
          </button>
        </div>

        <div style={S.divider} />

        {/* Contact */}
        <div style={S.sectionHead}>Contact</div>
        <p style={S.body}>
          Questions, issues, or feedback: <span style={{ color: '#eef4f8' }}>support@motorate.app</span>
        </p>
        <p style={{ ...S.body, color: '#3a4e60' }}>
          We read every message.
        </p>
      </div>
    </Layout>
  );
}
