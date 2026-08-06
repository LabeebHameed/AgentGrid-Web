import { SignIn } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import { motion } from 'framer-motion'
import { Hexagon, Triangle, Circle, Square } from 'lucide-react'
import { clerkPublishableKey } from './lib/client'

// Base on Clerk's own `dark` theme rather than hand-picking every color:
// hand-rolled `elements` class overrides missed sub-elements Clerk doesn't
// expose a class hook for (e.g. the social-button label text, which comes
// from `colorTextOnPrimaryBackground`/`colorNeutral` internally, not from
// any element's own className) — text silently inherited Clerk's *light*
// theme defaults on our dark background and became unreadable. Layering our
// accent colors on top of `dark` keeps every sub-element's contrast correct.
const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorBackground: '#050505',
    colorPrimary: '#f4f4f5',
    colorInputBackground: '#0a0a0a',
    borderRadius: '0.75rem',
  },
  elements: {
    card: 'bg-transparent shadow-none border-none',
    dividerLine: 'bg-white/[0.04]',
    formFieldInput: 'border-white/[0.08]',
    formButtonPrimary: 'bg-zinc-100 text-zinc-900 hover:bg-white',
  },
}

export default function LoginPage() {
  return (
    // Force dark mode for the premium efferd-style aesthetic
    <div data-theme="dark" className="aeg-dash min-h-screen w-full flex flex-col md:flex-row bg-[#050505] text-zinc-100 antialiased selection:bg-white/20 selection:text-white">
      
      {/* Left Pane - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative border-r border-white/[0.04]">
        
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[360px] flex flex-col items-center text-center"
        >
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <img src="/logo_bgremoved_inverted.png" alt="AgentTag" className="h-[28px] w-auto opacity-100 mix-blend-screen" />
            <span className="text-white text-[22px] font-bold tracking-tight">AgentTag</span>
          </div>

          {clerkPublishableKey !== undefined ? (
            // `virtual` routing: Clerk manages its own step state (email →
            // code → factor-two, etc) in memory instead of the URL hash,
            // since this app already owns window.location.hash for its own
            // routing (Router.tsx) — the two were fighting over it under
            // `routing="hash"`, and Clerk rendered nothing rather than
            // resolve the conflict.
            <SignIn
              routing="virtual"
              forceRedirectUrl="/#/app/dashboard"
              appearance={clerkAppearance}
            />
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
                Running in local mode
              </h1>
              <p className="text-[13px] text-zinc-400 mb-8">
                No hosted sign-in for this run (demo mode, or VITE_CLERK_PUBLISHABLE_KEY is unset) —
                this console authenticates the operator locally against the backend on this machine.
              </p>
              <a
                href="/#/app/dashboard"
                className="w-full inline-flex items-center justify-center h-11 rounded-xl text-[13px] font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-all active:scale-[0.98]"
              >
                Go to dashboard
              </a>
            </>
          )}

        </motion.div>
      </div>

      {/* Right Pane - Testimonials & Trust */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 lg:p-20 relative bg-[#050505] overflow-hidden">
        
        {/* Subtle dot matrix background */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
        
        {/* Top mask to fade dots */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505] pointer-events-none" />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505] pointer-events-none" />

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-[420px]">
          
          <div className="flex items-center gap-2 text-white font-bold tracking-tighter text-xl mb-8">
            <Hexagon className="size-5 fill-white" />
            Nexus AI
          </div>

          <p className="text-2xl text-white font-medium leading-[1.3] text-pretty mb-8">
            "AgentTag gave us the confidence to finally put our autonomous agents into production. The policy controls are exactly what we needed."
          </p>

          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-zinc-800 overflow-hidden border border-white/10 flex items-center justify-center">
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900 text-white font-semibold text-sm">
                AR
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">Alex Rivera</div>
              <div className="text-[12px] text-zinc-500">Lead Engineer, Nexus AI</div>
            </div>
          </div>
        </div>

        {/* Footer Logos */}
        <div className="relative z-10 mt-auto pt-16">
          <p className="text-[12px] text-zinc-500 font-medium mb-6">Loved by early access teams at</p>
          <div className="flex items-center gap-8 opacity-70 grayscale">
            <div className="flex items-center gap-1.5 text-white font-semibold tracking-tight">
              <Hexagon className="size-4" /> Nexus
            </div>
            <div className="flex items-center gap-1.5 text-white font-semibold tracking-tight">
              <Square className="size-4" /> Vanguard
            </div>
            <div className="flex items-center gap-1.5 text-white font-semibold tracking-tight">
              <Circle className="size-4" /> Kodiak
            </div>
            <div className="flex items-center gap-1.5 text-white font-semibold tracking-tight">
              <Triangle className="size-4 rotate-180" /> Acme Corp
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
