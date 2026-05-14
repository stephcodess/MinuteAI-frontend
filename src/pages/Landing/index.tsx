import Hero from './components/Hero'
import StatsStrip from './components/StatsStrip'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import Testimonials from './components/Testimonials'
import CallToAction from './components/CallToAction'
import Footer from './components/Footer'

export default function Landing() {
  return (
    <div className="overflow-x-hidden bg-[#080b14]">
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <Features />
      <Testimonials />
      <CallToAction />
      <Footer />
    </div>
  )
}
