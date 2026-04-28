import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { LinkedInShare } from './LinkedInShare';

interface ComparisonCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  delay?: number;
  shareId: string;
  shareText: string;
}

export function ComparisonCard({ title, icon, children, delay = 0, shareId, shareText }: ComparisonCardProps) {
  return (
    <motion.div
      id={shareId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="rounded-lg border border-white/70 bg-white p-5 shadow-xl shadow-black/15 sm:p-8"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#14212b] text-[#ff7a18]">
          {icon}
        </div>
        <h3 className="text-xl font-black text-[#14212b]">{title}</h3>
      </div>
      {children}
      <LinkedInShare chartId={shareId} suggestedPost={shareText} />
    </motion.div>
  );
}
