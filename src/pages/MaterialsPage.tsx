import React, { useState, useEffect } from 'react';
import { Search, Download, ExternalLink, Eye, BookOpen, Star, FileText, FileCode, CheckCircle } from 'lucide-react';
import { materialsService } from '../services/materialsService';
import { Material, MaterialResourceType } from '../types/database.types';

const CATEGORIES = [
  'All',
  'Aptitude & Reasoning',
  'Coding Notes',
  'Interview Cheat Sheets',
  'Resume Templates',
  'Govt Exam Syllabus',
  'General'
];

export const MaterialsPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasTableError, setHasTableError] = useState(false);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await materialsService.getMaterials({
      search: searchQuery,
      category: selectedCategory === 'All' ? undefined : selectedCategory,
    });
    if (error) {
      console.error('[Materials] Error loading materials:', error);
      if (error.message?.includes('materials') || error.message?.includes('relation') || error.message?.includes('cache')) {
        setHasTableError(true);
      }
    } else if (data) {
      setMaterials(data);
      setHasTableError(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMaterials();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMaterials();
  };

  const handleView = async (material: Material) => {
    // Track view event
    materialsService.trackView(material.id);
    
    // Open the resource
    const targetUrl = material.file_url || material.external_link;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      showToast('This resource does not have an active link.', 'error');
    }
  };

  const handleDownload = async (material: Material) => {
    // Track download event
    materialsService.trackDownload(material.id);

    const targetUrl = material.file_url || material.external_link;
    if (targetUrl) {
      // Show success message
      showToast(`Downloading "${material.title}"...`, 'success');
      
      // Force download or open in tab
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.setAttribute('download', material.title);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      showToast('Download link is missing for this resource.', 'error');
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getResourceIcon = (type: MaterialResourceType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-8 h-8 text-rose-500 shrink-0" />;
      case 'DOCX':
        return <FileText className="w-8 h-8 text-blue-500 shrink-0" />;
      case 'PPTX':
        return <FileText className="w-8 h-8 text-amber-500 shrink-0" />;
      case 'ZIP':
        return <BookOpen className="w-8 h-8 text-indigo-500 shrink-0" />;
      case 'LINK':
        return <ExternalLink className="w-8 h-8 text-emerald-500 shrink-0" />;
      default:
        return <FileText className="w-8 h-8 text-slate-500 shrink-0" />;
    }
  };

  const getResourceBadgeColor = (type: MaterialResourceType) => {
    switch (type) {
      case 'PDF':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'DOCX':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PPTX':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ZIP':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'LINK':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const featuredMaterials = materials.filter(m => m.is_featured);
  const otherMaterials = materials.filter(m => !m.is_featured);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-slide-up border border-slate-800">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>100% Free Study Resources</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-slate-900 leading-none">
            Placement Prep &amp; Career Materials
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold max-w-xl mx-auto leading-relaxed">
            Download verified study notes, resume templates, interview cheat sheets, and solved aptitude questions to accelerate your job prep.
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Categories Horizontal Scrolling */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:max-w-3xl pb-2 md:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-xs shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prep notes..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-semibold placeholder:text-slate-400"
            />
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          </form>
        </div>

        {loading ? (
          /* Loading Skeleton Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 animate-pulse">
                <div className="h-10 w-10 bg-slate-100 rounded-2xl" />
                <div className="h-6 w-3/4 bg-slate-100 rounded-lg" />
                <div className="h-4 w-5/6 bg-slate-100 rounded-lg" />
                <div className="h-10 w-full bg-slate-100 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : hasTableError ? (
          /* Graceful Table-Missing State for candidates */
          <div className="text-center py-16 bg-white border border-slate-200/80 rounded-[32px] space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-100">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Study Materials System is Initializing</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
                We are preparing placement prep notes and study materials. Please check back in a few minutes!
              </p>
            </div>
          </div>
        ) : materials.length === 0 ? (
          /* Empty Search State */
          <div className="text-center py-16 bg-white border border-slate-200/80 rounded-[32px] space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">No resources found</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
                We couldn't find any study materials matching your search. Try resetting the filters.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* 1. Featured Resources Shelf */}
            {featuredMaterials.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    Featured Materials
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredMaterials.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-gradient-to-br from-amber-50/20 via-white to-white rounded-[28px] border border-amber-200/60 hover:border-emerald-500/50 shadow-2xs hover:shadow-lg transition-all duration-300 p-6 flex flex-col justify-between space-y-4"
                    >
                      {/* Featured Indicator Ribbon */}
                      <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-600" />
                        <span>Featured</span>
                      </span>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3">
                          {getResourceIcon(item.resource_type)}
                          <span className={`px-2 py-0.5 text-[10px] font-black border uppercase tracking-wider rounded-md ${getResourceBadgeColor(item.resource_type)}`}>
                            {item.resource_type}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
                            {item.description || 'No description available.'}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions / Stats */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-[10.5px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {item.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" />
                            {item.downloads} grabs
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleView(item)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                            title="Preview resource"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(item)}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all cursor-pointer"
                            title="Download resource"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. All / Category Materials Shelf */}
            <div className="space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {selectedCategory === 'All' ? 'All Study Guides & Notes' : `${selectedCategory}`}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherMaterials.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-white rounded-[28px] border border-slate-200/80 hover:border-emerald-500/50 shadow-2xs hover:shadow-lg transition-all duration-300 p-6 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {getResourceIcon(item.resource_type)}
                          <span className={`px-2 py-0.5 text-[10px] font-black border uppercase tracking-wider rounded-md ${getResourceBadgeColor(item.resource_type)}`}>
                            {item.resource_type}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          {item.category}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
                          {item.description || 'No description available.'}
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions / Stats */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-[10.5px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {item.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          {item.downloads}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleView(item)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                          title="Preview resource"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all cursor-pointer"
                          title="Download resource"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
