import React from 'react';
import { Building2, ArrowUpRight } from 'lucide-react';

interface FeaturedCompaniesProps {
  companies: string[];
  onCompanyClick: (company: string) => void;
}

export const FeaturedCompanies: React.FC<FeaturedCompaniesProps> = ({
  companies,
  onCompanyClick,
}) => {
  // Only display real companies from the database
  if (!companies || companies.length === 0) {
    return null;
  }

  const displayList = companies.slice(0, 12);

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 font-display">
            Top Employers
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
            Featured Companies Actively Hiring
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
            <button
              key={index}
              onClick={() => onCompanyClick(company)}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 text-center hover:border-blue-300 hover:shadow-md transition-all duration-200 group flex flex-col items-center justify-between cursor-pointer h-32"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-700 font-bold font-display text-xs group-hover:bg-blue-50 transition-colors">
                {initials}
              </div>

              <div className="w-full">
                <span className="block text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                  {company}
                </span>
                <span className="text-[10px] text-slate-400 font-medium inline-flex items-center gap-0.5 mt-0.5">
                  View Openings <ArrowUpRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
