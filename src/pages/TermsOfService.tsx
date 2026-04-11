import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { ArrowLeft } from 'lucide-react';

interface TermsOfServicePageProps {
  onNavigate: OnNavigate;
}

const S = {
  page: { maxWidth: 600, margin: '0 auto', padding: '52px 20px 120px' } as React.CSSProperties,
  h1: { fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: '#eef4f8', margin: '0 0 4px' } as React.CSSProperties,
  date: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginBottom: 28 },
  sectionHead: { fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', margin: '24px 0 8px' } as React.CSSProperties,
  body: { fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.7, margin: '0 0 8px' } as React.CSSProperties,
  divider: { height: 1, background: 'rgba(255,255,255,0.04)', margin: '20px 0' } as React.CSSProperties,
  warn: { background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 12, fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#F97316', lineHeight: 1.6 } as React.CSSProperties,
};

export function TermsOfServicePage({ onNavigate }: TermsOfServicePageProps) {
  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div style={S.page}>
        <button onClick={() => onNavigate('profile')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6e7e', padding: 0 }}>
          <ArrowLeft size={14} /> Back
        </button>

        <h1 style={S.h1}>Terms of Service</h1>
        <p style={S.date}>Effective Date: April 10, 2026</p>

        <p style={S.body}>These Terms of Service ("Terms") govern your access to and use of MotoRate, operated by MotoRate ("we," "our," or "us"). By using MotoRate, you agree to these Terms. If you do not agree, do not use the service.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>1. The Platform</h2>
        <p style={S.body}>MotoRate is a vehicle-first social network. Users can spot vehicles in public, rate them, claim ownership of their own vehicles, follow vehicles, and earn reputation points and badges through community engagement. Vehicle profiles are based on public observations of vehicles operated in publicly accessible spaces.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>2. Eligibility</h2>
        <p style={S.body}>You must be at least 13 years old to use MotoRate. By using the service, you represent that you meet this requirement. Users under 18 must have parental or guardian consent.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>3. Your Account</h2>
        <p style={S.body}>You are responsible for maintaining the security of your account credentials. You are responsible for all activity that occurs under your account. You may not share your login credentials with others or create accounts on behalf of others without their consent. You must provide accurate information when registering.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>4. Anti-Stalking Policy</h2>
        <div style={S.warn}>
          MotoRate is strictly prohibited from being used to stalk, harass, track, or monitor specific individuals. This platform records public vehicle observations — not people. Any use of MotoRate to track the movements of a specific person is a violation of these Terms and may be reported to law enforcement.
        </div>
        <p style={S.body}>To reduce real-time tracking risk, spot posts by non-owners are subject to a publication delay. Vehicle owners can make their vehicle profile private at any time. Violations of this policy result in immediate account termination.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>5. Content Rules</h2>
        <p style={S.body}>You are responsible for any content you post on MotoRate. You agree not to post content that: is false or deliberately misleading, is defamatory, abusive, threatening, or harassing toward any person, contains personal identifying information of individuals (home addresses, phone numbers, etc.), violates intellectual property rights, is sexually explicit or inappropriate, promotes illegal activities, or is designed to manipulate reputation scores fraudulently.</p>
        <p style={S.body}>MotoRate reserves the right to remove content that violates these rules and to suspend or terminate accounts of repeat offenders.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>6. Vehicle Ownership Claims</h2>
        <p style={S.body}>By submitting a VIN or ownership documents to claim a vehicle, you represent that you are the current registered owner or authorized lessee of that vehicle. Submitting false ownership claims or fraudulent documents is a violation of these Terms and may be reported to appropriate authorities. Fraudulent claims result in immediate account termination and reversal of the claim.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>7. Prohibited Activities</h2>
        <p style={S.body}>You may not: use MotoRate to stalk or harass any individual; create false, defamatory, or misleading reviews; use automated scripts or bots to interact with the platform; attempt to reverse-engineer, decompile, or modify the application; use the platform for commercial solicitation without our written authorization; attempt to access other users' accounts or data without authorization; or circumvent any security measures we implement.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>8. Intellectual Property</h2>
        <p style={S.body}>MotoRate and its design, branding, and code are owned by us. By posting content on MotoRate, you grant us a non-exclusive, royalty-free license to display, store, and distribute that content as part of operating the platform. You retain ownership of your content.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>9. Disclaimers</h2>
        <p style={S.body}>MotoRate is provided "as is" without warranties of any kind. Vehicle ratings and spot reports represent opinions of individual users and are not verified facts. We do not guarantee the accuracy of user-generated content. We do not guarantee continuous availability of the service.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>10. Limitation of Liability</h2>
        <p style={S.body}>To the maximum extent permitted by applicable law, MotoRate and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service or any content on it, even if we have been advised of the possibility of such damages.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>11. Termination</h2>
        <p style={S.body}>We may suspend or terminate your account at any time for violations of these Terms or for any other reason at our discretion. You may delete your account at any time through your account settings. Upon termination, your right to use the service ends immediately.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>12. Changes to These Terms</h2>
        <p style={S.body}>We may update these Terms from time to time. We will notify you of material changes. Continued use of MotoRate after changes take effect constitutes your acceptance of the revised Terms.</p>

        <div style={S.divider} />
        <h2 style={S.sectionHead}>13. Contact</h2>
        <p style={S.body}>For questions about these Terms or to report violations: <span style={{ color: '#eef4f8' }}>support@motorate.app</span></p>
      </div>
    </Layout>
  );
}
