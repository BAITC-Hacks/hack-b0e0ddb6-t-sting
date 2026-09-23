import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';

describe('App', () => {
  it('shows the workspace and waits for the user to check the connection', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Your next build starts here.',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Ready to connect');
    expect(
      screen.getByRole('button', { name: 'Check connection' }),
    ).toBeEnabled();
  });

  it('disables duplicate checks while waiting, then reports a healthy stack', async () => {
    let resolveResponse!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
      ),
    );
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));

    expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Checking connection');
    resolveResponse(
      new Response(JSON.stringify({ status: 'ok', database: 'up' })),
    );
    expect(
      await screen.findByText('All systems connected'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Check connection' }),
    ).toBeEnabled();
  });

  it('shows a useful failure message and lets the user retry successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('private server detail'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ status: 'ok', database: 'up' })),
        ),
    );
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Check connection' }));

    expect(
      await screen.findByText('Connection unavailable'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Make sure the API and database are running, then try again.',
    );
    expect(screen.queryByText('private server detail')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Check connection' }));

    expect(
      await screen.findByText('All systems connected'),
    ).toBeInTheDocument();
  });
});
