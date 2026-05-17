"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    step: "01",
    title: "Build your form",
    description: "Use the drag-and-drop builder to design your form. Choose from 15 field types. Optionally enable AI generation — just describe your form in plain English.",
  },
  {
    step: "02",
    title: "Publish on-chain",
    description: "Your form schema is uploaded to Walrus and registered as a Form object on Sui. You receive a shareable link and an on-chain object ID.",
  },
  {
    step: "03",
    title: "Collect submissions",
    description: "Anyone with the link can submit. Each submission is stored on Walrus and a SubmissionReceipt object is minted on Sui — cryptographically tied to your form.",
  },
  {
    step: "04",
    title: "Analyze & export",
    description: "Review submissions in the real-time dashboard. Run AI analysis to surface themes. Export to CSV. All operations are auditable on-chain.",
  },
];

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 bg-[var(--bg-base)]" aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-20 text-center"
        >
          <h2 id="how-heading" className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">
            How it works
          </h2>
          <p className="mt-6 text-lg text-[var(--text-secondary)]">Four steps from idea to cryptographically verifiable form.</p>
        </motion.div>

        <div ref={containerRef} className="relative mx-auto max-w-5xl">
          {/* Vertical line connecting timeline nodes */}
          <div className="absolute left-[27px] top-6 bottom-6 w-1 rounded-full bg-[var(--border-default)] md:left-1/2 md:-ml-[2px] overflow-hidden">
            <motion.div 
              className="w-full h-full bg-gradient-to-b from-[var(--color-brand-400)] to-[var(--color-brand-600)] shadow-[0_0_10px_var(--color-brand-500)] origin-top"
              style={{ scaleY: scrollYProgress }}
            />
          </div>

          <div className="space-y-16">
          {steps.map(({ step, title, description }, index) => (
            <motion.div 
              key={step} 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-150px" }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className={`relative flex flex-col md:flex-row items-center ${index % 2 === 0 ? "md:flex-row-reverse" : ""}`}
            >
              {/* Timeline node */}
              <div className="absolute left-0 flex h-14 w-14 items-center justify-center rounded-full border-[6px] border-[var(--bg-base)] bg-[var(--color-brand-500)] text-white shadow-lg md:left-1/2 md:-ml-7 z-10 transition-transform hover:scale-110">
                <span className="font-black tracking-widest text-sm">{step}</span>
              </div>
              
              {/* Content Card */}
              <div className={`ml-20 md:ml-0 md:w-1/2 w-full ${index % 2 === 0 ? "md:pl-16" : "md:pr-16"}`}>
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="relative rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 shadow-sm transition-all duration-300 hover:border-[var(--color-brand-500)] hover:shadow-xl hover:shadow-[var(--color-brand-500)]/10"
                >
                  <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-[var(--color-brand-500)]/20 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100 pointer-events-none" />
                  <h3 className="mb-4 text-2xl font-bold text-[var(--text-primary)] tracking-tight">{title}</h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed text-base">{description}</p>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
