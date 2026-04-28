import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Factory, MapPin, TrendingUp } from 'lucide-react';
import { IndustrySelector } from './components/IndustrySelector';
import { ComparisonCard } from './components/ComparisonCard';
import { EmissionsChart } from './components/EmissionsChart';
import { FacilitiesComparison } from './components/FacilitiesComparison';
import { GeographicSpread } from './components/GeographicSpread';
import brandLogo from '../assets/branding/icons-of-colorful.png';
import brandPhoto from '../assets/branding/logo-with-image.jpg';

// Mock data for industries
const industries = [
  'Manufacturing',
  'Energy Production',
  'Chemical Processing',
  'Waste Management',
  'Metal Production',
  'Food Processing',
  'Textile Industry',
  'Pharmaceutical',
];

// Mock data generator
function generateMockData(industry1: string, industry2: string) {
  const emissionsData = Array.from({ length: 10 }, (_, i) => ({
    year: 2016 + i,
    industry1: Math.floor(Math.random() * 50000 + 20000),
    industry2: Math.floor(Math.random() * 50000 + 20000),
  }));

  const facilities = {
    count1: Math.floor(Math.random() * 500 + 100),
    count2: Math.floor(Math.random() * 500 + 100),
  };

  const locations1 = Array.from({ length: 8 }, () => ({
    country: ['Germany', 'France', 'Poland', 'Spain', 'Italy'][Math.floor(Math.random() * 5)],
    lat: Math.random() * 20 + 45,
    lon: Math.random() * 30 - 5,
  }));

  const locations2 = Array.from({ length: 8 }, () => ({
    country: ['Germany', 'France', 'Poland', 'Spain', 'Italy'][Math.floor(Math.random() * 5)],
    lat: Math.random() * 20 + 45,
    lon: Math.random() * 30 - 5,
  }));

  return { emissionsData, facilities, locations1, locations2 };
}

