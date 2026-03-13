import { getTierFromScore } from './tierConfig'

// ─── Claim Status ───────────────────────────────────────────────

export type ClaimStatus = 'verified' | 'claimed' | 'unclaimed'

export interface VehicleClaimResult {
  status: ClaimStatus
  label: 'VERIFIED' | 'CLAIMED' | 'UNCLAIMED'
}

export function getVehicleClaimStatus(vehicle: {
  is_claimed?: boolean | null
  owner_id?: string | null
}): VehicleClaimResult {
  if (vehicle.is_claimed && vehicle.owner_id) {
    return { status: 'verified', label: 'VERIFIED' }
  }
  if (vehicle.is_claimed) {
    return { status: 'claimed', label: 'CLAIMED' }
  }
  return { status: 'unclaimed', label: 'UNCLAIMED' }
}

// ─── Image Selection ─────────────────────────────────────────────

export function getVehicleImage(
  vehicle: {
    profile_image_url?: string | null
    stock_image_url?: string | null
  } | null | undefined,
  prefer: 'profile' | 'stock' = 'stock'
): string | null {
  if (!vehicle) return null
  if (prefer === 'profile') {
    return vehicle.profile_image_url ?? vehicle.stock_image_url ?? null
  }
  return vehicle.stock_image_url ?? vehicle.profile_image_url ?? null
}

// ─── RP Formatting ────────────────────────────────────────────────

export function formatRP(score: number | null | undefined): string {
  if (score == null) return '0'
  if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`
  if (score >= 1000) return `${(score / 1000).toFixed(1)}K`
  return score.toLocaleString()
}

// ─── Owner RP Strip ───────────────────────────────────────────────

export function getOwnerRPStrip(reputationScore: number | null | undefined): string | null {
  if (reputationScore == null) return null
  const tier = getTierFromScore(reputationScore)
  return `${tier} · ${reputationScore.toLocaleString()} RP`
}

// ─── Vehicle Display Name ─────────────────────────────────────────

export function getVehicleDisplayName(vehicle: {
  make?: string | null
  model?: string | null
}): { make: string; model: string } {
  return {
    make: vehicle.make ?? 'Unknown',
    model: vehicle.model ?? 'Vehicle',
  }
}

// ─── Timestamp Formatting ─────────────────────────────────────────

export function formatSpotTime(ts: string | null | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday =
    d.toDateString() === new Date(now.getTime() - 86400000).toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `Today ${time}`
  if (isYesterday) return `Yesterday ${time}`
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` · ${time}`
  )
}

// ─── Count Formatting ─────────────────────────────────────────────

export function formatCount(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 10000) return `${Math.round(n / 1000)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}
