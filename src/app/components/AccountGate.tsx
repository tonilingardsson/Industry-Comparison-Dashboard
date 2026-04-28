import { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle, Download, Lock, LogOut, Mail, Sparkles } from 'lucide-react';

interface AccountGateProps {
  userEmail: string | null;
  onLogin: (email: string) => void;
  onLogout: () => void;
}

function validateEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(trimmed)) {
    return 'Enter a valid email address.';
  }

  return '';
}

const unlockBenefits = [
  {
    title: 'Full website PDF',
    description: 'Save this exact comparison view as a printable report.',
  },
  {
    title: 'Country-by-country detail',
    description: 'Inspect where each selected industry reports the largest footprint.',
  },
  {
    title: 'Check factory or protected-area around your room',
    description: 'Use browser location to check nearby E-PRTR factories and Swedish protected-area records.',
  },
];

export function AccountGate({ userEmail, onLogin, onLogout }: AccountGateProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateEmail(email);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    onLogin(email.trim().toLowerCase());
  };

  if (userEmail) {
    return (
      <div className="rounded-lg border border-[#d9e2e8] bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xl font-black text-[#14212b]">What unlocks</p>
            <p className="mt-2 text-base leading-7 text-[#526371]">
              A cleaner package for sharing internally or reviewing with a customer.
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#168fca]">
              Unlocked for {userEmail}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#14212b]/15 bg-white px-4 py-2 text-sm font-bold text-[#14212b] transition hover:border-[#14212b]/30"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>

        <div className="divide-y divide-[#d9e2e8] rounded-lg border border-[#d9e2e8]">
          {unlockBenefits.map((benefit) => (
            <div key={benefit.title} className="flex gap-4 p-5">
              <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-[#168fca]" />
              <div>
                <p className="text-lg font-black leading-tight text-[#14212b]">{benefit.title}</p>
                <p className="mt-2 text-base leading-7 text-[#526371]">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg bg-[#14212b] p-5 text-white">
          <p className="text-xs font-bold uppercase text-white/58">Preview</p>
          <div className="mt-4 flex items-center gap-4">
            <Download className="h-6 w-6 shrink-0 text-[#ff7a18]" />
            <div>
              <p className="text-lg font-black leading-tight">PDF-ready benchmark pack</p>
              <p className="mt-2 text-sm leading-6 text-white/68">Full report, map snapshot, and country breakdown.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#d9e2e8] bg-white">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-[#f8fafb] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#14212b] px-3 py-2 text-xs font-bold text-white">
              <Sparkles className="h-4 w-4 text-[#ff7a18]" />
              30-second unlock
            </div>
            <span className="rounded-lg bg-[#fff0f7] px-3 py-1 text-xs font-bold text-[#d83d87]">Account required</span>
          </div>

          <div className="mb-5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#14212b] text-[#ff7a18]">
              <Lock className="h-6 w-6" />
            </div>
            <p className="text-2xl font-black leading-tight text-[#14212b]">
              Want the full report and country detail?
            </p>
            <p className="mt-3 text-sm leading-6 text-[#526371]">
              Create an account to turn this comparison into a PDF-ready website copy, a country-by-country view, and saved analysis.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3">
            <label className="sr-only" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526371]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-[#d9e2e8] bg-white py-3 pl-11 pr-4 text-[#14212b] outline-none transition focus:border-[#25a9e0] focus:ring-4 focus:ring-[#25a9e0]/15"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f3703d] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#f3703d]/20 transition hover:bg-[#ff7a18]"
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {error && <p className="mt-3 text-sm font-medium text-[#d83d87]">{error}</p>}
          <p className="mt-3 text-xs leading-5 text-[#526371]">
            Prototype note: no password needed. This stores the account state in this browser only.
          </p>
        </div>

        <div className="border-t border-[#d9e2e8] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="mb-1 text-sm font-black text-[#14212b]">What unlocks</p>
          <p className="mb-5 text-sm leading-6 text-[#526371]">
            A cleaner package for sharing internally or reviewing with a customer.
          </p>

          <div className="divide-y divide-[#d9e2e8] rounded-lg border border-[#d9e2e8]">
            {unlockBenefits.map((benefit) => (
              <div key={benefit.title} className="flex gap-3 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#168fca]" />
                <div>
                  <p className="text-sm font-black text-[#14212b]">{benefit.title}</p>
                  <p className="mt-1 text-sm leading-5 text-[#526371]">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg bg-[#14212b] p-4 text-white">
            <p className="text-xs font-bold uppercase text-white/58">Preview</p>
            <div className="mt-3 flex items-center gap-3">
              <Download className="h-5 w-5 text-[#ff7a18]" />
              <div>
                <p className="text-sm font-black">PDF-ready benchmark pack</p>
                <p className="mt-1 text-xs leading-5 text-white/68">Full report, map snapshot, and country breakdown.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
