import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Eye, Download, Search, CheckCircle, AlertCircle, Sparkles, Star, ArrowLeft, Upload, Link, EyeOff, Database, Copy } from 'lucide-react';
import { materialsService } from '../../services/materialsService';
import { Material, MaterialResourceType, MaterialStatus } from '../../types/database.types';
import { AdminHeader } from '../../components/admin/AdminHeader';

const CATEGORIES = [
  'Aptitude & Reasoning',
  'Coding Notes',
  'Interview Cheat Sheets',
  'Resume Templates',
  'Govt Exam Syllabus',
  'General'
];

export const AdminMaterialsPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form/Editor states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Input fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<MaterialResourceType>('PDF');
  const [category, setCategory] = useState('General');
  const [status, setStatus] = useState<MaterialStatus>('active');
  const [isFeatured, setIsFeatured] = useState(false);
  const [externalLink, setExternalLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState('');
  const [hasTableError, setHasTableError] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await materialsService.getAllMaterialsForAdmin();
    if (error) {
      console.error('[AdminMaterials] Error fetching materials:', error);
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
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenCreateForm = () => {
    setEditingMaterial(null);
    setTitle('');
    setDescription('');
    setResourceType('PDF');
    setCategory('General');
    setStatus('active');
    setIsFeatured(false);
    setExternalLink('');
    setSelectedFile(null);
    setExistingFileUrl('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (material: Material) => {
    setEditingMaterial(material);
    setTitle(material.title);
    setDescription(material.description || '');
    setResourceType(material.resource_type);
    setCategory(material.category);
    setStatus(material.status);
    setIsFeatured(material.is_featured);
    setExternalLink(material.external_link || '');
    setSelectedFile(null);
    setExistingFileUrl(material.file_url || '');
    setIsFormOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Auto-detect resource type from extension
      const ext = file.name.split('.').pop()?.toUpperCase();
      if (ext === 'PDF') setResourceType('PDF');
      else if (ext === 'DOC' || ext === 'DOCX') setResourceType('DOCX');
      else if (ext === 'PPT' || ext === 'PPTX') setResourceType('PPTX');
      else if (ext === 'ZIP' || ext === 'RAR') setResourceType('ZIP');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter a title.', 'error');
      return;
    }

    setSubmitting(true);
    let uploadedUrl = existingFileUrl;

    try {
      // 1. Handle file upload if a new file is selected
      if (resourceType !== 'LINK' && selectedFile) {
        showToast('Uploading resource file to Supabase Storage...', 'success');
        const { url, error: uploadErr } = await materialsService.uploadMaterialFile(selectedFile);
        if (uploadErr || !url) {
          throw new Error(uploadErr?.message || 'File upload failed.');
        }
        uploadedUrl = url;
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        resource_type: resourceType,
        file_url: resourceType === 'LINK' ? null : uploadedUrl || null,
        external_link: resourceType === 'LINK' ? externalLink.trim() : null,
        category,
        status,
        is_featured: isFeatured,
      };

      if (editingMaterial) {
        // Edit flow
        const { error } = await materialsService.updateMaterial(editingMaterial.id, payload);
        if (error) throw error;
        showToast('Resource updated successfully!', 'success');
      } else {
        // Create flow
        const { error } = await materialsService.createMaterial(payload);
        if (error) throw error;
        showToast('Resource created successfully!', 'success');
      }

      setIsFormOpen(false);
      fetchMaterials();
    } catch (err: any) {
      console.error('[AdminMaterials] Save error:', err);
      showToast(err.message || 'Failed to save material.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (material: Material) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${material.title}"?`)) {
      return;
    }

    try {
      const { success, error } = await materialsService.deleteMaterial(material.id, material.file_url);
      if (error || !success) throw error || new Error('Delete failed.');
      
      showToast('Resource deleted successfully.', 'success');
      fetchMaterials();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete resource.', 'error');
    }
  };

  // Filter materials based on search query
  const filteredMaterials = materials.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.resource_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast popup */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-slide-up border ${
          toast.type === 'success' 
            ? 'bg-slate-900 text-white border-slate-800' 
            : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header navigation bar */}
        <AdminHeader
          title="Placement Prep &amp; Material Management"
          subtitle="Upload study notes, solved question papers, resume templates, and track downloads"
          onNavigate={onNavigate}
          showAddButton={false}
          showImportButton={false}
        />

        {/* Database Migration helper banner if public.materials table is missing */}
        {hasTableError && (
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-lg border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-rose-400" />
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Database Table "materials" is Missing</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Action Required</span>
                </h4>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(MATERIALS_SQL_SCRIPT).then(() => {
                    showToast('Materials SQL script copied to clipboard!', 'success');
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL Script</span>
              </button>
            </div>
            <p className="text-xs text-slate-300">
              The <code className="text-blue-300">public.materials</code> table does not exist in your Supabase schema cache. Run this SQL query inside your Supabase SQL Editor to provision the table, indexes, and storage bucket policies instantly:
            </p>
            <pre className="bg-slate-950 p-4 rounded-xl text-slate-300 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
              {MATERIALS_SQL_SCRIPT}
            </pre>
          </div>
        )}

        {/* Back and Action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Jobs</span>
            </button>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-semibold">
              Study Materials Repository
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search materials..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-xl font-semibold"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>

            <button
              onClick={handleOpenCreateForm}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource</span>
            </button>
          </div>
        </div>

        {/* Create/Edit Editor Card Panel */}
        {isFormOpen && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md animate-fade-in space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {editingMaterial ? 'Edit Study Material Details' : 'Add New Study Material / Resource'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column Fields */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Material Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. TCS NQT 2026 Solved Aptitude Questions"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Short Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly explain what this resource is, what topics it covers, etc."
                    rows={4}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="space-y-1 flex-1">
                    <label className="text-xs font-bold text-slate-700 block">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 flex-1">
                    <label className="text-xs font-bold text-slate-700 block">Resource Type</label>
                    <select
                      value={resourceType}
                      onChange={(e) => setResourceType(e.target.value as MaterialResourceType)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="PDF">PDF Document</option>
                      <option value="DOCX">Word (.docx)</option>
                      <option value="PPTX">PowerPoint (.pptx)</option>
                      <option value="ZIP">ZIP/Archive</option>
                      <option value="LINK">External Website Link</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column Fields */}
              <div className="space-y-4">
                {/* File Upload Selector vs Link Input */}
                {resourceType === 'LINK' ? (
                  <div className="space-y-1 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4">
                    <label className="text-xs font-bold text-slate-700 block">External Link URL *</label>
                    <div className="relative mt-1">
                      <input
                        type="url"
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        placeholder="https://example.com/useful-sheets"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required={resourceType === 'LINK'}
                      />
                      <Link className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">This resource is an external URL. Candidates will be redirected there.</p>
                  </div>
                ) : (
                  <div className="space-y-2 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative">
                    <Upload className="w-8 h-8 text-slate-400 mb-1" />
                    <label className="text-xs font-bold text-slate-700">Upload {resourceType} File</label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept={resourceType === 'PDF' ? '.pdf' : resourceType === 'DOCX' ? '.doc,.docx' : resourceType === 'PPTX' ? '.ppt,.pptx' : '.zip,.rar'}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <p className="text-[10px] text-slate-400">Click to upload file from your computer</p>
                    {selectedFile ? (
                      <span className="text-xs text-emerald-600 font-extrabold mt-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                        ✓ Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    ) : existingFileUrl ? (
                      <span className="text-xs text-slate-500 font-bold mt-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl truncate max-w-xs">
                        Current file: {existingFileUrl.split('/').pop()}
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Additional controls */}
                <div className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>Featured Resource</span>
                      </label>
                      <p className="text-[10.5px] text-slate-400">Featured resources are pinned at the top of the shelf</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-800">Publishing Status</label>
                      <p className="text-[10.5px] text-slate-400">Draft resources are hidden from the public website</p>
                    </div>
                    <div className="flex bg-slate-200/60 p-0.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setStatus('active')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          status === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus('draft')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          status === 'draft' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Draft
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form submit buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? 'Saving Resource...' : editingMaterial ? 'Save Changes' : 'Create Resource'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Materials Database List Grid/Table */}
        <div className="bg-white border border-slate-200/80 rounded-[32px] overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Study Resource Database ({filteredMaterials.length})
            </h3>
            <span className="text-xs text-slate-400">Live Database Synced</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs sm:text-sm font-semibold animate-pulse">
              Syncing materials table logs...
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <span className="text-3xl">📂</span>
              <p className="text-xs sm:text-sm font-semibold">No materials uploaded yet. Click "Add Resource" to start.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-5">Resource Title</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4 text-center">Featured</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Views</th>
                    <th className="py-3.5 px-4 text-center">Downloads</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-5">
                        <div className="space-y-0.5 max-w-xs sm:max-w-md">
                          <div className="font-bold text-slate-800 hover:text-emerald-700 transition-colors truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium truncate">
                            {item.description || 'No description provided.'}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-500">
                        {item.category}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-black border uppercase tracking-wider rounded-md ${
                          item.resource_type === 'PDF' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          item.resource_type === 'DOCX' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          item.resource_type === 'PPTX' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          item.resource_type === 'ZIP' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {item.resource_type}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {item.is_featured ? (
                          <span className="inline-flex justify-center items-center p-1 rounded-full bg-amber-50 border border-amber-200 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        {item.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700">
                            <Eye className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 border border-slate-200 text-slate-500">
                            <EyeOff className="w-3 h-3" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-slate-700">
                        {item.views}
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-slate-700">
                        {item.downloads}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              const target = item.file_url || item.external_link;
                              if (target) window.open(target, '_blank');
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Preview Resource"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditForm(item)}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="Edit Resource"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Delete Resource"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MATERIALS_SQL_SCRIPT = `-- ============================================================================
-- SQL Migration: Notes, Links & Materials Module
-- Platform: Mana Naukari (Supabase / PostgreSQL)
-- Description:
--   Creates the public.materials table, enables RLS, adds performance indexes,
--   and configures policies for public reading/tracking and admin write access.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL, -- 'PDF', 'DOCX', 'PPTX', 'ZIP', 'LINK'
    file_url TEXT,                      -- Supabase storage link
    external_link TEXT,                 -- Custom external url
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL, -- 'active', 'draft'
    is_featured BOOLEAN DEFAULT false NOT NULL,
    views INTEGER DEFAULT 0 NOT NULL,
    downloads INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_materials_status_created ON public.materials (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials (category);
CREATE INDEX IF NOT EXISTS idx_materials_is_featured ON public.materials (is_featured) WHERE is_featured = true;

-- Enable Row Level Security (RLS)
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Allow anyone (unauthenticated candidates) to view active materials
CREATE POLICY "Allow public read on active materials" 
    ON public.materials FOR SELECT 
    USING (status = 'active');

-- 2. Policy: Allow anyone to increment views / downloads (public update)
CREATE POLICY "Allow public select and update to active materials" 
    ON public.materials FOR UPDATE 
    USING (status = 'active')
    WITH CHECK (status = 'active');

-- 3. Policy: Allow full admin write access (authenticated super_admins / service_role)
CREATE POLICY "Allow admin full access to materials" 
    ON public.materials FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create a storage bucket for 'materials' if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true) ON CONFLICT (id) DO NOTHING;

-- Storage Bucket Policies
CREATE POLICY "Allow public read on materials bucket" ON storage.objects FOR SELECT TO public USING (bucket_id = 'materials');
CREATE POLICY "Allow public uploads to materials bucket" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'materials');
CREATE POLICY "Allow admin full access to materials bucket" ON storage.objects FOR ALL USING (bucket_id = 'materials');`;
