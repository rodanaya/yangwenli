import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MainLayout } from '@/components/layout/MainLayout'
import {
  Dashboard,
  Contracts,
  Vendors,
  Institutions,
  Sectors,
  RiskAnalysis,
  Export,
  Settings,
} from '@/pages'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="vendors" element={<Vendors />} />
              <Route path="vendors/:id" element={<VendorDetailPlaceholder />} />
              <Route path="institutions" element={<Institutions />} />
              <Route path="institutions/:id" element={<InstitutionDetailPlaceholder />} />
              <Route path="sectors" element={<Sectors />} />
              <Route path="sectors/:id" element={<SectorDetailPlaceholder />} />
              <Route path="analysis/risk" element={<RiskAnalysis />} />
              <Route path="export" element={<Export />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

// Placeholder components for detail pages
function VendorDetailPlaceholder() {
  return (
    <div className="p-8 text-center text-text-muted">
      <h2 className="text-lg font-semibold mb-2">Vendor Details</h2>
      <p>Detailed vendor profile page coming soon.</p>
    </div>
  )
}

function InstitutionDetailPlaceholder() {
  return (
    <div className="p-8 text-center text-text-muted">
      <h2 className="text-lg font-semibold mb-2">Institution Details</h2>
      <p>Detailed institution profile page coming soon.</p>
    </div>
  )
}

function SectorDetailPlaceholder() {
  return (
    <div className="p-8 text-center text-text-muted">
      <h2 className="text-lg font-semibold mb-2">Sector Details</h2>
      <p>Detailed sector analysis page coming soon.</p>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-4xl font-bold text-text-primary mb-2">404</h1>
      <p className="text-text-muted">Page not found</p>
    </div>
  )
}

export default App
