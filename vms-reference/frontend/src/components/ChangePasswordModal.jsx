import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api, apiError } from '../lib/api.js';
import Modal from './ui/Modal.jsx';
import Spinner from './ui/Spinner.jsx';
 
const schema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(1, 'Required'),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });
 
export default function ChangePasswordModal({ open, onClose }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });
 
  const onSubmit = async (data) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password updated');
      reset();
      onClose();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
 
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change password"
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting && <Spinner size={16} className="text-white" />} Update
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Current password</label>
          <input type="password" className="input" {...register('currentPassword')} />
          {errors.currentPassword && <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>}
        </div>
        <div>
          <label className="label">New password</label>
          <input type="password" className="input" {...register('newPassword')} />
          {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input type="password" className="input" {...register('confirm')} />
          {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm.message}</p>}
        </div>
      </form>
    </Modal>
  );
}
