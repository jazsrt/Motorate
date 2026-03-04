import { useState } from 'react';
import { Layout } from '../components/Layout';
import { OnNavigate } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Crown, Check, Zap, Star, Shield, TrendingUp, Users, Award, Rocket, Mail } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface PremiumPageProps {
  onNavigate: OnNavigate;
}

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  description: string;
  features: string[];
  popular?: boolean;
  stripePriceId?: string;
}

const subscriptionTiers: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    description: 'Perfect for casual car enthusiasts',
    features: [
      'Basic feed access',
      'Post photos and videos',
      'Comment and react',
      'Follow other users',
      'Basic profile',
      'Standard support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'month',
    description: 'For serious enthusiasts',
    popular: true,
    features: [
      'Everything in Free',
      'Verified badge',
      'Advanced analytics',
      'Unlimited albums',
      'Priority feed placement',
      'Custom profile themes',
      'Event creation',
      'Priority support',
      'Ad-free experience',
    ],
    stripePriceId: 'price_pro_monthly',
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 24.99,
    period: 'month',
    description: 'For professional builders and influencers',
    features: [
      'Everything in Pro',
      'Elite badge',
      'Detailed insights & demographics',
      'Build sheet templates',
      'Sponsor opportunities',
      'Early feature access',
      'Direct messaging groups',
      'Premium customer support',
      'API access',
      'Revenue sharing on content',
    ],
    stripePriceId: 'price_elite_monthly',
  },
];

export function PremiumPage({ onNavigate }: PremiumPageProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [selectedTier, setSelectedTier] = useState<string>('free');
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    showToast('Payment integration launching soon! Sign up below to be notified.', 'info');
  };

  const handleNotifyMe = () => {
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }

    if (!email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setEmailSubmitted(true);
    showToast('Thanks! We\'ll email you when premium launches.', 'success');
    setEmail('');
  };

  const getTierIcon = (tierId: string) => {
    switch (tierId) {
      case 'pro':
        return <Crown className="w-6 h-6" />;
      case 'elite':
        return <Star className="w-6 h-6" fill="currentColor" />;
      default:
        return <Users className="w-6 h-6" />;
    }
  };

  const getTierColor = (tierId: string) => {
    switch (tierId) {
      case 'pro':
        return 'from-[#F97316] to-[#fb923c]';
      case 'elite':
        return 'from-[#fb923c] to-pink-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const currentTier = subscriptionTiers.find(t => t.id === selectedTier);

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent-primary to-orange-600 rounded-full mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold">Unlock Premium Features</h1>
          <p className="text-secondary text-lg max-w-2xl mx-auto">
            Take your car community experience to the next level with advanced features,
            analytics, and exclusive perks.
          </p>
        </div>

        <div className="bg-orange/10 border-2 border-orange/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Rocket className="w-8 h-8 text-accent-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-accent-primary mb-2">Payment Integration Launching Soon!</h3>
              <p className="text-secondary">
                Premium features are coming soon. Be the first to know when subscriptions go live and exclusive launch discounts become available.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setBillingPeriod('month')}
            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all ${
              billingPeriod === 'month'
                ? 'bg-accent-primary text-white'
                : 'bg-surfacehighlight hover:bg-surface'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('year')}
            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all relative ${
              billingPeriod === 'year'
                ? 'bg-accent-primary text-white'
                : 'bg-surfacehighlight hover:bg-surface'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              Save 20%
            </span>
          </button>
        </div>

        {currentTier && (
          <div className="bg-orange/10 border border-orange/30 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${getTierColor(currentTier.id)} rounded-full flex items-center justify-center text-white`}>
                {getTierIcon(currentTier.id)}
              </div>
              <div>
                <p className="text-sm text-secondary">Current Plan</p>
                <p className="font-bold text-lg">{currentTier.name}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {subscriptionTiers.map((tier) => {
            const isCurrentTier = tier.id === selectedTier;
            const price = billingPeriod === 'year' ? tier.price * 12 * 0.8 : tier.price;
            const priceDisplay = billingPeriod === 'year' ? (price / 12).toFixed(2) : price.toFixed(2);

            return (
              <div
                key={tier.id}
                className={`relative bg-surface border-2 rounded-xl p-6 transition-all ${
                  tier.popular
                    ? 'border-accent-primary shadow-xl shadow-accent-primary/20 scale-105'
                    : 'border-surfacehighlight hover:border-accent-primary/50'
                } ${isCurrentTier ? 'ring-2 ring-green-500' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent-primary text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrentTier && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <div className={`w-12 h-12 bg-gradient-to-br ${getTierColor(tier.id)} rounded-full flex items-center justify-center text-white mb-4`}>
                      {getTierIcon(tier.id)}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                    <p className="text-secondary text-sm mb-4">{tier.description}</p>

                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold">${priceDisplay}</span>
                      <span className="text-secondary text-sm">/{billingPeriod === 'year' ? 'mo' : 'month'}</span>
                    </div>
                    {billingPeriod === 'year' && tier.price > 0 && (
                      <p className="text-xs text-green-500 font-medium">
                        Billed ${price.toFixed(2)} annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={loading || isCurrentTier || tier.id !== 'free'}
                    className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      tier.popular
                        ? 'bg-accent-primary hover:bg-accent-hover text-white'
                        : 'bg-surfacehighlight hover:bg-surface'
                    }`}
                  >
                    {isCurrentTier ? 'Current Plan' : tier.id === 'free' ? 'Free Forever' : 'Coming Soon'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-surface border border-surfacehighlight rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-accent-primary" />
            </div>
            <h3 className="font-bold mb-2">Instant Access</h3>
            <p className="text-secondary text-sm">
              Upgrade instantly and get immediate access to all premium features
            </p>
          </div>

          <div className="bg-surface border border-surfacehighlight rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-accent-primary" />
            </div>
            <h3 className="font-bold mb-2">Cancel Anytime</h3>
            <p className="text-secondary text-sm">
              No long-term commitment. Cancel your subscription anytime, hassle-free
            </p>
          </div>

          <div className="bg-surface border border-surfacehighlight rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-accent-primary" />
            </div>
            <h3 className="font-bold mb-2">Growing Features</h3>
            <p className="text-secondary text-sm">
              New premium features added regularly based on community feedback
            </p>
          </div>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-xl p-8 max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-accent-primary/10 rounded-full mb-4">
              <Mail className="w-6 h-6 text-accent-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Get Notified</h3>
            <p className="text-secondary">
              Enter your email to be the first to know when premium subscriptions launch
            </p>
          </div>

          {emailSubmitted ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
              <Check className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <p className="text-green-400 font-bold">
                Thanks! We'll email you when premium launches.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNotifyMe()}
                placeholder="your@email.com"
                className="flex-1 bg-surfacehighlight border border-surfacehighlight rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
              <button
                onClick={handleNotifyMe}
                className="px-6 py-3 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95"
              >
                Notify Me
              </button>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-accent-primary to-orange-600 rounded-xl p-8 text-center text-white">
          <Award className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Need a Custom Plan?</h3>
          <p className="mb-6 opacity-90">
            Shops, dealerships, and influencers with special requirements can contact us
            for enterprise pricing and custom features.
          </p>
          <button
            onClick={() => onNavigate('profile')}
            className="px-6 py-3 bg-white text-accent-primary rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-gray-100 transition-all active:scale-95"
          >
            Contact Sales
          </button>
        </div>
      </div>
    </Layout>
  );
}
