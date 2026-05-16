"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Database,
  Fingerprint,
  Layers,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const linkGroups = [
  {
    title: "Product",
    links: [
      { label: "Builder", href: "/builder" },
      { label: "My Forms", href: "/forms" },
      { label: "Verification demo", href: "/verify/0x0" },
    ],
  },
  {
    title: "Network",
    links: [
      { label: "Sui receipts", href: "#" },
      { label: "Walrus storage", href: "#" },
      { label: "Seal encryption", href: "#" },
    ],
  },
  {
    title: "Use Cases",
    links: [
      { label: "Token-gated surveys", href: "#" },
      { label: "DAO applications", href: "#" },
      { label: "Private feedback", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];

const proofPillars = [
  { label: "Sui", value: "Receipt layer", icon: Blocks },
  { label: "Walrus", value: "Data layer", icon: Database },
  { label: "Seal", value: "Privacy layer", icon: LockKeyhole },
];

const SocialIcon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
    <path d={path} />
  </svg>
);

const ICONS = {
  discord:
    "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z",
  github:
    "M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z",
  x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
};

export function Footer() {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [130, 0]);

  return (
    <footer ref={footerRef} className="relative isolate overflow-hidden bg-[#f7f5ff] px-4 pt-24 text-slate-950 transition-colors duration-300 dark:bg-[#03050b] dark:text-white sm:px-6 lg:pt-28">
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_12%,rgba(45,212,191,0.18),transparent_24%),radial-gradient(circle_at_82%_20%,rgba(124,58,237,0.16),transparent_24%),linear-gradient(180deg,#fbfbff_0%,#f7f5ff_100%)] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(45,212,191,0.16),transparent_24%),radial-gradient(circle_at_82%_20%,rgba(124,58,237,0.20),transparent_24%),linear-gradient(180deg,#05070f_0%,#03050b_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-20 bg-gradient-to-r from-cyan-300/35 via-violet-400/30 to-emerald-300/30 [clip-path:polygon(0_0,100%_0,100%_42%,93%_82%,86%_42%,78%_100%,70%_40%,61%_78%,52%_34%,43%_92%,34%_38%,25%_82%,16%_40%,8%_98%,0_44%)] dark:from-cyan-300/20 dark:via-violet-400/20 dark:to-emerald-300/20"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.18] [background-image:linear-gradient(rgba(79,70,229,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.16)_1px,transparent_1px)] [background-size:64px_64px] dark:opacity-[0.13] dark:[background-image:linear-gradient(rgba(255,255,255,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.24)_1px,transparent_1px)]"
      />

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label="WalrusForms home">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-200 text-violet-700 shadow-[0_0_34px_rgba(124,58,237,0.18)] dark:bg-cyan-300 dark:text-slate-950 dark:shadow-[0_0_34px_rgba(103,232,249,0.28)]">
                <Layers className="h-5 w-5" />
              </span>
              <span className="text-xl font-black tracking-tight">WalForms</span>
            </Link>

            <h2 className="mt-8 max-w-2xl text-4xl text-white tracking-tight sm:text-5xl">
              Make every form submission independently provable.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Build the public interface your community can use and the cryptographic audit trail
              your organization can stand behind.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/builder"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-200"
              >
                Launch builder
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/verify/0x0"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/70 px-6 text-sm font-bold text-slate-950 transition hover:border-violet-300 hover:bg-white dark:border-white/15 dark:bg-white/[0.05] dark:text-white dark:hover:border-cyan-200/50 dark:hover:bg-white/10"
              >
                Verify a receipt
                <Fingerprint className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white/75 p-5 shadow-2xl shadow-violet-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-black/30">
            <div aria-hidden className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="relative flex items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10">
              <div>
                <p className="text-xs font-bold text-violet-700 dark:text-cyan-100/70">
                  Proof stack
                </p>
                <p className="mt-2 text-lg font-bold">Three layers, one signed record</p>
              </div>
              <ShieldCheck className="h-9 w-9 text-emerald-500 dark:text-emerald-200" />
            </div>

            <div className="relative mt-6 grid gap-3">
              {proofPillars.map(({ label, value, icon: Icon }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: 18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="flex items-center justify-between rounded  px-4 py-4 dark:border-white/10 dark:bg-slate-950/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-cyan-300/10 dark:text-cyan-100">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold text-slate-950 dark:text-white">{label}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{value}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">
                    Active
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-5 rounded bg-violet-50/80 p-4 dark:border-cyan-200/15 dark:bg-cyan-200/[0.04]">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-cyan-100">
                <Sparkles className="h-4 w-4" />
                AI-assisted schema generation
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Prompt a form, tune the fields, publish the schema, and keep the verification path
                intact from the first response.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-20 grid gap-10 border-t border-slate-200 pt-10 dark:border-white/10 md:grid-cols-2 lg:grid-cols-4">
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-bold uppercase tracking-[0.28em] text-violet-700 dark:text-cyan-100/70">{group.title}</h3>
              <div className="mt-5 flex flex-col gap-3">
                {group.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="group inline-flex w-max items-center gap-1.5 text-sm text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                  >
                    {link.label}
                    {link.href === "#" && (
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-slate-200 py-7 text-sm text-slate-500 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} WalForms. Verifiable forms for the decentralized web.</p>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <a href="#" className="transition hover:text-slate-950 dark:hover:text-white" aria-label="Discord">
              <SocialIcon path={ICONS.discord} />
            </a>
            <a href="#" className="transition hover:text-slate-950 dark:hover:text-white" aria-label="GitHub">
              <SocialIcon path={ICONS.github} />
            </a>
            <a href="#" className="transition hover:text-slate-950 dark:hover:text-white" aria-label="X">
              <SocialIcon path={ICONS.x} />
            </a>
          </div>
        </div>

        <div className="pointer-events-none select-none overflow-hidden">
          <motion.p
            style={{ y }}
            className="text-center text-[12vw] font-black leading-[0.72] tracking-tight text-slate-950/[0.06] dark:text-white/[0.08]"
          >
            WALFORMS
          </motion.p>
        </div>
      </div>
    </footer>
  );
}
