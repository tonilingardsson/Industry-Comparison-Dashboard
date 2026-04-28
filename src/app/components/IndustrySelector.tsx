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
      <label className="text-sm font-bold text-[#14212b]">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full cursor-pointer appearance-none rounded-lg border-2 bg-[#f8fafb] px-5 py-4 pr-12 text-[#14212b] transition-all hover:bg-white hover:shadow-md focus:bg-white focus:outline-none focus:ring-4 focus:ring-opacity-20 ${color}`}
        >
          <option value="">Select industry...</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#526371]" />
      </div>
    </div>
  );
}
