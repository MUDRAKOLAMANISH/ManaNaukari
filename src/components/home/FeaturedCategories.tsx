import React from 'react';
import { 
  Code2, BarChart3, GraduationCap, Laptop, 
  Headphones, LineChart, ArrowRight 
} from 'lucide-react';

interface FeaturedCategoriesProps {
  onSelectCategory: (categoryName: string, jobType?: string) => void;
  categoryCounts: Record<string, number>;
}

export const FeaturedCategories: React.FC<FeaturedCategoriesProps> = ({
  onSelectCategory,
  categoryCounts,
}) => {
  const categories = [
    {
      name: 'Software Jobs',
      queryCat: 'Software Engineering',
      icon: <Code2 className="w-5 h-5 text-blue-600" />,
      description: 'Full Stack, Backend, Frontend, React & Java',
    },
    {
      name: 'Data Analyst',
      queryCat: 'Data & Analytics',
      icon: <BarChart3 className="w-5 h-5 text-blue-600" />,
      description: 'SQL, Python, PowerBI, Machine Learning',
    },
    {
      name: 'Internship',
      queryCat: 'All',
      jobType: 'Internship',
      icon: <GraduationCap className="w-5 h-5 text-blue-600" />,
      description: 'College students & 2024/2025/2026 freshers',
    },
    {
      name: 'Work From Home',
      queryCat: 'All',
      jobType: 'Remote',
      icon: <Laptop className="w-5 h-5 text-blue-600" />,
      description: '100% remote positions across Pan India',
    },
    {
      name: 'Customer Support',
      queryCat: 'Operations & Support',
      icon: <Headphones className="w-5 h-5 text-blue-600" />,
      description: 'Technical support, associate & executive',
    },
    {
      name: 'Business Analyst',
      queryCat: 'Product & Business',
      icon: <LineChart className="w-5 h-5 text-blue-600" />,
      description: 'Process consulting, agile, and research',
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 font-display">
            Explore Disciplines
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
            Featured Categories
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => onSelectCategory(cat.queryCat, cat.jobType)}
            className="group bg-white rounded-2xl border border-slate-200/90 p-5 text-left shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {React.cloneElement(cat.icon, {
                    className: 'w-5 h-5 text-blue-600 group-hover:text-white transition-colors',
                  })}
                </div>
                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  Browse <ArrowRight className="w-3.5 h-3.5" />
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

            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Direct hiring links</span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                Verified
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
