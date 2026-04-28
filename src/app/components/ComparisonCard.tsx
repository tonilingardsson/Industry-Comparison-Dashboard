import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface ComparisonCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  delay?: number;
}

export function ComparisonCard({ title, icon, children, delay = 0 }: ComparisonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}
