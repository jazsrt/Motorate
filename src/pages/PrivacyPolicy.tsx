import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigate: OnNavigate;
}

const S = {
  page: { maxWidth: 600, margin: '0 auto', padding: '52px 20px 120px' } as React.CSSProperties,
  h1: { fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: '#eef4f8', margin: '0 0 4px' } as React.CSSProperties,
  date: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginBottom: 28 },
  sectionHead: { fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', margin: '24px 0 8px' } as React.CSSProperties,
  body: { fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.7, margin: '0 0 8px' } as React.CSSProperties,
  divider: { height: 1, background: 'rgba(255,255,255,0.04)', margin: '20px 0' } as React.CSSProperties,
};

export function PrivacyPolicyPage({ onNavigate }: PrivacyPolicyPageProps) {
  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div style={S.page}>
        <button onClick={() => onNavigate('profile')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6e7e', padding: 0 }}>
          <ArrowLeft size={14} /> Back
        </button>

        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={S.date}>Effective Date: April 10, 2026</p>

        <p style={S.body}>
          MotoRate ("we," "our," or "us") operates the MotoRate platform — a vehicle-first social network where vehicles accumulate reputation through community spotting, ratings, and engagement. This Privacy Policy explains how we collect, use, and protect your information when you use our service at motorate.vercel.app.
        </p>
        <p style={S.body}>By using MotoRate, you agree to the collection and use of information in accordance with this policy.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>Information We Collect</h2>
        <p style={S.body}>We collect the following information to provide and operate our service:</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Account information:</b> email address, username (handle), profile photo, and optional bio when you register.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Vehicle information:</b> license plate numbers (stored as one-way cryptographic hashes and as plaintext where you provide it), make, model, year, color, photos you upload, and VIN data you voluntarily submit for ownership verification.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>User-generated content:</b> posts, spot reports, ratings, comments, bumper stickers, and any photos you upload.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Usage data:</b> pages viewed, actions taken, and device/browser information collected automatically when you use the service.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Location:</b> optional location labels you attach to spots. We do not continuously track or store your GPS coordinates.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>How We Use Your Information</h2>
        <p style={S.body}>We use the information we collect to: operate and improve the MotoRate platform, authenticate you, display your profile and vehicle pages, calculate reputation scores and leaderboard positions, send in-app notifications about activity on your vehicles and content, and enforce our Terms of Service.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>License Plate Data</h2>
        <p style={S.body}>MotoRate allows users to record vehicles spotted in public spaces by their license plates. License plates are visible public identifiers on vehicles operated in public. We store plate data to build vehicle reputation profiles based on community observations. Plate numbers are stored in hashed form for lookup matching and in plaintext only where the vehicle owner has claimed the vehicle or a spotter has entered it. We do not use plate data for real-time tracking of individuals.</p>
        <p style={S.body}>We implement a time delay on public spot posts by non-owners to prevent real-time location tracking of individuals.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>Third-Party Services</h2>
        <p style={S.body}>We use the following third-party services to operate MotoRate:</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Supabase:</b> database, authentication, and file storage. Your data is stored on Supabase infrastructure. See supabase.com/privacy for their policy.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Google OAuth:</b> optional sign-in via Google. If you use Google sign-in, Google shares your email and profile photo with us per their terms.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Auto.dev:</b> vehicle identification via VIN lookup for our Verified Spot feature. We send plate/VIN data to their API to retrieve vehicle specifications. See auto.dev/privacy.</p>
        <p style={S.body}><b style={{ color: '#eef4f8' }}>Pexels:</b> stock vehicle imagery. We retrieve generic car photos via their API when user photos are not available.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>Data Sharing</h2>
        <p style={S.body}>We do not sell your personal information to third parties. We do not allow advertisers to pay us to promote their products in your conversations with MotoRate. We share data with third-party service providers only to the extent necessary to operate the platform (as described above).</p>
        <p style={S.body}>Vehicle profile pages — including spot history, ratings, and bumper stickers — are publicly visible by default. Your user profile is public unless you set it to private in your settings.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>Your Rights</h2>
        <p style={S.body}>You have the right to: access the personal data we hold about you, request correction of inaccurate data, request deletion of your account and associated personal data, export your data in a portable format, and opt out of non-essential data processing.</p>
        <p style={S.body}>To exercise these rights, contact us at the address listed below. We will respond within 30 days.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>Data Security</h2>
        <p style={S.body}>We implement appropriate technical and organizational measures to protect your data, including encryption in transit (HTTPS), row-level security policies on our database, and hashed storage of sensitive identifiers like plate numbers. No system is 100% secure. We will notify you promptly if we become aware of a breach affecting your data.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>Children</h2>
        <p style={S.body}>MotoRate is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected information from a child under 13, we will delete it promptly.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>Changes to This Policy</h2>
        <p style={S.body}>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy and updating the effective date above. Continued use of MotoRate after changes constitutes acceptance of the updated policy.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>Contact</h2>
        <p style={S.body}>For questions about this Privacy Policy or to exercise your data rights, contact us at: <span style={{ color: '#eef4f8' }}>support@motorate.app</span></p>
      </div>
    </Layout>
  );
}
