import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import { Shield, Database, MapPin, Eye, Lock, UserCheck } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigate: OnNavigate;
}

export function PrivacyPolicyPage({ onNavigate }: PrivacyPolicyPageProps) {
  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Shield className="w-16 h-16 text-accent-primary" />
          </div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-secondary">Effective Date: December 2025</p>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-xl p-6 space-y-6">
          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <Database className="w-6 h-6 text-accent-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold mb-2">AI Data Processing</h2>
                <p className="text-secondary leading-relaxed">
                  We utilize OpenAI API to process verification documents. Data sent to this 
                  processor is ephemeral and is deleted from our storage immediately upon 
                  verification. We do not use this data for model training.
                </p>
              </div>
            </div>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <Eye className="w-6 h-6 text-accent-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold mb-2">Vehicle Data & Public Interest</h2>
                <p className="text-secondary leading-relaxed">
                  Vehicle profiles are aggregated based on public observations of property in 
                  public spaces. This data is collected under the legal basis of Legitimate 
                  Interest for the purpose of community safety and reputation tracking.
                </p>
              </div>
            </div>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 text-accent-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold mb-2">Location Data</h2>
                <p className="text-secondary leading-relaxed">
                  We do not store persistent GPS coordinates of user movements. Location labels 
                  are user-generated or ephemeral.
                </p>
              </div>
            </div>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <Lock className="w-6 h-6 text-accent-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold mb-2">Data Collection & Use</h2>
                <p className="text-secondary leading-relaxed mb-3">
                  We collect the following information to provide and improve our services:
                </p>
                <ul className="list-disc list-inside space-y-2 text-secondary">
                  <li>Account information (email, username, profile data)</li>
                  <li>Vehicle information (make, model, year, photos)</li>
                  <li>User-generated content (reviews, posts, comments)</li>
                  <li>Usage data and analytics</li>
                </ul>
              </div>
            </div>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <UserCheck className="w-6 h-6 text-accent-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold mb-2">Your Rights</h2>
                <p className="text-secondary leading-relaxed mb-3">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-secondary">
                  <li>Access your personal data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your account and data</li>
                  <li>Export your data in a portable format</li>
                  <li>Opt-out of certain data processing activities</li>
                </ul>
              </div>
            </div>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Data Security</h2>
            <p className="text-secondary leading-relaxed">
              We implement appropriate technical and organizational measures to protect your 
              personal data against unauthorized access, alteration, disclosure, or destruction. 
              This includes encryption, secure storage, and regular security audits.
            </p>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Third-Party Services</h2>
            <p className="text-secondary leading-relaxed mb-3">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-secondary">
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>OpenAI:</strong> AI-powered document verification (ephemeral processing only)</li>
            </ul>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Children's Privacy</h2>
            <p className="text-secondary leading-relaxed">
              Our service is not intended for users under the age of 13. We do not knowingly 
              collect personal information from children under 13.
            </p>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Changes to This Policy</h2>
            <p className="text-secondary leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any 
              changes by posting the new Privacy Policy on this page and updating the "Effective Date."
            </p>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Contact Us</h2>
            <p className="text-secondary leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through 
              our support channels.
            </p>
          </section>
        </div>

        <div className="text-center">
          <button
            onClick={() => onNavigate('profile')}
            className="text-accent-primary hover:underline"
          >
            Back to Profile
          </button>
        </div>
      </div>
    </Layout>
  );
}
