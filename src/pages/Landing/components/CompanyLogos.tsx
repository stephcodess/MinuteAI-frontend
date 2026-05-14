import { motion } from 'framer-motion'

const companies = [
  'Deloitte', 'McKinsey', 'Shopify', 'HubSpot', 'Notion',
  'Stripe', 'Linear', 'Vercel', 'Figma', 'Atlassian',
  'Salesforce', 'Twilio', 'GitHub', 'Intercom', 'Zapier',
]

function LogoItem({ name }: { name: string }) {
  return (
    <span className="inline-flex shrink-0 items-center px-8 text-sm font-bold tracking-widest text-slate-600 uppercase transition-colors duration-300 hover:text-slate-400">
      {name}
    </span>
  )
}

export default function CompanyLogos() {
  return (
    <section className="relative overflow-hidden bg-[#0a0d18] py-14">
      {/* Left + Right fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#0a0d18] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#0a0d18] to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-6 text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-700">
          Trusted by teams at
        </p>
      </motion.div>

      {/* Marquee track */}
      <div className="flex overflow-hidden">
        <motion.div
          className="flex"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
        >
          {/* Duplicate for seamless loop */}
          {[...companies, ...companies].map((name, i) => (
            <LogoItem key={`${name}-${i}`} name={name} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
