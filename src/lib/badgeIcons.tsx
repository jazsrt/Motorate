/* eslint-disable react-refresh/only-export-components */
import { ReactNode } from 'react';
import {
  AlertCircle, StopCircle, Zap, Award, Shield, Star, Trophy, Target,
  Heart, ThumbsUp, MessageCircle, Camera, Car, Wrench, MapPin, Flag,
  TrendingUp, Users, Eye, Sparkles, Crown, Flame, Circle, UserPlus,
  FileText, BadgeCheck, User, ParkingCircle, Hand, Wind, Gem, Leaf,
  AlertTriangle, CircleOff, CarFront, Gauge, Volume2, CloudRain, Clock
} from 'lucide-react';

export function getBadgeIcon(iconString: string, _tier?: string): ReactNode {
  if (!iconString) {
    return <Award className="w-full h-full" />;
  }

  if (iconString.startsWith('data:image') || iconString.startsWith('http')) {
    return <img src={iconString} alt="badge" className="w-full h-full object-contain" />;
  }

  const lucideIconMap: { [key: string]: ReactNode } = {
    'AlertCircle': <AlertCircle className="w-full h-full" />,
    'StopCircle': <StopCircle className="w-full h-full" />,
    'Zap': <Zap className="w-full h-full" />,
    'Award': <Award className="w-full h-full" />,
    'Shield': <Shield className="w-full h-full" />,
    'Star': <Star className="w-full h-full" />,
    'StarHalf': <Star className="w-full h-full" />,
    'Trophy': <Trophy className="w-full h-full" />,
    'Target': <Target className="w-full h-full" />,
    'Heart': <Heart className="w-full h-full" />,
    'ThumbsUp': <ThumbsUp className="w-full h-full" />,
    'MessageCircle': <MessageCircle className="w-full h-full" />,
    'Camera': <Camera className="w-full h-full" />,
    'Car': <Car className="w-full h-full" />,
    'Wrench': <Wrench className="w-full h-full" />,
    'MapPin': <MapPin className="w-full h-full" />,
    'Flag': <Flag className="w-full h-full" />,
    'TrendingUp': <TrendingUp className="w-full h-full" />,
    'Users': <Users className="w-full h-full" />,
    'Eye': <Eye className="w-full h-full" />,
    'Sparkles': <Sparkles className="w-full h-full" />,
    'Crown': <Crown className="w-full h-full" />,
    'Flame': <Flame className="w-full h-full" />,
    'Circle': <Circle className="w-full h-full" />,
    'UserPlus': <UserPlus className="w-full h-full" />,
    'FileText': <FileText className="w-full h-full" />,
    'BadgeCheck': <BadgeCheck className="w-full h-full" />,
    'User': <User className="w-full h-full" />,
    'ParkingCircle': <ParkingCircle className="w-full h-full" />,
    'HandHelping': <Hand className="w-full h-full" />,
    'Wind': <Wind className="w-full h-full" />,
    'Gem': <Gem className="w-full h-full" />,
    'Leaf': <Leaf className="w-full h-full" />,
    'AlertTriangle': <AlertTriangle className="w-full h-full" />,
    'ParkingCircleOff': <CircleOff className="w-full h-full" />,
    'CarFront': <CarFront className="w-full h-full" />,
    'Gauge': <Gauge className="w-full h-full" />,
    'Volume2': <Volume2 className="w-full h-full" />,
    'CloudRain': <CloudRain className="w-full h-full" />,
    'Clock': <Clock className="w-full h-full" />
  };

  // Check Lucide icons first
  if (lucideIconMap[iconString]) {
    return lucideIconMap[iconString];
  }

  // Modern SVG icon mapping based on badge names and tiers (emoji fallbacks)
  const iconMap: { [key: string]: ReactNode } = {
    // Achievement & Milestone Badges
    '🎯': <ModernTarget />,
    '🏆': <ModernTrophy />,
    '👑': <ModernCrown />,
    '⭐': <ModernStar />,
    '🌟': <ModernSparkle />,
    '💎': <ModernDiamond />,
    '🔥': <ModernFlame />,
    '⚡': <ModernBolt />,
    '✨': <ModernGlitter />,

    // Social & Community
    '🤝': <ModernHandshake />,
    '❤️': <ModernHeart />,
    '😊': <ModernSmile />,
    '👥': <ModernUsers />,
    '💬': <ModernChat />,

    // Automotive
    '🏁': <ModernCheckered />,
    '🚗': <ModernCar />,
    '🏎️': <ModernRacecar />,
    '🔧': <ModernWrench />,
    '⚙️': <ModernGear />,

    // Content Creation
    '📷': <ModernCamera />,
    '📝': <ModernEdit />,
    '🎨': <ModernPalette />,
    '📸': <ModernPhoto />,

    // Expertise & Skill
    '🎓': <ModernGraduation />,
    '🏰': <ModernCastle />,
    '🗺️': <ModernMap />,
    '🔍': <ModernSearch />,

    // Time & Consistency
    '📅': <ModernCalendar />,
    '⏰': <ModernClock />,
    '🌙': <ModernMoon />,
    '☀️': <ModernSun />,
  };

  return iconMap[iconString] || <Award className="w-full h-full" />;
}

