/**
 * TemporalPulse — deprecated, redirected to Administrations.
 * This file is kept to avoid broken imports but is no longer routed.
 * The /temporal route now redirects to /administrations in App.tsx.
 */
import { Navigate } from 'react-router-dom'

export default function TemporalPulse() {
  return <Navigate to="/administrations" replace />
}
