import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Dr. Amara Nwosu',
    role: 'Research Supervisor, UCL',
    initial: 'A',
    gradient: 'from-violet-500 to-indigo-500',
    quote:
      'I used to spend 45 minutes writing up our group meetings. MinuteAI does it in 90 seconds. The structure is better than what I wrote manually.',
    stars: 5,
  },
  {
    name: 'James Farrell',
    role: 'Project Manager, Deloitte',
    initial: 'J',
    gradient: 'from-fuchsia-500 to-violet-500',
    quote:
      'Our whole team adopted it within a week. The action items table alone saves us hours of follow-up confusion every month.',
    stars: 5,
  },
  {
    name: 'Sofia Martins',
    role: 'Operations Lead, Techstars',
    initial: 'S',
    gradient: 'from-indigo-500 to-sky-500',
    quote:
      'Tried Otter, Fireflies, and a few others. MinuteAI is the only one that actually gives me a document I can send without editing.',
    stars: 5,
  },
]

export default function Testimonials() {
  const headingRef = useRef(null)
  const headingInView = useInView(headingRef, { once: true })

  return (
    <section className="bg-[#0a0d18] py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Heading */}
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headingInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
          className="mb-14 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
            Testimonials
          </span>
          <h2 className="text-3xl font-black text-white sm:text-4xl">
            Loved by teams everywhere
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map(({ name, role, initial, gradient, quote, stars }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.22 }}
                className="flex h-full flex-col rounded-3xl border border-white/8 bg-white/[0.04] p-6 backdrop-blur-sm"
              >
                {/* Stars */}
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: stars }).map((_, j) => (
                    <Star key={j} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="mb-6 flex-1 text-sm leading-relaxed text-slate-300">
                  "{quote}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white`}
                  >
                    {initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-slate-500">{role}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
