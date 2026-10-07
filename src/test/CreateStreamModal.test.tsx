import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateStreamModal from '../components/CreateStreamModal';

const G = 'GBJ5FP5UB4YUE2EONTPPSAGKZZGDETFZLEJXJRCALSYTJZIDVWAN3C7P';

function fill() {
  fireEvent.change(screen.getByPlaceholderText(/Q3 Operational Stream/i), { target: { value: 'Payroll' } });
  fireEvent.change(screen.getByPlaceholderText(/G\.\.\. Stellar address/i), { target: { value: ` ${G} ` } });
  fireEvent.change(screen.getByPlaceholderText(/e\.g\., 5000/i), { target: { value: '5000' } });
  const date = document.querySelector('input[type="date"]') as HTMLInputElement;
  fireEvent.change(date, { target: { value: '2099-12-31' } });
}

describe('CreateStreamModal', () => {
  it('submits the full recipient address and ISO end date, then closes', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<CreateStreamModal isOpen onClose={onClose} onSubmit={onSubmit} />);

    fill();
    fireEvent.click(screen.getByRole('button', { name: /start stream/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Payroll',
      recipient: G,
      flowRateMonthly: 5000,
      endDate: '2099-12-31',
    });
  });

  it('keeps the modal open and shows the error when the transaction fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('User declined the transaction'));
    const onClose = vi.fn();
    render(<CreateStreamModal isOpen onClose={onClose} onSubmit={onSubmit} />);

    fill();
    fireEvent.click(screen.getByRole('button', { name: /start stream/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('User declined the transaction');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /start stream/i })).not.toBeDisabled();
  });

  it('disables the form while waiting for the signature', async () => {
    let resolve!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>(r => { resolve = r; }));
    render(<CreateStreamModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    fill();
    fireEvent.click(screen.getByRole('button', { name: /start stream/i }));

    expect(await screen.findByRole('button', { name: /waiting for signature/i })).toBeDisabled();
    resolve();
  });
});
