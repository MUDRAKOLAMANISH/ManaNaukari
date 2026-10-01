import React from 'react';
import { motion } from 'framer-motion';
import { 
  Code2, BarChart3, GraduationCap, Laptop, 
  Headphones, LineChart, ArrowRight, Sparkles 
} from 'lucide-react';

interface FeaturedCategoriesProps {
  onSelectCategory: (categoryName: string, jobType?: string) => void;
  categoryCounts: Record<string, number>;
}

export const FeaturedCategories: React.FC<FeaturedCategoriesProps> = ({
  onSelectCategory,
}) => {
  const categories = [
    {
      name: 'Software Engineering',
      queryCat: 'Software Engineering',
      icon: <Code2 className="w-5 h-5 text-blue-600" />,
      description: 'Full Stack, Backend, Frontend, React, Java & Python',
      color: 'bg-blue-50 border-blue-200/80 group-hover:bg-blue-600',
      badge: 'High Demand',
    },
    {
      name: 'Data & Analytics',
      queryCat: 'Data & Analytics',
      icon: <BarChart3 className="w-5 h-5 text-indigo-600" />,
      description: 'SQL, Python, PowerBI, Machine Learning & AI',
      color: 'bg-indigo-50 border-indigo-200/80 group-hover:bg-indigo-600',
      badge: 'Trending',
    },
    {
      name: 'Freshers & Internships',
      queryCat: 'All',
      jobType: 'Internship',
      icon: <GraduationCap className="w-5 h-5 text-purple-600" />,
      description: '2024, 2025 & 2026 Batch Campus & Off-Campus Drives',
      color: 'bg-purple-50 border-purple-200/80 group-hover:bg-purple-600',
      badge: 'Freshers',
    },
    {
      name: 'Work From Home (WFH)',
      queryCat: 'All',
      jobType: 'Remote',
      icon: <Laptop className="w-5 h-5 text-teal-600" />,
      description: '100% remote software & analyst roles across India',
      color: 'bg-teal-50 border-teal-200/80 group-hover:bg-teal-600',
      badge: 'Remote',
    },
    {
      name: 'Operations & Support',
      queryCat: 'Operations & Support',
      icon: <Headphones className="w-5 h-5 text-emerald-600" />,
      description: 'Technical support, associate engineer & operations',
      color: 'bg-emerald-50 border-emerald-200/80 group-hover:bg-emerald-600',
      badge: 'Immediate',
    },
    {
      name: 'Product & Business',
      queryCat: 'Product & Business',
      icon: <LineChart className="w-5 h-5 text-amber-600" />,
      description: 'Product analyst, business consulting & agile execution',
      color: 'bg-amber-50 border-amber-200/80 group-hover:bg-amber-600',
      badge: 'Growing',
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 font-display flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Disciplines</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
            Browse Opportunities by Domain
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {categories.map((cat, idx) => (
          <motion.button
            key={idx}
            whileHover={{ y: -4, scale: 1.015 }}
            transition={{ duration: 0.25 }}
            onClick={() => onSelectCategory(cat.queryCat, cat.jobType)}
            className="group card-modern p-5 text-left flex flex-col justify-between cursor-pointer border border-slate-200/90 hover:border-indigo-300"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-2xl ${cat.color} border flex items-center justify-center transition-colors duration-200 shadow-2xs`}>
                  {React.cloneElement(cat.icon, {
                    className: 'w-5 h-5 text-current group-hover:text-white transition-colors duration-200',
                  })}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  {cat.badge}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors font-display">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="text-blue-600 font-semibold inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Browse Live Jobs <ArrowRight className="w-3 h-3" />
              </span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[10px]">
                Verified
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
};