// Modern SVG Icon Components
function ModernTarget() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="targetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#targetGrad)" opacity="0.2" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="url(#targetGrad)" strokeWidth="3" />
      <circle cx="50" cy="50" r="25" fill="none" stroke="url(#targetGrad)" strokeWidth="3" />
      <circle cx="50" cy="50" r="10" fill="url(#targetGrad)" />
    </svg>
  );
}

function ModernTrophy() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M30 20 L70 20 L65 50 Q50 60 35 50 Z" fill="url(#trophyGrad)" stroke="#f59e0b" strokeWidth="2" />
      <rect x="45" y="60" width="10" height="15" fill="url(#trophyGrad)" />
      <rect x="35" y="75" width="30" height="5" rx="2" fill="url(#trophyGrad)" />
      <circle cx="20" cy="30" r="8" fill="none" stroke="url(#trophyGrad)" strokeWidth="2" />
      <circle cx="80" cy="30" r="8" fill="none" stroke="url(#trophyGrad)" strokeWidth="2" />
    </svg>
  );
}

function ModernCrown() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M20 40 L30 60 L40 35 L50 60 L60 35 L70 60 L80 40 L75 70 L25 70 Z"
            fill="url(#crownGrad)" stroke="#d97706" strokeWidth="2" />
      <circle cx="20" cy="40" r="4" fill="#fbbf24" />
      <circle cx="40" cy="35" r="4" fill="#fbbf24" />
      <circle cx="60" cy="35" r="4" fill="#fbbf24" />
      <circle cx="80" cy="40" r="4" fill="#fbbf24" />
      <circle cx="50" cy="60" r="4" fill="#fbbf24" />
    </svg>
  );
}

function ModernStar() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="starGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path d="M50 15 L58 40 L85 40 L65 55 L72 80 L50 65 L28 80 L35 55 L15 40 L42 40 Z"
            fill="url(#starGrad)" filter="url(#starGlow)" />
    </svg>
  );
}

function ModernSparkle() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="sparkleGrad">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="15" fill="url(#sparkleGrad)" opacity="0.3" />
      <path d="M50 20 L55 45 L80 50 L55 55 L50 80 L45 55 L20 50 L45 45 Z"
            fill="url(#sparkleGrad)" />
      <circle cx="30" cy="30" r="3" fill="#fbbf24" />
      <circle cx="70" cy="30" r="3" fill="#fbbf24" />
      <circle cx="30" cy="70" r="3" fill="#fbbf24" />
      <circle cx="70" cy="70" r="3" fill="#fbbf24" />
    </svg>
  );
}

function ModernDiamond() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <path d="M30 25 L70 25 L85 45 L50 85 L15 45 Z"
            fill="url(#diamondGrad)" stroke="#fb923c" strokeWidth="2" />
      <path d="M30 25 L50 45 L70 25" stroke="#fb923c" strokeWidth="1.5" fill="none" />
      <path d="M15 45 L50 45 L85 45" stroke="#fb923c" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function ModernFlame() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#aa5a5a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <path d="M50 80 Q35 70 35 55 Q35 40 45 25 Q50 35 50 40 Q55 30 60 25 Q65 40 65 55 Q65 70 50 80 Z"
            fill="url(#flameGrad)" />
      <path d="M50 70 Q45 65 45 57 Q45 50 50 40 Q55 50 55 57 Q55 65 50 70 Z"
            fill="#fbbf24" opacity="0.7" />
    </svg>
  );
}

