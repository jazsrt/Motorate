import { useState, useEffect, useCallback } from 'react'
import {
  trackVehicle,
  untrackVehicle,
  isTrackingVehicle,
  getVehicleTrackerCount,
} from '../lib/vehicleFollows'

export function useVehicleTracking(vehicleId: string | null | undefined) {
  const [isTracking, setIsTracking] = useState(false)
  const [trackerCount, setTrackerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!vehicleId) { setLoading(false); return }
    let cancelled = false
    async function load() {
      const [tracking, count] = await Promise.all([
        isTrackingVehicle(vehicleId!),
        getVehicleTrackerCount(vehicleId!),
      ])
      if (!cancelled) {
        setIsTracking(tracking)
        setTrackerCount(count)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [vehicleId])

  const toggle = useCallback(async () => {
    if (!vehicleId) return
    const wasTracking = isTracking
    // Optimistic update
    setIsTracking(!wasTracking)
    setTrackerCount(c => wasTracking ? c - 1 : c + 1)
    try {
      if (wasTracking) await untrackVehicle(vehicleId)
      else await trackVehicle(vehicleId)
    } catch {
      // Revert on error
      setIsTracking(wasTracking)
      setTrackerCount(c => wasTracking ? c + 1 : c - 1)
    }
  }, [vehicleId, isTracking])

  return { isTracking, trackerCount, toggle, loading }
}
