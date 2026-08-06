import { lazy, Suspense } from 'react'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { clerkPublishableKey } from './lib/client'

// This is the CONSOLE repo only — there is no marketing landing page here
// (that's a separate repo/deployment at the apex domain, agenttag.me).
//
// Signed-in state comes straight from Clerk's own reactive context, not from
// parsing the URL: an earlier version tried to detect a "/login" route from
// window.location.hash, redirecting there via Clerk's <RedirectToSignIn/>.
// That redirect uses the History API (pushState/replaceState), which does
// NOT fire hashchange/popstate — so our hash listener never saw it, the
// route never flipped to 'login', RedirectToSignIn kept re-mounting on every
// render, and it kept redirecting using its own already-redirected URL as
// the return target (visible as a `redirect_url` param nesting deeper each
// time). Rendering LoginPage directly from <SignedOut> sidesteps all of it.
const Dashboard = lazy(() => import('./dashboard/Dashboard'))
const LoginPage = lazy(() => import('./LoginPage'))

export default function Router() {
  const fallback = (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-muted-foreground text-sm font-medium">
      <div className="flex items-center gap-2">
        <svg className="animate-spin h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" style={{ height: "16px", width: "16px" }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Loading...</span>
      </div>
    </div>
  )

  if (clerkPublishableKey === undefined) {
    // Local/single-operator run: no hosted sign-in, the backend's local
    // session flow authenticates governance calls instead.
    return (
      <Suspense fallback={fallback}>
        <Dashboard />
      </Suspense>
    )
  }
  return (
    <Suspense fallback={fallback}>
      <SignedIn>
        <Dashboard />
      </SignedIn>
      <SignedOut>
        <LoginPage />
      </SignedOut>
    </Suspense>
  )
}