function ModernBolt() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M55 20 L35 50 L50 50 L45 80 L70 45 L55 45 Z"
            fill="url(#boltGrad)" stroke="#f59e0b" strokeWidth="2" />
    </svg>
  );
}

function ModernGlitter() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="glitterGrad">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <path d="M50 20 L53 47 L80 50 L53 53 L50 80 L47 53 L20 50 L47 47 Z"
            fill="url(#glitterGrad)" opacity="0.8" />
      <path d="M30 30 L32 48 L50 50 L32 52 L30 70 L28 52 L10 50 L28 48 Z"
            fill="url(#glitterGrad)" opacity="0.6" />
      <path d="M70 30 L72 48 L90 50 L72 52 L70 70 L68 52 L50 50 L68 48 Z"
            fill="url(#glitterGrad)" opacity="0.6" />
    </svg>
  );
}

function ModernHandshake() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="handGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <path d="M25 50 L35 40 L45 50 L55 40 L65 50 L75 40"
            stroke="url(#handGrad)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="45" r="8" fill="url(#handGrad)" />
      <circle cx="50" cy="45" r="8" fill="url(#handGrad)" />
      <circle cx="70" cy="45" r="8" fill="url(#handGrad)" />
    </svg>
  );
}

function ModernHeart() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path d="M50 80 Q20 60 20 40 Q20 25 32.5 25 Q45 25 50 35 Q55 25 67.5 25 Q80 25 80 40 Q80 60 50 80 Z"
            fill="url(#heartGrad)" />
    </svg>
  );
}

function ModernSmile() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="smileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#smileGrad)" />
      <circle cx="35" cy="42" r="5" fill="#1f2937" />
      <circle cx="65" cy="42" r="5" fill="#1f2937" />
      <path d="M30 60 Q50 75 70 60" stroke="#1f2937" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ModernUsers() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="usersGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <circle cx="35" cy="35" r="12" fill="url(#usersGrad)" />
      <path d="M15 70 Q15 50 35 50 Q55 50 55 70 Z" fill="url(#usersGrad)" />
      <circle cx="65" cy="35" r="12" fill="url(#usersGrad)" opacity="0.7" />
      <path d="M45 70 Q45 50 65 50 Q85 50 85 70 Z" fill="url(#usersGrad)" opacity="0.7" />
    </svg>
  );
}

function ModernChat() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="chatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <rect x="20" y="30" width="60" height="40" rx="8" fill="url(#chatGrad)" />
      <path d="M40 70 L35 80 L42 70 Z" fill="url(#chatGrad)" />
      <line x1="30" y1="45" x2="70" y2="45" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="55" x2="60" y2="55" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ModernCheckered() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="checkeredGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="60" height="60" fill="white" stroke="#1f2937" strokeWidth="3" />
      <rect x="20" y="20" width="15" height="15" fill="#1f2937" />
      <rect x="50" y="20" width="15" height="15" fill="#1f2937" />
      <rect x="35" y="35" width="15" height="15" fill="#1f2937" />
      <rect x="65" y="35" width="15" height="15" fill="#1f2937" />
      <rect x="20" y="50" width="15" height="15" fill="#1f2937" />
      <rect x="50" y="50" width="15" height="15" fill="#1f2937" />
      <rect x="35" y="65" width="15" height="15" fill="#1f2937" />
      <rect x="65" y="65" width="15" height="15" fill="#1f2937" />
    </svg>
  );
}

function ModernCar() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <rect x="20" y="50" width="60" height="20" rx="4" fill="url(#carGrad)" />
      <path d="M30 50 L35 35 L65 35 L70 50" fill="url(#carGrad)" />
      <circle cx="32" cy="70" r="6" fill="#1f2937" />
      <circle cx="68" cy="70" r="6" fill="#1f2937" />
      <rect x="40" y="40" width="10" height="8" fill="white" opacity="0.7" />
      <rect x="52" y="40" width="10" height="8" fill="white" opacity="0.7" />
    </svg>
  );
}

