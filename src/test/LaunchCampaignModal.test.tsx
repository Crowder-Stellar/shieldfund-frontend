import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LaunchCampaignModal from '../components/LaunchCampaignModal';

function fill(image = '') {
  fireEvent.change(screen.getByPlaceholderText(/Privacy Shield SDK v2/i), { target: { value: ' Relief Q4 ' } });
  fireEvent.change(screen.getByPlaceholderText(/e\.g\., 50000/i), { target: { value: '2500' } });
  fireEvent.change(screen.getByPlaceholderText(/Explain the purpose/i), { target: { value: 'Emergency relief' } });
  if (image) fireEvent.change(screen.getByPlaceholderText(/images\.unsplash\.com/i), { target: { value: image } });
}

describe('LaunchCampaignModal', () => {
  it('submits the form values and closes on success', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<LaunchCampaignModal isOpen onClose={onClose} onSubmit={onSubmit} />);

    fill('https://example.org/cover.jpg');
    fireEvent.click(screen.getByRole('button', { name: /launch campaign/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      { title: 'Relief Q4', description: 'Emergency relief', goalUsdc: 2500, imageUrl: 'https://example.org/cover.jpg' },
      undefined,
    );
  });

  it('asks for the admin token in live mode and passes it along', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LaunchCampaignModal isOpen onClose={vi.fn()} onSubmit={onSubmit} needsAdminToken />);

    fill();
    fireEvent.change(screen.getByLabelText(/backend admin token/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /launch campaign/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][1]).toBe('secret');
  });

  it('keeps the modal open and shows the backend error', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Admin token missing or rejected by the backend.'));
    const onClose = vi.fn();
    render(<LaunchCampaignModal isOpen onClose={onClose} onSubmit={onSubmit} />);

    fill();
    fireEvent.click(screen.getByRole('button', { name: /launch campaign/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/rejected by the backend/);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('rejects non-https cover images before submitting', async () => {
    const onSubmit = vi.fn();
    render(<LaunchCampaignModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    fill('http://example.org/cover.jpg');
    fireEvent.click(screen.getByRole('button', { name: /launch campaign/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/https/);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
