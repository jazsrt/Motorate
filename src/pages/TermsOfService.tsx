import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import { FileText, AlertTriangle, Scale, Ban } from 'lucide-react';

interface TermsOfServicePageProps {
  onNavigate: OnNavigate;
}

export function TermsOfServicePage({ onNavigate }: TermsOfServicePageProps) {
  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <FileText className="w-16 h-16 text-accent-primary" />
          </div>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-secondary">Effective Date: December 2025</p>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-xl p-6 space-y-6">
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Acceptance of Terms</h2>
            <p className="text-secondary leading-relaxed">
              By accessing or using Reputation, you agree to be bound by these Terms of Service and 
              all applicable laws and regulations. If you do not agree with any of these terms, 
              you are prohibited from using this service.
            </p>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-accent-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold mb-2">Anti-Stalking Policy</h2>
                <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4 mb-3">
                  <p className="text-accent-primary leading-relaxed font-semibold">
                    Do not use Reputation to track, harass, or stalk individuals. This platform is 
                    intended for vehicle reputation tracking based on public observations, not for 
                    monitoring or following specific individuals.
                  </p>
                </div>
                <p className="text-secondary leading-relaxed">
                  Violation of this policy results in immediate account termination and may be 
                  reported to law enforcement authorities. We implement a 1-hour delay on "spotting" 
                  posts by non-owners to prevent real-time tracking.
                </p>
              </div>
            </div>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">User Responsibilities</h2>
            <p className="text-secondary leading-relaxed mb-3">
              You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-secondary">
              <li>Provide accurate and truthful information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Not impersonate others or create fake profiles</li>
              <li>Not post harassing, threatening, or illegal content</li>
              <li>Not attempt to circumvent security measures</li>
              <li>Not use automated tools to scrape or collect data</li>
            </ul>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Content Guidelines</h2>
            <p className="text-secondary leading-relaxed mb-3">
              User-generated content must:
            </p>
            <ul className="list-disc list-inside space-y-2 text-secondary">
              <li>Be based on factual observations</li>
              <li>Not contain personal information (addresses, phone numbers)</li>
              <li>Not include hate speech or discriminatory language</li>
              <li>Not violate intellectual property rights</li>
              <li>Not contain explicit or inappropriate material</li>
            </ul>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <Scale className="w-6 h-6 text-accent-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold mb-2">Plate Profiles & Public Interest</h2>
                <p className="text-secondary leading-relaxed">
                  Vehicle profiles on Reputation are created based on public observations of vehicles 
                  in public spaces. This information is collected under the legal basis of 
                  Legitimate Interest for community safety and reputation tracking purposes.
                </p>
              </div>
            </div>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Verification & Ownership Claims</h2>
            <p className="text-secondary leading-relaxed">
              Vehicle ownership verification is processed using AI technology. By submitting 
              verification documents, you consent to automated processing. False claims of 
              ownership or submission of fraudulent documents will result in account termination.
            </p>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <Ban className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold mb-2">Prohibited Activities</h2>
                <p className="text-secondary leading-relaxed mb-3">
                  The following activities are strictly prohibited:
                </p>
                <ul className="list-disc list-inside space-y-2 text-secondary">
                  <li>Stalking or harassing individuals through vehicle tracking</li>
                  <li>Creating false or defamatory spots</li>
                  <li>Attempting to manipulate reputation scores</li>
                  <li>Sharing login credentials with others</li>
                  <li>Reverse engineering or decompiling the application</li>
                  <li>Using the service for commercial purposes without authorization</li>
                </ul>
              </div>
            </div>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Moderation & Enforcement</h2>
            <p className="text-secondary leading-relaxed">
              We reserve the right to moderate, remove, or reject any content that violates 
              these terms. We may suspend or terminate accounts for violations. Users have the 
              right to appeal moderation decisions.
            </p>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Disclaimer of Warranties</h2>
            <p className="text-secondary leading-relaxed">
              Reputation is provided "as is" without warranties of any kind. We do not guarantee 
              the accuracy, completeness, or reliability of user-generated content. Vehicle 
              ratings and spots represent opinions of individual users.
            </p>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Limitation of Liability</h2>
            <p className="text-secondary leading-relaxed">
              To the maximum extent permitted by law, Reputation and its operators shall not be 
              liable for any indirect, incidental, special, or consequential damages arising 
              from your use of the service.
            </p>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Changes to Terms</h2>
            <p className="text-secondary leading-relaxed">
              We reserve the right to modify these Terms of Service at any time. Continued use 
              of the service after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <div className="border-t border-surfacehighlight" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Contact & Disputes</h2>
            <p className="text-secondary leading-relaxed">
              For questions about these terms or to report violations, contact us through our 
              support channels. Any disputes shall be resolved through binding arbitration.
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
