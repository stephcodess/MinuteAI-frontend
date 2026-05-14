import Hero from './components/Hero'
import StatsStrip from './components/StatsStrip'
import TrustBar from './components/TrustBar'
import CompanyLogos from './components/CompanyLogos'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import Integrations from './components/Integrations'
import AppDownload from './components/AppDownload'
import Security from './components/Security'
import Testimonials from './components/Testimonials'
import CallToAction from './components/CallToAction'
import Footer from './components/Footer'

export default function Landing() {
  return (
    <div className="overflow-x-hidden bg-[#080b14]">
      <Hero />
      <StatsStrip />
      <TrustBar />
      <CompanyLogos />
      <HowItWorks />
      <Features />
      <Integrations />
      <AppDownload />
      <Security />
      <Testimonials />
      <CallToAction />
      <Footer />
    </div>
  )
}