function ModernRacecar() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="raceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#aa5a5a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M25 55 L35 35 L70 35 L80 45 L85 55 L85 65 L25 65 Z" fill="url(#raceGrad)" />
      <circle cx="35" cy="70" r="7" fill="#1f2937" />
      <circle cx="75" cy="70" r="7" fill="#1f2937" />
      <rect x="45" y="40" width="15" height="10" fill="white" opacity="0.7" />
      <path d="M20 55 L25 55 L25 65 L20 60 Z" fill="url(#raceGrad)" />
    </svg>
  );
}

function ModernWrench() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="wrenchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <path d="M30 70 L20 80 L25 85 L35 75 L50 60 L55 55 L65 45 Q75 35 75 25 L70 30 L65 25 L70 20 Q60 20 50 30 L40 40 L35 45 Z"
            fill="url(#wrenchGrad)" stroke="#475569" strokeWidth="2" />
    </svg>
  );
}

function ModernGear() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <path d="M50 20 L55 30 L65 28 L68 38 L78 42 L75 52 L82 60 L72 64 L72 74 L62 72 L55 80 L48 72 L38 74 L35 64 L25 60 L28 50 L20 42 L30 38 L33 28 L43 30 Z"
            fill="url(#gearGrad)" stroke="#475569" strokeWidth="2" />
      <circle cx="50" cy="50" r="12" fill="#1f2937" />
    </svg>
  );
}

function ModernCamera() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="cameraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <rect x="20" y="35" width="60" height="40" rx="6" fill="url(#cameraGrad)" />
      <path d="M40 35 L45 25 L55 25 L60 35 Z" fill="url(#cameraGrad)" />
      <circle cx="50" cy="55" r="12" fill="white" opacity="0.8" />
      <circle cx="50" cy="55" r="8" fill="#1f2937" />
      <circle cx="70" cy="45" r="3" fill="white" />
    </svg>
  );
}

function ModernEdit() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="editGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <path d="M20 80 L25 65 L60 30 L70 40 L35 75 Z" fill="url(#editGrad)" />
      <path d="M60 30 L70 20 L80 30 L70 40 Z" fill="url(#editGrad)" opacity="0.7" />
      <line x1="25" y1="70" x2="30" y2="75" stroke="white" strokeWidth="2" />
    </svg>
  );
}

function ModernPalette() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="paletteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="35" fill="url(#paletteGrad)" />
      <circle cx="65" cy="45" r="20" fill="#1f2937" />
      <circle cx="40" cy="35" r="5" fill="#aa5a5a" />
      <circle cx="55" cy="30" r="5" fill="#fbbf24" />
      <circle cx="35" cy="50" r="5" fill="#F97316" />
      <circle cx="40" cy="65" r="5" fill="#5aaa7a" />
    </svg>
  );
}

function ModernPhoto() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="photoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <rect x="20" y="25" width="60" height="50" rx="4" fill="url(#photoGrad)" />
      <circle cx="35" cy="38" r="4" fill="#fbbf24" />
      <path d="M20 60 L35 45 L50 60 L65 40 L80 55 L80 75 L20 75 Z" fill="#1f2937" opacity="0.3" />
    </svg>
  );
}

function ModernGraduation() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="gradGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <path d="M50 25 L80 40 L50 55 L20 40 Z" fill="url(#gradGrad)" />
      <path d="M50 55 L50 75 L35 70 L35 55 Z" fill="url(#gradGrad)" opacity="0.7" />
      <path d="M75 42 L75 60 Q75 70 50 75 Q25 70 25 60 L25 42" stroke="url(#gradGrad)" strokeWidth="3" fill="none" />
    </svg>
  );
}

