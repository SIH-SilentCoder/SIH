import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckSquare, Clock, AlertTriangle, CheckCircle2, XCircle,
  FileText, ShieldCheck, UserCheck, Eye, Search, Filter,
  Building2, Landmark, Download, Send, MessageSquare, RefreshCw
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import toast from 'react-hot-toast';

const ApprovalsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'pending';

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [replySmsModal, setReplySmsModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [smsFeedback, setSmsFeedback] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch proposals from Backend API
  const fetchProposals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/state-proposals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setProposals(data.data.proposals || []);
      }
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  // Central Officer Action: Send Reply SMS / Feedback (Request Changes)
  const handleSendReplySms = async (e) => {
    e.preventDefault();
    if (!replySmsModal || !smsFeedback.trim()) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/state-proposals/${replySmsModal._id}/reply-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: smsFeedback }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send SMS feedback.');

      toast.success(`Reply SMS sent to State Officer! Request status set to Changes Requested.`);
      setReplySmsModal(null);
      setSmsFeedback('');
      fetchProposals();
    } catch (err) {
      toast.error(err.message || 'Error sending reply SMS');
    } finally {
      setSubmitting(false);
    }
  };

  // Central Officer Action: Approve Proposal & Publish Live to DB
  const handleApprove = async (proposal) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/state-proposals/${proposal._id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ remarks }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to approve proposal.');

      toast.success(`Proposal ${proposal.proposalId} Approved! Applied live in system database.`);
      setActiveModal(null);
      setRemarks('');
      fetchProposals();
    } catch (err) {
      toast.error(err.message || 'Error approving proposal');
    } finally {
      setSubmitting(false);
    }
  };

  // Central Officer Action: Reject Proposal
  const handleReject = async (proposal) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/state-proposals/${proposal._id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ remarks }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reject proposal.');

      toast.error(`Proposal ${proposal.proposalId} rejected.`);
      setActiveModal(null);
      setRemarks('');
      fetchProposals();
    } catch (err) {
      toast.error(err.message || 'Error rejecting proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const counts = {
    pending: proposals.filter((a) => a.status === 'pending_central_approval').length,
    changes: proposals.filter((a) => a.status === 'changes_requested').length,
    approved: proposals.filter((a) => a.status === 'approved').length,
    rejected: proposals.filter((a) => a.status === 'rejected').length,
  };

  const filteredProposals = proposals.filter((item) => {
    if (currentTab === 'pending' && item.status !== 'pending_central_approval') return false;
    if (currentTab === 'changes' && item.status !== 'changes_requested') return false;
    if (currentTab === 'approved' && item.status !== 'approved') return false;
    if (currentTab === 'rejected' && item.status !== 'rejected') return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.proposalId?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q) ||
        item.state?.toLowerCase().includes(q) ||
        item.proposedByName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb & Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>CPO Apex Portal</span>
              <span>/</span>
              <span className="text-blue-700 font-bold">Central Governance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <span>CPO Executive Approval Console</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                {counts.pending} Action Required
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review state-level proposals for Districts, Mandis, Officers &amp; Crops. Approve to publish live or send Reply SMS for revision.
            </p>
          </div>
          <button
            onClick={fetchProposals}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-bold self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh List</span>
          </button>
        </div>

        {/* 4 Status KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'pending' })}
            className={`p-4 rounded-2xl border text-left transition-all ${
              currentTab === 'pending'
                ? 'bg-amber-50/80 border-amber-400 shadow-xs ring-2 ring-amber-400/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[10px] uppercase font-bold tracking-wider">Pending Central Action</span>
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-amber-900 mt-1">{counts.pending}</p>
            <p className="text-[10px] text-amber-700 mt-0.5 font-semibold">Immediate CPO Decision</p>
          </button>

          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'changes' })}
            className={`p-4 rounded-2xl border text-left transition-all ${
              currentTab === 'changes'
                ? 'bg-blue-50/80 border-blue-400 shadow-xs ring-2 ring-blue-400/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-[10px] uppercase font-bold tracking-wider">Changes / SMS Sent</span>
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-blue-900 mt-1">{counts.changes}</p>
            <p className="text-[10px] text-blue-700 mt-0.5 font-semibold">Awaiting State Revision</p>
          </button>

          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'approved' })}
            className={`p-4 rounded-2xl border text-left transition-all ${
              currentTab === 'approved'
                ? 'bg-emerald-50/80 border-emerald-400 shadow-xs ring-2 ring-emerald-400/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] uppercase font-bold tracking-wider">Approved &amp; Live</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-emerald-900 mt-1">{counts.approved}</p>
            <p className="text-[10px] text-emerald-700 mt-0.5 font-semibold">Published in Database</p>
          </button>

          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'rejected' })}
            className={`p-4 rounded-2xl border text-left transition-all ${
              currentTab === 'rejected'
                ? 'bg-rose-50/80 border-rose-400 shadow-xs ring-2 ring-rose-400/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-rose-800">
              <span className="text-[10px] uppercase font-bold tracking-wider">Rejected</span>
              <XCircle className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-rose-900 mt-1">{counts.rejected}</p>
            <p className="text-[10px] text-rose-700 mt-0.5 font-semibold">Non-Compliant</p>
          </button>
        </div>

        {/* Tab Selection & Filter */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { key: 'pending', label: `Pending Action (${counts.pending})` },
              { key: 'changes', label: `Changes Requested (${counts.changes})` },
              { key: 'approved', label: `Approved (${counts.approved})` },
              { key: 'rejected', label: `Rejected (${counts.rejected})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSearchParams({ tab: tab.key })}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  currentTab === tab.key
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search request ID, state or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Approval Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-700" />
              <span>Official Request Docket ({filteredProposals.length})</span>
            </h2>
            <span className="text-xs text-slate-500">
              CPO Digital Authorization Console
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading requests...</div>
            ) : filteredProposals.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No requests found matching this filter.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Proposal Ref.</th>
                    <th className="py-3 px-3">State &amp; Subject</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Submitted By</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredProposals.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-800">{row.proposalId}</td>
                      <td className="py-3.5 px-3 max-w-xs">
                        <p className="font-bold text-slate-900 leading-snug">{row.title}</p>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5 inline-block">
                          {row.state} • {row.category?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-semibold">{row.department}</td>
                      <td className="py-3.5 px-3 text-slate-700 font-semibold">
                        <p className="font-bold text-slate-900">{row.proposedByName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{row.proposedByEmpId}</p>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            row.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : row.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : row.status === 'changes_requested'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          }`}
                        >
                          {row.status === 'approved'
                            ? 'Approved (Live)'
                            : row.status === 'changes_requested'
                            ? 'SMS / Changes Requested'
                            : row.status === 'rejected'
                            ? 'Rejected'
                            : 'Pending CPO Decision'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReplySmsModal(row);
                              setSmsFeedback('');
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Reply SMS</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModal(row);
                              setRemarks('');
                            }}
                            className="px-3 py-1.5 text-[11px] font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition"
                          >
                            Review &amp; Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal 1: Review & Approve / Reject Drawer */}
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-700">{activeModal.proposalId}</span>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">{activeModal.title}</h3>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-500">State Officer Justification</p>
                  <p className="text-slate-800 mt-1 leading-relaxed">{activeModal.description || 'No description provided.'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 font-mono text-[11px]">
                  <p className="font-bold text-slate-900 font-sans text-xs mb-1">Proposed Payload Details:</p>
                  <pre className="text-[10px] text-slate-800 whitespace-pre-wrap bg-white p-2 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                    {JSON.stringify(activeModal.payload, null, 2)}
                  </pre>
                </div>

                {activeModal.feedbackHistory && activeModal.feedbackHistory.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                    <p className="font-bold text-amber-900 text-xs">Communication &amp; Feedback History:</p>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {activeModal.feedbackHistory.map((fb, idx) => (
                        <div key={idx} className="text-[11px] bg-white p-2 rounded-lg border border-amber-200">
                          <span className="font-bold text-amber-800">{fb.senderRole}: </span>
                          <span className="text-slate-800">{fb.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    Central CPO Executive Order Note / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter official approval note or gazette conditions..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleReject(activeModal)}
                  className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200"
                >
                  Reject Proposal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleApprove(activeModal)}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Approving...' : 'Approve & Publish Live'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Reply SMS / Feedback Drawer */}
        {replySmsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Reply SMS to {replySmsModal.proposedByName}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    Request Changes / Send Feedback Message
                  </h3>
                </div>
                <button
                  onClick={() => setReplySmsModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendReplySms} className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Proposal Subject</p>
                  <p className="font-bold text-slate-900 mt-0.5">{replySmsModal.title}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">State: {replySmsModal.state} | Submitter: {replySmsModal.proposedByName} ({replySmsModal.proposedByEmpId})</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Central Reply SMS &amp; Revision Requirements *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Type feedback message / SMS to State Officer explaining required changes (e.g. Please increase intake capacity or update officer mobile number)..."
                    value={smsFeedback}
                    onChange={(e) => setSmsFeedback(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-snug flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <span>
                    Sending this feedback will notify the State Officer via in-app alert &amp; SMS message. The status will update to <strong>Changes Requested</strong> for revision and re-submission.
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReplySmsModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !smsFeedback.trim()}
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Sending...' : 'Send Reply SMS & Request Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ApprovalsPage;
