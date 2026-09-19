import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/useAuth';

interface ChangePasswordFormProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordForm({ open, onClose }: ChangePasswordFormProps) {
  return (
    <Modal open={open} onClose={onClose} title="Change Password" size="md">
      {open && <PasswordForm onClose={onClose} />}
    </Modal>
  );
}

function PasswordForm({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-emerald-700">Your password has been updated.</p>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Input
        label="Current password"
        type="password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <Input
        label="New password"
        type="password"
        required
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Input
        label="Confirm new password"
        type="password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      {mismatch && <p className="text-sm text-red-600">Passwords don&apos;t match.</p>}
      {newPassword.length > 0 && newPassword.length < 8 && (
        <p className="text-sm text-red-600">New password must be at least 8 characters.</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Change password'}
        </Button>
      </div>
    </form>
  );
}
