"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

// Simple generic icons to avoid lucide brand icon issues
const SocialIcon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d={path} />
  </svg>
);

const ICONS = {
  discord: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z",
  github: "M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z",
  x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
};

export function Footer() {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"]
  });

  // Giant text parallax: starts pushed down, ends perfectly at 0 when fully in view
  const y = useTransform(scrollYProgress, [0, 1], [200, 0]);

  return (
    <footer ref={footerRef} className="relative overflow-hidden bg-[#050505] text-white pt-24 pb-0 flex flex-col">
      <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-12 flex-1 flex flex-col">
        {/* Top Section: Links and Actions */}
        <div className="flex flex-col lg:flex-row lg:justify-between gap-16 mb-32 z-10">
          
          {/* Columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12 lg:w-2/3">
            {/* Discover */}
            <div className="flex flex-col gap-5">
              <h3 className="text-[10px] font-semibold tracking-widest text-[#A085FF] uppercase">Discover</h3>
              <div className="flex flex-col gap-4 text-sm text-[#a1a1aa]">
                <Link href="/" className="hover:text-white transition-colors">About</Link>
                <Link href="#" className="hover:text-white transition-colors">WAL Token</Link>
                <Link href="#" className="hover:text-white transition-colors">Use WAL</Link>
                <Link href="#" className="hover:text-white transition-colors flex items-center gap-1 group w-max">
                  Blog <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* Build */}
            <div className="flex flex-col gap-5">
              <h3 className="text-[10px] font-semibold tracking-widest text-[#A085FF] uppercase">Build</h3>
              <div className="flex flex-col gap-4 text-sm text-[#a1a1aa]">
                <Link href="/builder" className="hover:text-white transition-colors flex items-center gap-1 group w-max">
                  Builder <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link href="/forms" className="hover:text-white transition-colors">Dashboard</Link>
                <Link href="#" className="hover:text-white transition-colors">Ecosystem</Link>
                <Link href="https://github.com/walrusforms" target="_blank" className="hover:text-white transition-colors flex items-center gap-1 group w-max">
                  GitHub <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* Use Cases */}
            <div className="flex flex-col gap-5">
              <h3 className="text-[10px] font-semibold tracking-widest text-[#A085FF] uppercase">Use Cases</h3>
              <div className="flex flex-col gap-4 text-sm text-[#a1a1aa]">
                <Link href="#" className="hover:text-white transition-colors">Decentralized Voting</Link>
                <Link href="#" className="hover:text-white transition-colors">Secure Feedback</Link>
                <Link href="#" className="hover:text-white transition-colors">DeFi Surveys</Link>
              </div>
            </div>

            {/* About */}
            <div className="flex flex-col gap-5">
              <h3 className="text-[10px] font-semibold tracking-widest text-[#A085FF] uppercase">About</h3>
              <div className="flex flex-col gap-4 text-sm text-[#a1a1aa]">
                <Link href="#" className="hover:text-white transition-colors flex items-center gap-1 group w-max">
                  Privacy <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link href="#" className="hover:text-white transition-colors flex items-center gap-1 group w-max">
                  Terms of Service <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link href="#" className="hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
          </div>

          {/* Right Section: CTA & Socials */}
          <div className="flex flex-col items-start lg:items-end gap-6">
            <Link 
              href="/builder" 
              className="group flex items-center gap-3 rounded-full border border-white/10 bg-transparent px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-white hover:text-black hover:border-white"
            >
              Go to Builder
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <div className="flex items-center gap-5 text-white/70">
              <a href="#" className="hover:text-white transition-colors"><SocialIcon path={ICONS.discord} /></a>
              <a href="#" className="hover:text-white transition-colors"><SocialIcon path={ICONS.github} /></a>
              <a href="#" className="hover:text-white transition-colors"><SocialIcon path={ICONS.x} /></a>
            </div>
          </div>
        </div>

        {/* Bottom Section: Copyright & Giant Text */}
        <div className="relative mt-auto flex flex-col pt-8">
          <div className="w-full flex justify-end z-10 mb-[-2rem] md:mb-[-4rem]">
            <p className="text-[10px] text-white/40">
              © {currentYear} Copyright WalrusForms Foundation. All rights reserved.
            </p>
          </div>
          
          {/* Giant Parallax Text */}
          <div className="w-full overflow-hidden flex justify-center -mb-4 lg:-mb-8 pointer-events-none select-none">
            <motion.h1 
              style={{ y }}
              className="text-[16vw] font-black tracking-tighter text-white leading-[0.8] opacity-95"
            >
              WALRUSFORMS
            </motion.h1>
          </div>
        </div>
      </div>
    </footer>
  );
}
