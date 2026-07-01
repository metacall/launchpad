import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Building2,
  Key,
  Shield,
  ExternalLink,
  Trash2,
  ReceiptText,
  RefreshCw,
  Rocket,
  Lock,
  Download,
} from 'lucide-react';
import { CopyButton } from '@/shared/ui/CopyButton';
import { api } from '@/lib/api-client';
import { removeMockSubscription, normalizePlan } from '@/shared/lib/plan';
import { LS_TOKEN_KEY, LS_EMAIL_KEY } from '@/shared/constants';
import { downloadInvoicePDF, formatInvoiceNumber } from '../utils/invoice';
import type { Deployment } from '@/shared/types';
import type { SubscriptionDeploy } from '@metacall/protocol';

/** Format a Unix timestamp (seconds or ms) or ISO string into a readable local date. */
const formatDate = (dateVal: number | string | undefined): string => {
  if (!dateVal) return 'N/A';
  const ms =
    typeof dateVal === 'number'
      ? dateVal < 10_000_000_000
        ? dateVal * 1000
        : dateVal
      : Date.parse(String(dateVal));
  if (isNaN(ms)) return String(dateVal);
  const d = new Date(ms);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
};

interface PdfIconProps {
  className?: string;
  size?: number;
}

const PdfIcon = ({ className = '', size = 16 }: PdfIconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={`fill-red-50 hover:scale-110 transition-transform cursor-pointer shrink-0 ${className}`}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <text
      x="6"
      y="18"
      fill="currentColor"
      stroke="none"
      fontSize="6"
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      PDF
    </text>
  </svg>
);




