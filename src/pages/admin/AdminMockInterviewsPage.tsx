import React, { useState, useEffect } from 'react';
import {
  Search, RefreshCw, CheckCircle, AlertCircle, Copy, MessageSquare, Video,
  Clock, Calendar, CheckCircle2, UserCheck, HelpCircle, Eye, ArrowLeft, Trash2,
  DollarSign, FileText, Database, Send, Mail, Edit3, X, ChevronRight, Phone
} from 'lucide-react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import {
  mockInterviewService,
  MOCK_INTERVIEW_PRICE_INR,
  normalizeWhatsAppNumber
} from '../../services/mockInterviewService';
import { MockInterviewBooking, MockInterviewBookingStatus, MockInterviewPaymentStatus } from '../../types/database.types';

interface AdminMockInterviewsPageProps {
  onNavigate: (path: string) => void;
}

const SQL_MIGRATION_SCRIPT = `-- Run this in Supabase SQL Editor to create the mock_interview_bookings table:

CREATE TABLE IF NOT EXISTS public.mock_interview_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(50) NOT NULL,
    interview_topic VARCHAR(150) NOT NULL,
    custom_topic VARCHAR(150),
    experience_level VARCHAR(50) NOT NULL DEFAULT 'Fresher',
    interview_mode VARCHAR(100) NOT NULL DEFAULT 'Technical Interview',
    preferred_availability TEXT,
    additional_information TEXT,
    price_inr INTEGER NOT NULL DEFAULT 99,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    booking_status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
    admin_notes TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    interview_result TEXT,
    technical_score VARCHAR(50),
    communication_score VARCHAR(50),
    problem_solving_score VARCHAR(50),
    strengths TEXT,
    areas_for_improvement TEXT,
    recommended_next_steps TEXT,
    result_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.mock_interview_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert to mock_interview_bookings" ON public.mock_interview_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin full access to mock_interview_bookings" ON public.mock_interview_bookings FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
`;

