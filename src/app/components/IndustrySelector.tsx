import { ChevronDown } from 'lucide-react';

interface IndustrySelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  industries: string[];
  color: string;
}

export function IndustrySelector({ label, value, onChange, industries, color }: IndustrySelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-gray-600">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-6 py-4 bg-white border-2 rounded-2xl appearance-none cursor-pointer transition-all hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-20 ${color}`}
        >
          <option value="">Select industry...</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