export default function SettingsPage() {
  const navigate = useNavigate();
  const [email] = useState(() => localStorage.getItem(LS_EMAIL_KEY) ?? 'example@gmail.com');
  const [vatId, setVatId] = useState(() => localStorage.getItem('faas_vat_id') ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(
    null,
  );

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [subDeploys, setSubDeploys] = useState<SubscriptionDeploy[]>([]);
  const [loadingDeploys, setLoadingDeploys] = useState(true);

  const fetchSettingsData = useCallback(async () => {
    setLoadingDeploys(true);
    try {
      const [, deps, deploys] = await Promise.all([
        api.listSubscriptions().catch(() => ({})),
        api.inspect().catch(() => []),
        api.listSubscriptionsDeploys().catch(() => []),
      ]);
      setDeployments(deps || []);
      setSubDeploys(deploys || []);
    } catch {
      // Ignore
    } finally {
      setLoadingDeploys(false);
    }
  }, []);

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  const billingHistory = useMemo(() => {
    const list = [
      { id: 'sub_1MbodOLWWfeIOnVypRnDIvw0', date: '2/15/2023 10:49:10 PM', amount: '€0.00' },
      { id: 'sub_1Mn8fPLWWfeIOnVyjSpq4CZV', date: '3/19/2023 04:26:03 AM', amount: '€0.00' },
      { id: 'sub_1NKr1ZLWWfeIOnVyCPkc4RW7', date: '6/20/2023 04:28:17 AM', amount: '€0.00' },
    ];
    if (subDeploys.length > 0) {
      const realList = subDeploys.map(item => ({
        id: item.id || `CF222FF2-${item.plan || 'MOCK'}`,
        date: formatDate(item.date),
        amount: '€0.00',
      }));
      return [...realList, ...list];
    }
    return list;
  }, [subDeploys]);

  const activePaidSubscriptionsList = useMemo(() => {
    return subDeploys.map(item => {
      let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
      if (item.plan === 'Essential') badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
      if (item.plan === 'Standard') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
      if (item.plan === 'Premium') badgeColor = 'bg-pink-50 text-pink-600 border-pink-200';

      return {
        id: item.id || item.plan,
        planName: item.plan,
        badgeColor,
        mockDate: formatDate(item.date),
        deploy: item.deploy || '',
      };
    });
  }, [subDeploys]);

  const authToken =
    localStorage.getItem(LS_TOKEN_KEY) ?? (import.meta.env.VITE_FAAS_TOKEN as string);
  const maskedAuthToken = useMemo(() => {
    if (!authToken) return 'local';
    if (authToken.length <= 16) return authToken;
    return `${authToken.slice(0, 18)}...${authToken.slice(-6)}`;
  }, [authToken]);

  const handleVatSave = () => {
    localStorage.setItem('faas_vat_id', vatId.trim());
    setFeedbackMessage({ type: 'success', text: 'Settings saved locally.' });
  };

  const handlePasswordUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedbackMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFeedbackMessage({ type: 'error', text: 'All password fields are required.' });
      return;
    }

    if (newPassword.length < 6) {
      setFeedbackMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedbackMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setFeedbackMessage({
      type: 'success',
      text: 'Password form validated (local mode, no remote update).',
    });
  };

  const handleCancelSubscription = async (planName: string) => {
    if (!confirm(`Are you sure you want to cancel your ${planName} Plan subscription?`)) return;
    try {
      removeMockSubscription(planName);
      await fetchSettingsData();
      setFeedbackMessage({
        type: 'success',
        text: `${planName} Plan subscription canceled successfully.`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setFeedbackMessage({
        type: 'error',
        text: error.message || 'Failed to cancel subscription.',
      });
    }
  };

  const handleDownloadInvoice = async (receiptId: string, date: string, amount: string) => {
    try {
      await downloadInvoicePDF(receiptId, date, amount);
    } catch (err) {
      console.error('Failed to download PDF invoice:', err);
    }
  };

  const handleDeleteAccount = () => {
    if (!confirm('Delete local account data and sign out?')) return;
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_EMAIL_KEY);
    localStorage.removeItem('faas_vat_id');
    navigate('/', { replace: true });
  };

  return (
    <div className="grow flex flex-col items-center justify-start p-4 bg-white animate-in fade-in duration-500">
      <div className="w-full max-w-350 flex flex-col mt-4">
        <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-200">
          <div>
            <h2 className="text-3xl font-medium text-slate-800 tracking-tight">Account Settings</h2>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Manage your profile, security, and billing details to customize your MetaCall
              experience.
            </p>
          </div>
        </div>

        {feedbackMessage && (
          <div
            className={`mb-6 border px-4 py-3 text-sm ${
              feedbackMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {feedbackMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 items-start">
          {/* Col 1 */}
          <div className="flex flex-col gap-8">
            {/* Account Details */}
            <div className="border border-slate-300 bg-white flex flex-col">
              <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center gap-2">
                <User size={14} className="text-slate-600" />
                Account Details
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <div className="relative group">
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none font-semibold transition-colors"
                    />
                    <div className="absolute right-2 top-3 text-slate-400">
                      <Lock size={14} />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Primary email associated with this account.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    CLI Token
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={maskedAuthToken}
                      readOnly
                      className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 pr-10 text-sm outline-none font-mono truncate transition-colors"
                    />
                    <div className="absolute right-0 top-1.5">
                      <CopyButton text={authToken ?? 'local'} />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 font-mono">
                    Use this token to authenticate via the MetaCall CLI. Keep it secure.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy and Security */}
            <div className="border border-slate-300 bg-white flex flex-col">
              <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center gap-2">
                <Shield size={14} className="text-slate-600" />
                Privacy & Data
              </div>
              <div className="p-6 flex flex-col gap-4 items-start">
                <p className="text-[12px] text-gray-600 mb-2 leading-relaxed">
                  Review our data handling policies or permanently delete your account and all
                  associated deployments.
                </p>
                <a
                  href="https://metacall.io/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex justify-between items-center px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider font-bold group"
                >
                  Terms and Conditions
                  <ExternalLink size={14} className="text-gray-400" />
                </a>
                <a
                  href="https://metacall.io/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex justify-between items-center px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider font-bold group"
                >
                  Privacy Policy
                  <ExternalLink size={14} className="text-gray-400" />
                </a>
                <div className="w-full h-px bg-slate-200 mt-2 mb-2"></div>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="w-full flex items-center justify-center gap-2 border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs uppercase tracking-wider font-bold px-4 py-3 transition-colors"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Col 2 */}
          <div className="flex flex-col gap-8">
            {/* Company VAT */}
            <div className="border border-slate-300 bg-white flex flex-col h-full">
              <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center gap-2">
                <Building2 size={14} className="text-slate-600" />
                Company VAT
              </div>
              <div className="p-6 grow flex flex-col justify-between gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    VAT ID Number
                  </label>
                  <input
                    type="text"
                    placeholder="EU123456789"
                    value={vatId}
                    onChange={e => setVatId(e.target.value)}
                    className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none font-mono focus:border-slate-800 transition-colors placeholder:text-gray-300"
                  />
                  <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
                    Enter your valid VAT ID for tax exemption on future invoices. validate against
                    European VAT Information Exchange System (VIES).
                  </p>
                </div>
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={handleVatSave}
                    className="text-slate-600 border border-slate-300 px-3 py-2 text-xs uppercase tracking-widest font-bold hover:bg-gray-700 hover:text-white transition-colors hover:border-slate-800 hover:cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3 */}
          <div className="flex flex-col gap-8">
            {/* Change Password */}
            <div className="border border-slate-300 bg-white flex flex-col h-full">
              <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center gap-2">
                <Key size={14} className="text-slate-600" />
                Security
              </div>
              <form
                onSubmit={handlePasswordUpdate}
                className="p-6 grow flex flex-col gap-5"
              >
                <p className="text-[12px] text-gray-600 mb-2 leading-relaxed">
                  Ensure your account is using a long, random password to stay secure.
                </p>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none focus:border-slate-800 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none focus:border-slate-800 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none focus:border-slate-800 transition-colors"
                  />
                </div>
                <div className="flex justify-start mt-auto pt-4">
                  <button
                    type="submit"
                    className="text-slate-800 border border-slate-300 px-3 py-2 text-xs uppercase tracking-widest font-bold hover:bg-gray-600 hover:text-white transition-colors hover:border-slate-800 hover:cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="border border-slate-300 bg-white flex flex-col mb-8">
          <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText size={14} className="text-slate-600" />
              Billing History
            </div>
          </div>
          <div className="p-8 flex flex-col gap-6">
            <div className="flex justify-between items-center pb-2">
              <div>
                <h4 className="text-md font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  Payments List
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Download your past invoices and usage reports.
                </p>
              </div>
              <button
                onClick={fetchSettingsData}
                className="p-1.5 border border-slate-300 text-gray-500 hover:text-slate-800 hover:border-slate-800 transition-all rounded-sm bg-white cursor-pointer"
              >
                <RefreshCw size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-100">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Receipt</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                  {loadingDeploys ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                        <RefreshCw className="animate-spin inline mr-2 text-slate-400" size={14} />
                        Loading payments...
                      </td>
                    </tr>
                  ) : billingHistory.length > 0 ? (
                    billingHistory.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-all duration-150">
                        <td
                          onClick={() => handleDownloadInvoice(row.id, row.date, row.amount)}
                          className="py-3 px-4 font-mono flex items-center gap-2 text-slate-600 hover:text-blue-600 cursor-pointer group/receipt select-none"
                          title="Download PDF Invoice"
                        >
                          <PdfIcon className="text-slate-600" size={16}  />
                          <span className="group-hover/receipt:underline truncate max-w-40 sm:max-w-none">{formatInvoiceNumber(row.id)}</span>
                          <Download size={12} className="text-slate-400 opacity-0 group-hover/receipt:opacity-100 transition-opacity ml-1" />
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-bold bg-emerald-50 text-gray-700 border border-emerald-200 uppercase tracking-wide">
                            PAID
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 font-medium">{row.date}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">{row.amount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500 font-medium bg-slate-50/50">
                        No invoices generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="flex items-center justify-end pt-2">
              <div className="flex items-stretch border border-slate-200 rounded-sm overflow-hidden shadow-sm bg-white">
                <button
                  disabled
                  className="bg-white text-gray-400 px-3 py-1.5 border-r border-slate-200 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 transition-all cursor-not-allowed hover:bg-slate-50"
                >
                  Prev
                </button>
                <div className="bg-slate-50 text-slate-500 font-bold text-[10px] px-4 py-1.5 flex items-center tracking-widest uppercase font-mono border-r border-slate-200">
                  PAGE 1
                </div>
                <button
                  disabled
                  className="bg-white text-gray-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 transition-all cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="border border-slate-300 bg-white flex flex-col mb-12">
          <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex flex-col sm:flex-row gap-4 sm:gap-0 sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket size={14} className="text-slate-600" />
              Active Subscriptions
            </div>
            <button
              onClick={() => navigate('/plans')}
              className="px-4 py-2 bg-gray-800 text-white text-[10px] uppercase font-bold tracking-widest hover:bg-slate-700 transition-colors flex items-center gap-2 w-max rounded-sm cursor-pointer"
            >
              Upgrade Plan
            </button>
          </div>
          <div className="p-8 flex flex-col gap-6">
            <div className="flex justify-between items-center pb-2">
              <div>
                <h4 className="text-md font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  Active Subscriptions
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your active deployment slots and plan tiers.
                </p>
              </div>
              <button
                onClick={fetchSettingsData}
                className="p-1.5 border border-slate-300 text-gray-500 hover:text-slate-800 hover:border-slate-800 transition-all rounded-sm bg-white cursor-pointer"
              >
                <RefreshCw size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-100">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Deploy</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                  {loadingDeploys ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                        <RefreshCw className="animate-spin inline mr-2 text-slate-400" size={14} />
                        Checking active subscriptions...
                      </td>
                    </tr>
                  ) : activePaidSubscriptionsList.length > 0 ? (
                    activePaidSubscriptionsList.map(item => {
                      const associatedDeploy = item.deploy
                        ? { suffix: item.deploy }
                        : deployments.find(d => normalizePlan((d as Deployment & { plan?: string }).plan) === item.planName);
                      const deployText = associatedDeploy ? (
                        <span
                          className="font-semibold text-blue-600 underline hover:text-blue-800 cursor-pointer"
                          onClick={() => navigate(`/deployments/${associatedDeploy.suffix}`)}
                        >
                          {associatedDeploy.suffix}
                        </span>
                      ) : (
                        'No deploy associated.'
                      );

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-all duration-150">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${item.badgeColor}`}>
                              {item.planName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-medium">{deployText}</td>
                          <td className="py-3 px-4 text-gray-400 font-medium font-mono">{item.mockDate}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleCancelSubscription(item.planName)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all inline-flex items-center justify-center cursor-pointer"
                              title="Cancel Subscription"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500 font-medium bg-slate-50/50">
                        No active paid subscriptions. You are currently on the <strong className="text-slate-800">Free Tier</strong>.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