export default function App() {
  const [industry1, setIndustry1] = useState('');
  const [industry2, setIndustry2] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  const handleCompare = () => {
    if (industry1 && industry2 && industry1 !== industry2) {
      setShowComparison(true);
    }
  };

  const mockData = industry1 && industry2 ? generateMockData(industry1, industry2) : null;

  return (
    <div className="min-h-screen bg-[#111b24] text-[#14212b]">
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(17, 27, 36, 0.42), rgba(17, 27, 36, 0.88)), url(${brandPhoto})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative container mx-auto px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-12 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white shadow-lg shadow-black/15">
              <span className="text-3xl font-black leading-none text-[#f3703d]">Of</span>
            </div>
            <img src={brandLogo} alt="Icons Of" className="h-9 w-auto max-w-[180px] object-contain" />
          </div>
          <div className="hidden rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur sm:block">
            Nordic open data prototype
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 max-w-4xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#ff7a18]" />
            Industry emissions comparison
          </div>
          <h1 className="mb-5 text-5xl font-black leading-none text-white sm:text-6xl lg:text-7xl">
            Industry Duel
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-white/72">
            Compare emission trends, facilities, and geographic spread with an Icons Of inspired interface built around bold color, clear contrast, and open data.
          </p>
        </motion.div>

        {/* Industry Selectors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto max-w-5xl"
        >
          <div className="mb-8 rounded-lg border border-white/20 bg-white p-5 shadow-2xl shadow-black/25 sm:p-8">
            <div className="mb-8 grid gap-6 md:grid-cols-2">
              <IndustrySelector
                label="First Industry"
                value={industry1}
                onChange={setIndustry1}
                industries={industries}
                color="border-[#25a9e0]/30 focus:border-[#25a9e0] focus:ring-[#25a9e0]"
              />
              <IndustrySelector
                label="Second Industry"
                value={industry2}
                onChange={setIndustry2}
                industries={industries}
                color="border-[#f05a9d]/30 focus:border-[#f05a9d] focus:ring-[#f05a9d]"
              />
            </div>
            <button
              onClick={handleCompare}
              disabled={!industry1 || !industry2 || industry1 === industry2}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f3703d] px-6 py-4 font-bold text-white shadow-lg shadow-[#f3703d]/25 transition-all hover:bg-[#ff7a18] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-45"
            >
              Compare Industries
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        {/* Comparison Results */}
        {showComparison && mockData && (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Emissions Trends */}
            <ComparisonCard
              title="Emission Trends (2016-2025)"
              icon={<TrendingUp className="w-6 h-6" />}
              delay={0.3}
              shareId="emission-trends"
              shareText={`I compared emission trends for ${industry1} and ${industry2} in Industry Duel, an Icons Of open data dashboard for exploring industrial impact across Europe.`}
            >
              <EmissionsChart
                industry1={industry1}
                industry2={industry2}
                data={mockData.emissionsData}
              />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="border-l-4 border-[#25a9e0] bg-[#eef9fd] p-4">
                  <p className="mb-1 text-sm text-[#526371]">Average annual emissions</p>
                  <p className="text-2xl font-black text-[#168fca]">
                    {(mockData.emissionsData.reduce((sum, d) => sum + d.industry1, 0) / mockData.emissionsData.length).toFixed(0).toLocaleString()} t
                  </p>
                  <p className="mt-1 text-xs text-[#526371]">{industry1}</p>
                </div>
                <div className="border-l-4 border-[#f05a9d] bg-[#fff0f7] p-4">
                  <p className="mb-1 text-sm text-[#526371]">Average annual emissions</p>
                  <p className="text-2xl font-black text-[#d83d87]">
                    {(mockData.emissionsData.reduce((sum, d) => sum + d.industry2, 0) / mockData.emissionsData.length).toFixed(0).toLocaleString()} t
                  </p>
                  <p className="mt-1 text-xs text-[#526371]">{industry2}</p>
                </div>
              </div>
            </ComparisonCard>

            {/* Number of Facilities */}
            <ComparisonCard
              title="Number of Facilities"
              icon={<Factory className="w-6 h-6" />}
              delay={0.4}
              shareId="facility-counts"
              shareText={`I compared facility counts for ${industry1} and ${industry2} in Industry Duel. The dashboard makes European industrial data easier to scan and discuss.`}
            >
              <FacilitiesComparison
                industry1={industry1}
                industry2={industry2}
                count1={mockData.facilities.count1}
                count2={mockData.facilities.count2}
              />
              <div className="mt-4 text-center">
                <p className="text-sm text-[#526371]">
                  {mockData.facilities.count1 > mockData.facilities.count2 ? (
                    <span><strong>{industry1}</strong> has <strong>{Math.abs(mockData.facilities.count1 - mockData.facilities.count2)}</strong> more facilities</span>
                  ) : mockData.facilities.count2 > mockData.facilities.count1 ? (
                    <span><strong>{industry2}</strong> has <strong>{Math.abs(mockData.facilities.count1 - mockData.facilities.count2)}</strong> more facilities</span>
                  ) : (
                    <span>Both industries have an equal number of facilities</span>
                  )}
                </p>
              </div>
            </ComparisonCard>

            {/* Geographic Spread */}
            <ComparisonCard
              title="Geographic Distribution"
              icon={<MapPin className="w-6 h-6" />}
              delay={0.5}
              shareId="geographic-distribution"
              shareText={`I explored the geographic distribution of ${industry1} and ${industry2} facilities in Industry Duel, using open data to compare industrial footprints across Europe.`}
            >
              <GeographicSpread
                industry1={industry1}
                industry2={industry2}
                locations1={mockData.locations1}
                locations2={mockData.locations2}
              />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="border-l-4 border-[#25a9e0] bg-[#eef9fd] p-4 text-center">
                  <p className="mb-1 text-sm text-[#526371]">Facilities across Europe</p>
                  <p className="text-2xl font-black text-[#168fca]">{mockData.locations1.length} countries</p>
                  <p className="mt-1 text-xs text-[#526371]">{industry1}</p>
                </div>
                <div className="border-l-4 border-[#f05a9d] bg-[#fff0f7] p-4 text-center">
                  <p className="mb-1 text-sm text-[#526371]">Facilities across Europe</p>
                  <p className="text-2xl font-black text-[#d83d87]">{mockData.locations2.length} countries</p>
                  <p className="mt-1 text-xs text-[#526371]">{industry2}</p>
                </div>
              </div>
            </ComparisonCard>
          </div>
        )}

        {/* Data Source Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center text-sm text-white/56"
        >
          <p>Data sources: E-PRTR (F1_2, F1_4), SCB REST API, OECD</p>
          <p className="mt-1">Mock data used for demonstration purposes</p>
        </motion.div>
      </div>
    </div>
  );
}
