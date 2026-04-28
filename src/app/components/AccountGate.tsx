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
      <div className="rounded-lg border border-[#25a9e0]/30 bg-[#eef9fd] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#14212b]">Your detailed report is unlocked</p>
            <p className="mt-1 text-sm text-[#526371]">Saved to this browser as {userEmail}</p>
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
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#d9e2e8] bg-[#f8fafb]">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-5 sm:p-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-[#14212b] px-3 py-2 text-xs font-bold text-white">
            <Sparkles className="h-4 w-4 text-[#ff7a18]" />
            30-second unlock
          </div>
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#14212b] text-[#ff7a18]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-black leading-tight text-[#14212b]">Get the benchmark brief behind these charts</p>
              <p className="mt-2 text-sm leading-6 text-[#526371]">
                Keep the free comparison. Add an email only if you want a saved, export-ready view with the most important signals pulled out for you.
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {[
              'Top risk signal',
              'Export-ready summary',
              'Saved comparison',
            ].map((benefit) => (
              <div key={benefit} className="rounded-lg border border-[#d9e2e8] bg-white p-3">
                <CheckCircle className="mb-2 h-4 w-4 text-[#168fca]" />
                <p className="text-xs font-bold text-[#14212b]">{benefit}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f3703d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ff7a18]"
            >
              Unlock report
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {error && <p className="mt-3 text-sm font-medium text-[#d83d87]">{error}</p>}
          <p className="mt-3 text-xs leading-5 text-[#526371]">
            Prototype note: no password needed. This stores the account state in this browser only.
          </p>
        </div>

        <div className="border-t border-[#d9e2e8] bg-white p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-black text-[#14212b]">Preview of what unlocks</p>
            <span className="rounded-lg bg-[#fff0f7] px-3 py-1 text-xs font-bold text-[#d83d87]">Locked</span>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-[#d9e2e8] p-4">
              <p className="text-xs uppercase text-[#526371]">Executive signal</p>
              <div className="mt-3 h-3 w-10/12 rounded bg-[#14212b]/20" />
              <div className="mt-2 h-3 w-7/12 rounded bg-[#14212b]/10" />
            </div>
            <div className="rounded-lg border border-[#d9e2e8] p-4">
              <p className="text-xs uppercase text-[#526371]">Export pack</p>
              <div className="mt-3 flex items-center gap-2 text-sm font-bold text-[#14212b]">
                <Download className="h-4 w-4 text-[#f3703d]" />
                PDF + CSV summary
              </div>
            </div>
            <div className="rounded-lg border border-[#d9e2e8] p-4">
              <p className="text-xs uppercase text-[#526371]">Recommended next step</p>
              <div className="mt-3 h-3 w-9/12 rounded bg-[#25a9e0]/25" />
              <div className="mt-2 h-3 w-6/12 rounded bg-[#f05a9d]/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
