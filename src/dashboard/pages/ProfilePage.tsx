import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { useStore } from "../data";
import { PageHeader } from "../ui";
import { IdentityHero, ContactSection, SecuritySection, SessionsSection, PreferencesSection, DangerZoneSection, ChangePasswordModal, PasskeysModal, RecoveryCodesModal, DeleteWorkspaceModal, type Session } from "../profile-sections";
import { api, isHttpApi, setApiAgentDid } from "../../lib/client";

// Premium UI Component imports from the installed blocks



// Stagger wrapper for cards



import { stagger } from "./shared";
export function ProfilePage() {
  const { devices, activeAgentId } = useStore();
  const [displayName, setDisplayName] = useState("Operator");
  const [did, setDid] = useState("did:key:z6MkvS…W8X23b");
  const [openModal, setOpenModal] = useState<"password" | "passkeys" | "recovery" | "delete" | null>(null);
  const prefsRef = useRef<HTMLDivElement>(null);

  const scrollToPrefs = () => prefsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  useEffect(() => {
    if (!activeAgentId || activeAgentId.startsWith("pending:")) return;
    let cancelled = false;
    void (async () => {
      try {
        // Guard against a race with other effects (e.g. data.tsx's vault
        // loader) that also point the single stateful HttpApi client at
        // whichever agent DID they last read — pin it again right before
        // this per-agent call.
        if (isHttpApi()) setApiAgentDid(activeAgentId);
        const identity = await api.getIdentity();
        if (cancelled) return;
        setDisplayName(identity.displayName);
        setDid(identity.operatorDid);
      } catch {
        /* identity endpoint unreachable — keep placeholder values */
      }
    })();
    return () => { cancelled = true; };
  }, [activeAgentId]);

  return (
    <>
      <PageHeader title="Profile" subtitle="Your identity, session, and security settings." />
      <div className="ad-scroll overflow-y-auto flex-1 p-4 md:p-6">
        <motion.div
          className="flex flex-col gap-6 max-w-2xl mx-auto"
          variants={stagger}
          initial="visible"
          animate="visible"
        >
          <IdentityHero displayName={displayName} setDisplayName={setDisplayName} did={did} />

          <motion.div initial="visible" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
            <ContactSection onScrollToPrefs={scrollToPrefs} />
          </motion.div>

          <motion.div initial="visible" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
            <SecuritySection
              onOpenPassword={() => setOpenModal("password")}
              onOpenPasskeys={() => setOpenModal("passkeys")}
              onOpenRecovery={() => setOpenModal("recovery")}
            />
          </motion.div>

          <motion.div initial="visible" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
            <SessionsSection sessions={devices as unknown as Session[]} />
          </motion.div>

          <motion.div ref={prefsRef} initial="visible" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
            <PreferencesSection />
          </motion.div>

          <motion.div initial="visible" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
            <DangerZoneSection onOpenDelete={() => setOpenModal("delete")} />
          </motion.div>
        </motion.div>
      </div>

      <ChangePasswordModal open={openModal === "password"} onClose={() => setOpenModal(null)} />
      <PasskeysModal open={openModal === "passkeys"} onClose={() => setOpenModal(null)} />
      <RecoveryCodesModal open={openModal === "recovery"} onClose={() => setOpenModal(null)} />
      <DeleteWorkspaceModal open={openModal === "delete"} onClose={() => setOpenModal(null)} />
    </>
  );
}
// ============================================================
// Support
// ============================================================

