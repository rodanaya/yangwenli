// Named exports for direct imports
export { Dashboard } from './Dashboard'
export { Contracts } from './Contracts'
export { Vendors } from './Vendors'
export { VendorProfile } from './VendorProfile'
export { Institutions } from './Institutions'
export { InstitutionProfile } from './InstitutionProfile'
export { Sectors } from './Sectors'
export { SectorProfile } from './SectorProfile'
export { RiskAnalysis } from './RiskAnalysis'
export { Export } from './Export'
export { Settings } from './Settings'

// Investigation tools
export { NetworkGraph } from './NetworkGraph'
export { Watchlist } from './Watchlist'
export { Comparison } from './Comparison'
export { Timeline } from './Timeline'

// Note: For lazy loading in App.tsx, use:
// const Dashboard = lazy(() => import('@/pages/Dashboard'))
// Each page file also exports default for this purpose