export const AdminMockInterviewsPage: React.FC<AdminMockInterviewsPageProps> = ({ onNavigate }) => {
  const [bookings, setBookings] = useState<MockInterviewBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [hasTableError, setHasTableError] = useState(false);

  // Selected Booking Modal State
  const [selectedBooking, setSelectedBooking] = useState<MockInterviewBooking | null>(null);
  const [updating, setUpdating] = useState(false);

  // Modal Editing States
  const [adminNotes, setAdminNotes] = useState('');
  const [scheduledAtText, setScheduledAtText] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<MockInterviewPaymentStatus>('pending');
  const [bookingStatus, setBookingStatus] = useState<MockInterviewBookingStatus>('pending_payment');

  // Results Form
  const [technicalScore, setTechnicalScore] = useState('');
  const [communicationScore, setCommunicationScore] = useState('');
  const [problemSolvingScore, setProblemSolvingScore] = useState('');
  const [interviewResult, setInterviewResult] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [recommendedNextSteps, setRecommendedNextSteps] = useState('');

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBookings = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await mockInterviewService.getAllBookings();
      if (error) {
        console.error('[AdminMockInterviews] Fetch error:', error);
        if (error.message?.includes('mock_interview_bookings') || error.message?.includes('relation') || error.message?.includes('schema cache')) {
          setHasTableError(true);
        }
      } else {
        setBookings(data);
        setHasTableError(false);
      }
    } catch (err: any) {
      console.error('[AdminMockInterviews] Exception:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleOpenDetailModal = (booking: MockInterviewBooking) => {
    setSelectedBooking(booking);
    setAdminNotes(booking.admin_notes || '');
    setScheduledAtText(booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : '');
    setPaymentStatus(booking.payment_status);
    setBookingStatus(booking.booking_status);

    // Results
    setTechnicalScore(String(booking.technical_score || ''));
    setCommunicationScore(String(booking.communication_score || ''));
    setProblemSolvingScore(String(booking.problem_solving_score || ''));
    setInterviewResult(booking.interview_result || '');
    setStrengths(booking.strengths || '');
    setAreasForImprovement(booking.areas_for_improvement || '');
    setRecommendedNextSteps(booking.recommended_next_steps || '');
  };

  const handleSaveChanges = async () => {
    if (!selectedBooking) return;
    setUpdating(true);

    try {
      const updates: Partial<MockInterviewBooking> = {
        payment_status: paymentStatus,
        booking_status: bookingStatus,
        admin_notes: adminNotes.trim() || null,
        scheduled_at: scheduledAtText.trim() ? new Date(scheduledAtText).toISOString() : null,
        technical_score: technicalScore.trim() || null,
        communication_score: communicationScore.trim() || null,
        problem_solving_score: problemSolvingScore.trim() || null,
        interview_result: interviewResult.trim() || null,
        strengths: strengths.trim() || null,
        areas_for_improvement: areasForImprovement.trim() || null,
        recommended_next_steps: recommendedNextSteps.trim() || null,
      };

      const { success, data, error } = await mockInterviewService.updateBooking(selectedBooking.id, updates);
      if (error || !success) {
        throw error || new Error('Update failed');
      }

      showToast('Booking details updated successfully!', 'success');
      if (data) setSelectedBooking(data);
      fetchBookings();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update booking.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkPaymentReceived = async () => {
    if (!selectedBooking) return;
    setUpdating(true);

    try {
      const { success, data, error } = await mockInterviewService.updateBooking(selectedBooking.id, {
        payment_status: 'paid',
        booking_status: 'payment_received',
      });

      if (error || !success) throw error || new Error('Failed to update payment');

      setPaymentStatus('paid');
      setBookingStatus('payment_received');
      if (data) setSelectedBooking(data);
      showToast('Payment marked as Received (₹99 Verified)!', 'success');
      fetchBookings();
    } catch (err: any) {
      showToast(err?.message || 'Failed to mark payment.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenWhatsAppChat = (booking: MockInterviewBooking) => {
    const digitsOnly = booking.whatsapp_number.replace(/[^\d]/g, '');
    const cleanNumber = digitsOnly.startsWith('91') ? digitsOnly : `91${digitsOnly}`;

    const text = `Hi ${booking.full_name}, thank you for applying for the Mana Naukari Mock Interview.

Selected topic: ${booking.interview_topic}
Session fee: ₹${MOCK_INTERVIEW_PRICE_INR}

I will share the payment instructions and coordinate a suitable interview time with you. Once payment is verified, your session can be scheduled.

Regards,
Mana Naukari Team`;

    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSendResultsWhatsApp = async (booking: MockInterviewBooking) => {
    const digitsOnly = booking.whatsapp_number.replace(/[^\d]/g, '');
    const cleanNumber = digitsOnly.startsWith('91') ? digitsOnly : `91${digitsOnly}`;

    const dateStr = booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : 'Recent';

    const text = `Mana Naukari — Mock Interview Feedback

Candidate: ${booking.full_name}
Topic: ${booking.interview_topic}
Interview Date: ${dateStr}

Performance Summary:
${booking.interview_result || 'Solid performance with practical domain knowledge.'}

Strengths:
${booking.strengths || 'N/A'}

Areas to Improve:
${booking.areas_for_improvement || 'N/A'}

Recommended Next Steps:
${booking.recommended_next_steps || 'N/A'}

Thank you for choosing Mana Naukari. Keep practicing!`;

    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    // Update result_sent_at and status
    await mockInterviewService.updateBooking(booking.id, {
      booking_status: 'result_sent',
      result_sent_at: new Date().toISOString(),
    });

    setBookingStatus('result_sent');
    showToast('WhatsApp feedback chat opened & status updated to Result Sent!', 'success');
    fetchBookings();
  };

  const handleDelete = async (booking: MockInterviewBooking) => {
    if (!window.confirm(`Are you sure you want to delete booking for ${booking.full_name}?`)) {
      return;
    }

    const { success, error } = await mockInterviewService.deleteBooking(booking.id);
    if (success) {
      showToast('Booking deleted successfully.', 'success');
      setSelectedBooking(null);
      fetchBookings();
    } else {
      showToast(error?.message || 'Failed to delete booking.', 'error');
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.whatsapp_number.includes(searchQuery) ||
      b.interview_topic.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPayment = paymentFilter === 'All' || b.payment_status === paymentFilter;
    const matchesStatus = statusFilter === 'All' || b.booking_status === statusFilter;

    return matchesSearch && matchesPayment && matchesStatus;
  });

  // Calculate Metrics
  const totalBookings = bookings.length;
  const pendingPaymentCount = bookings.filter(b => b.payment_status === 'pending' || b.booking_status === 'pending_payment').length;
  const paymentReceivedCount = bookings.filter(b => b.payment_status === 'paid' || b.booking_status === 'payment_received').length;
  const scheduledCount = bookings.filter(b => b.booking_status === 'scheduled').length;
  const completedCount = bookings.filter(b => b.booking_status === 'completed' || b.booking_status === 'in_progress').length;
  const resultSentCount = bookings.filter(b => b.booking_status === 'result_sent').length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast Alert */}
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
        
        {/* Header */}
        <AdminHeader
          title="Mock Interview Bookings (₹99)"
          subtitle="Manage candidate practice bookings, WhatsApp payment coordination, scheduling, and feedback reports"
          onNavigate={onNavigate}
          showAddButton={false}
          showImportButton={false}
        />

        {/* Database Migration Helper Banner if table is missing */}
        {hasTableError && (
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-lg border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-rose-400" />
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Database Table "mock_interview_bookings" is Missing</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Action Required</span>
                </h4>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT).then(() => {
                    showToast('SQL Migration Script copied to clipboard!', 'success');
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL Script</span>
              </button>
            </div>
            <p className="text-xs text-slate-300">
              The <code className="text-amber-300">public.mock_interview_bookings</code> table is not present in your Supabase schema. Execute this SQL script in your Supabase SQL Editor:
            </p>
            <pre className="bg-slate-950 p-4 rounded-xl text-slate-300 text-[11px] font-mono overflow-x-auto max-h-40 border border-slate-800">
              {SQL_MIGRATION_SCRIPT}
            </pre>
          </div>
        )}

        {/* Real Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings</div>
            <div className="text-2xl font-black font-display text-slate-900">{totalBookings}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Awaiting Payment</div>
            <div className="text-2xl font-black font-display text-amber-700">{pendingPaymentCount}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Payment Paid</div>
            <div className="text-2xl font-black font-display text-emerald-700">{paymentReceivedCount}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-200/80 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Scheduled</div>
            <div className="text-2xl font-black font-display text-blue-700">{scheduledCount}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Completed</div>
            <div className="text-2xl font-black font-display text-purple-700">{completedCount}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-teal-200/80 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Results Sent</div>
            <div className="text-2xl font-black font-display text-teal-700">{resultSentCount}</div>
          </div>
        </div>

        {/* Action and Filter Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigate('/admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin Dashboard</span>
            </button>
            <button
              onClick={() => fetchBookings(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name, topic..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-xl font-semibold"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="All">All Payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid (₹99)</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Booking Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="payment_received">Payment Received</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="result_sent">Result Sent</option>
            </select>
          </div>
        </div>

        {/* Table of Bookings */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-semibold text-xs space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading candidate mock interview bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Video className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No mock interview bookings found</h3>
              <p className="text-xs text-slate-500 font-medium">
                Bookings submitted through the homepage banner or /mock-interview route will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Candidate</th>
                    <th className="py-3.5 px-4">Topic &amp; Mode</th>
                    <th className="py-3.5 px-4">Experience</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{b.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{b.email}</div>
                        <div className="text-[11px] text-emerald-700 font-medium">{b.whatsapp_number}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {b.interview_topic}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1">{b.interview_mode}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{b.experience_level}</td>
                      <td className="py-3.5 px-4 font-black text-amber-600">₹{b.price_inr}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                          b.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : b.payment_status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {b.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                          b.booking_status === 'completed' || b.booking_status === 'result_sent'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : b.booking_status === 'scheduled'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : b.booking_status === 'payment_received'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {b.booking_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(b.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenWhatsAppChat(b)}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                          title="Contact candidate on WhatsApp"
                        >
                          WhatsApp
                        </button>
                        <button
                          onClick={() => handleOpenDetailModal(b)}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Booking Detail & Management Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                    {selectedBooking.interview_topic}
                  </span>
                  <span className="text-xs font-black text-slate-900">₹{selectedBooking.price_inr} Session</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Candidate: {selectedBooking.full_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenWhatsAppChat(selectedBooking)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Contact on WhatsApp</span>
                </button>
                {paymentStatus !== 'paid' && (
                  <button
                    onClick={handleMarkPaymentReceived}
                    disabled={updating}
                    className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Payment Received (₹99)</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => handleDelete(selectedBooking)}
                className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>

            {/* Candidate Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 font-medium">Email:</span>
                <span className="font-bold text-slate-800 ml-2">{selectedBooking.email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">WhatsApp:</span>
                <span className="font-bold text-slate-800 ml-2">{selectedBooking.whatsapp_number}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Experience Level:</span>
                <span className="font-bold text-slate-800 ml-2">{selectedBooking.experience_level}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Mode:</span>
                <span className="font-bold text-slate-800 ml-2">{selectedBooking.interview_mode}</span>
              </div>
              {selectedBooking.preferred_availability && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 font-medium">Preferred Availability:</span>
                  <span className="font-bold text-slate-800 ml-2">{selectedBooking.preferred_availability}</span>
                </div>
              )}
              {selectedBooking.additional_information && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 font-medium">Additional Info:</span>
                  <span className="font-semibold text-slate-700 ml-2">{selectedBooking.additional_information}</span>
                </div>
              )}
            </div>

            {/* Form Updates Section */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                Update Status &amp; Scheduling
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as MockInterviewPaymentStatus)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid (₹99 Verified)</option>
                    <option value="refunded">Refunded</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Booking Status</label>
                  <select
                    value={bookingStatus}
                    onChange={(e) => setBookingStatus(e.target.value as MockInterviewBookingStatus)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                  >
                    <option value="pending_payment">Pending Payment</option>
                    <option value="payment_received">Payment Received</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="result_sent">Result Sent</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Scheduled Time / Slot</label>
                  <input
                    type="text"
                    value={scheduledAtText}
                    onChange={(e) => setScheduledAtText(e.target.value)}
                    placeholder="e.g. Oct 15, 2026 at 6:00 PM"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              {/* Private Admin Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Private Admin Notes</label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes, payment reference ID, mentor assigned..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold resize-none"
                />
              </div>
            </div>

            {/* Feedback & Results Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Record Mock Interview Feedback &amp; Results</span>
              </h4>

              {/* Optional Scores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Technical Score (e.g. 8/10)</label>
                  <input
                    type="text"
                    value={technicalScore}
                    onChange={(e) => setTechnicalScore(e.target.value)}
                    placeholder="8/10 or Excellent"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Communication Score</label>
                  <input
                    type="text"
                    value={communicationScore}
                    onChange={(e) => setCommunicationScore(e.target.value)}
                    placeholder="7.5/10 or Clear"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Problem Solving Score</label>
                  <input
                    type="text"
                    value={problemSolvingScore}
                    onChange={(e) => setProblemSolvingScore(e.target.value)}
                    placeholder="8/10 or Structured"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              {/* Performance Summary */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Performance Summary</label>
                <textarea
                  rows={2}
                  value={interviewResult}
                  onChange={(e) => setInterviewResult(e.target.value)}
                  placeholder="Overall impression, domain depth, interview readiness..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold resize-none"
                />
              </div>

              {/* Strengths & Areas for Improvement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Key Strengths</label>
                  <textarea
                    rows={2}
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    placeholder="Strong syntax knowledge, confident explanation..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Areas for Improvement</label>
                  <textarea
                    rows={2}
                    value={areasForImprovement}
                    onChange={(e) => setAreasForImprovement(e.target.value)}
                    placeholder="Edge case handling, speed in code writing..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold resize-none"
                  />
                </div>
              </div>

              {/* Recommended Next Steps */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Recommended Next Steps</label>
                <input
                  type="text"
                  value={recommendedNextSteps}
                  onChange={(e) => setRecommendedNextSteps(e.target.value)}
                  placeholder="Practice LeetCode medium questions on SQL joins, review OOP principles..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              {/* Send Results Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendResultsWhatsApp(selectedBooking)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Results on WhatsApp</span>
                  </button>
                  <a
                    href={`mailto:${selectedBooking.email}?subject=${encodeURIComponent(`Mana Naukari — Mock Interview Feedback (${selectedBooking.interview_topic})`)}&body=${encodeURIComponent(
                      `Mana Naukari — Mock Interview Feedback\n\nCandidate: ${selectedBooking.full_name}\nTopic: ${selectedBooking.interview_topic}\n\nPerformance Summary:\n${interviewResult || 'N/A'}\n\nStrengths:\n${strengths || 'N/A'}\n\nAreas to Improve:\n${areasForImprovement || 'N/A'}\n\nRecommended Next Steps:\n${recommendedNextSteps || 'N/A'}\n\nThank you,\nMana Naukari Team`
                    )}`}
                    className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Results by Email</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={updating}
                  className="px-6 py-2 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {updating ? 'Saving...' : 'Save Booking & Feedback'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
