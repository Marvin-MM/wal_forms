"use client";
import { motion } from "framer-motion";

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
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6" aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 id="how-heading" className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)]">Four steps from idea to cryptographically verifiable form.</p>
        </motion.div>

        <div className="relative mx-auto max-w-4xl">
          {/* Vertical line connecting timeline nodes */}
          <div className="absolute left-[27px] top-8 bottom-8 w-1 bg-gradient-to-b from-[var(--color-brand-500)]/50 via-[var(--color-brand-500)]/20 to-transparent md:left-1/2 md:-ml-[2px]" />

          <div className="space-y-12">
          {steps.map(({ step, title, description }, index) => (
            <motion.div 
              key={step} 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className={`relative flex flex-col md:flex-row items-start ${index % 2 === 0 ? "md:flex-row-reverse" : ""}`}
            >
              {/* Timeline node */}
              <div className="absolute left-0 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[var(--bg-base)] bg-gradient-to-br from-[var(--color-brand-400)] to-[var(--color-brand-600)] text-white shadow-lg md:left-1/2 md:-ml-7 z-10">
                <span className="font-bold tracking-wider">{step}</span>
              </div>
              
              {/* Content Card */}
              <div className="ml-20 md:ml-0 md:w-1/2 md:px-12 w-full">
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 shadow-sm transition-colors hover:border-[var(--color-brand-500)]/40 hover:shadow-xl"
                >
                  <h3 className="mb-3 text-xl font-bold text-[var(--text-primary)]">{title}</h3>
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
