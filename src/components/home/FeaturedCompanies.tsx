import React from 'react';
import { motion } from 'framer-motion';
import { Building2, ArrowUpRight, Sparkles } from 'lucide-react';

interface FeaturedCompaniesProps {
  companies: string[];
  onCompanyClick: (company: string) => void;
}

export const FeaturedCompanies: React.FC<FeaturedCompaniesProps> = ({
  companies,
  onCompanyClick,
}) => {
  if (!companies || companies.length === 0) {
    return null;
  }

  const displayList = companies.slice(0, 12);

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 font-display flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Top Employers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
            Companies Actively Hiring on Mana Naukari
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {displayList.map((company, index) => {
          const initials = company
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'CO';

          return (
            <motion.button
              key={index}
              whileHover={{ y: -4, scale: 1.025 }}
              transition={{ duration: 0.2 }}
              onClick={() => onCompanyClick(company)}
              className="card-modern p-4 text-center group flex flex-col items-center justify-between cursor-pointer h-32 border border-slate-200/90 hover:border-indigo-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-50 to-blue-50/50 border border-slate-200/80 flex items-center justify-center text-blue-700 font-bold font-display text-xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300 shadow-2xs">
                {initials}
              </div>

              <div className="w-full">
                <span className="block text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                  {company}
                </span>
                <span className="text-[10px] text-slate-400 font-medium inline-flex items-center gap-0.5 mt-0.5 group-hover:text-indigo-600 transition-colors">
                  View Openings <ArrowUpRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
