import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Sprout, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { apiError } from '../lib/api.js';
import { requestPasswordReset } from '../hooks/useAdmin.js';
import Spinner from '../components/ui/Spinner.jsx';
import Modal from '../components/ui/Modal.jsx';
 
const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
 
export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [forgotOpen, setForgotOpen] = useState(false);
 
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
 
  if (!loading && isAuthenticated) return <Navigate to={from} replace />;
 
  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (e) {
      toast.error(apiError(e, 'Login failed'));
    }
  };
 
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-brand-600/50" />
        <div className="absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-brand-800/50" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <Sprout size={24} />
          </div>
          <div>
            <p className="text-lg font-bold">Farming Hub</p>
            <p className="text-sm text-brand-100">Private Limited</p>
          </div>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-snug">
            Vendor Management<br />& Purchase CRM
          </h2>
          <p className="mt-4 max-w-md text-brand-100">
            Record every supplier you meet at Canton Fair, Intex and beyond. Tag by
            component, track samples & ratings, and never lose a sourcing contact again.
          </p>
        </div>
        <p className="relative text-sm text-brand-200">© Farming Hub Private Limited</p>
      </div>
 
      {/* Form panel */}
      <div className="flex items-center justify-center bg-ink-50 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-white">
              <Sprout size={20} />
            </div>
            <span className="text-lg font-bold text-ink-900">Farming Hub</span>
          </div>
 
          <h1 className="text-2xl font-bold text-ink-900">Sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Access the Purchase CRM dashboard.</p>
 
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  autoComplete="username"
                  className="input pl-9"
                  placeholder="you@farminghub.in"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
 
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  autoComplete="current-password"
                  className="input pl-9"
                  placeholder="••••••••"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
 
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting && <Spinner size={16} className="text-white" />}
              Sign in
            </button>
 
            <div className="text-center">
              <button type="button" onClick={() => setForgotOpen(true)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </div>
 
      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
}
 
function ForgotPasswordModal({ open, onClose }) {
  const [form, setForm] = useState({ email: '', newPassword: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
 
  const submit = async () => {
    if (!form.email || form.newPassword.length < 6) {
      toast.error('Enter your email and a new password (min 6 chars)');
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(form);
      setDone(true);
    } catch (e) {
      toast.error(apiError(e, 'Could not submit request'));
    } finally {
      setBusy(false);
    }
  };
 
  const close = () => { setDone(false); setForm({ email: '', newPassword: '', note: '' }); onClose(); };
 
  return (
    <Modal open={open} onClose={close} size="sm" title="Reset password"
      footer={done ? (
        <button className="btn-primary" onClick={close}>Done</button>
      ) : (
        <>
          <button className="btn-secondary" onClick={close}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy && <Spinner size={16} className="text-white" />} Submit request
          </button>
        </>
      )}>
      {done ? (
        <p className="text-sm text-ink-600">
          ✅ Your request has been submitted. An admin will review and approve it, after which your new password becomes active.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-500">Choose a new password. It will only take effect once an admin approves your request.</p>
          <div>
            <label className="label">Email</label>
            <input className="input" placeholder="you@farminghub.in" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">New password</label>
            <input type="password" className="input" placeholder="At least 6 characters" value={form.newPassword}
              onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">Note to admin (optional)</label>
            <input className="input" placeholder="e.g. forgot my password" value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
      )}
    </Modal>
  );
}