function ModernCastle() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="castleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <rect x="25" y="50" width="50" height="35" fill="url(#castleGrad)" />
      <rect x="20" y="40" width="15" height="45" fill="url(#castleGrad)" />
      <rect x="65" y="40" width="15" height="45" fill="url(#castleGrad)" />
      <rect x="40" y="65" width="20" height="20" fill="#1f2937" />
      <path d="M20 40 L22 35 L25 40 L28 35 L30 40 L33 35 L35 40" fill="url(#castleGrad)" />
      <path d="M65 40 L67 35 L70 40 L73 35 L75 40 L78 35 L80 40" fill="url(#castleGrad)" />
    </svg>
  );
}

function ModernMap() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5aaa7a" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <path d="M20 30 L35 25 L35 75 L20 80 Z" fill="url(#mapGrad)" opacity="0.7" />
      <path d="M35 25 L50 30 L50 80 L35 75 Z" fill="url(#mapGrad)" />
      <path d="M50 30 L65 25 L65 75 L50 80 Z" fill="url(#mapGrad)" opacity="0.7" />
      <path d="M65 25 L80 30 L80 80 L65 75 Z" fill="url(#mapGrad)" />
    </svg>
  );
}

function ModernSearch() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="searchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <circle cx="42" cy="42" r="22" fill="none" stroke="url(#searchGrad)" strokeWidth="5" />
      <line x1="58" y1="58" x2="78" y2="78" stroke="url(#searchGrad)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function ModernCalendar() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <rect x="25" y="30" width="50" height="50" rx="4" fill="url(#calGrad)" />
      <rect x="25" y="30" width="50" height="12" rx="4" fill="url(#calGrad)" opacity="0.5" />
      <line x1="35" y1="25" x2="35" y2="35" stroke="url(#calGrad)" strokeWidth="3" strokeLinecap="round" />
      <line x1="65" y1="25" x2="65" y2="35" stroke="url(#calGrad)" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="48" x2="70" y2="48" stroke="white" strokeWidth="2" opacity="0.5" />
      <circle cx="40" cy="60" r="3" fill="white" />
      <circle cx="50" cy="60" r="3" fill="white" />
      <circle cx="60" cy="60" r="3" fill="white" />
      <circle cx="40" cy="70" r="3" fill="white" />
      <circle cx="50" cy="70" r="3" fill="white" />
    </svg>
  );
}

function ModernClock() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="35" fill="none" stroke="url(#clockGrad)" strokeWidth="4" />
      <line x1="50" y1="50" x2="50" y2="30" stroke="url(#clockGrad)" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="50" x2="65" y2="50" stroke="url(#clockGrad)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="50" r="4" fill="url(#clockGrad)" />
    </svg>
  );
}

function ModernMoon() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <path d="M45 20 Q25 30 25 50 Q25 70 45 80 Q35 75 30 65 Q20 50 30 35 Q35 25 45 20 Z"
            fill="url(#moonGrad)" />
      <circle cx="55" cy="40" r="3" fill="url(#moonGrad)" opacity="0.5" />
      <circle cx="70" cy="45" r="4" fill="url(#moonGrad)" opacity="0.5" />
      <circle cx="62" cy="60" r="5" fill="url(#moonGrad)" opacity="0.5" />
    </svg>
  );
}

function ModernSun() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="20" fill="url(#sunGrad)" />
      <line x1="50" y1="15" x2="50" y2="25" stroke="url(#sunGrad)" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="75" x2="50" y2="85" stroke="url(#sunGrad)" strokeWidth="4" strokeLinecap="round" />
      <line x1="15" y1="50" x2="25" y2="50" stroke="url(#sunGrad)" strokeWidth="4" strokeLinecap="round" />
      <line x1="75" y1="50" x2="85" y2="50" stroke="url(#sunGrad)" strokeWidth="4" strokeLinecap="round" />
      <line x1="25" y1="25" x2="32" y2="32" stroke="url(#sunGrad)" strokeWidth="4" strokeLinecap="round" />
      <line x1="68" y1="68" x2="75" y2="75" stroke="url(#sunGrad)" strokeWidth="4" strokeLinecap="round" />
      <line x1="25" y1="75" x2="32" y2="68" stroke="url(#sunGrad)" strokeWidth="4" strokeLinecap="round" />
      <line x1="68" y1="32" x2="75" y2="25" stroke="url(#sunGrad)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
