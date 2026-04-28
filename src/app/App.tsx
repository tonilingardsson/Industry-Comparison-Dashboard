import { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Factory, MapPin, TrendingUp } from 'lucide-react';
import { IndustrySelector } from './components/IndustrySelector';
import { ComparisonCard } from './components/ComparisonCard';
import { EmissionsChart } from './components/EmissionsChart';
import { FacilitiesComparison } from './components/FacilitiesComparison';
import { GeographicSpread } from './components/GeographicSpread';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg mb-6">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">Industry Emissions Comparison</span>
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Industry Duel
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            How clean is your industry? Compare emission trends, facilities, and geographic spread across Europe.
          </p>
        </motion.div>

        {/* Industry Selectors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <IndustrySelector
                label="First Industry"
                value={industry1}
                onChange={setIndustry1}
                industries={industries}
                color="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              />
              <IndustrySelector
                label="Second Industry"
                value={industry2}
                onChange={setIndustry2}
                industries={industries}
                color="border-purple-200 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={handleCompare}
              disabled={!industry1 || !industry2 || industry1 === industry2}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Compare Industries
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
            >
              <EmissionsChart
                industry1={industry1}
                industry2={industry2}
                data={mockData.emissionsData}
              />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Average Annual Emissions</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(mockData.emissionsData.reduce((sum, d) => sum + d.industry1, 0) / mockData.emissionsData.length).toFixed(0).toLocaleString()} t
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{industry1}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Average Annual Emissions</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {(mockData.emissionsData.reduce((sum, d) => sum + d.industry2, 0) / mockData.emissionsData.length).toFixed(0).toLocaleString()} t
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{industry2}</p>
                </div>
              </div>
            </ComparisonCard>

            {/* Number of Facilities */}
            <ComparisonCard
              title="Number of Facilities"
              icon={<Factory className="w-6 h-6" />}
              delay={0.4}
            >
              <FacilitiesComparison
                industry1={industry1}
                industry2={industry2}
                count1={mockData.facilities.count1}
                count2={mockData.facilities.count2}
              />
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
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
            >
              <GeographicSpread
                industry1={industry1}
                industry2={industry2}
                locations1={mockData.locations1}
                locations2={mockData.locations2}
              />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Facilities across Europe</p>
                  <p className="text-2xl font-bold text-blue-600">{mockData.locations1.length} countries</p>
                  <p className="text-xs text-gray-500 mt-1">{industry1}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Facilities across Europe</p>
                  <p className="text-2xl font-bold text-purple-600">{mockData.locations2.length} countries</p>
                  <p className="text-xs text-gray-500 mt-1">{industry2}</p>
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
          className="text-center mt-16 text-sm text-gray-500"
        >
          <p>Data sources: E-PRTR (F1_2, F1_4), SCB REST API, OECD</p>
          <p className="mt-1">Mock data used for demonstration purposes</p>
        </motion.div>
      </div>
    </div>
  );
}