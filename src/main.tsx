import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ClerkProvider } from '@clerk/clerk-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { clerkPublishableKey } from './lib/client'
if (typeof navigator !== 'undefined' && navigator.userAgent.includes('HeadlessChrome')) {
  Object.assign(window, { __TESTING__: true });
}

import Router from './Router'

declare global {
  interface Window {
    __react_root__?: ReturnType<typeof createRoot>;
  }
}

const container = document.getElementById('root')!;
let root = window.__react_root__;
if (!root) {
  root = createRoot(container);
  window.__react_root__ = root;
}

const app = (
  <StrictMode>
    <ErrorBoundary>
      <TooltipProvider delayDuration={120}>
        <Router />
      </TooltipProvider>
    </ErrorBoundary>
  </StrictMode>
)

root.render(
  clerkPublishableKey !== undefined ? (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      {app}
    </ClerkProvider>
  ) : (
    app
  ),
)
