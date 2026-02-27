import { it, expect, describe, vi } from 'vitest'; // Ensure vi is imported
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../app/page';

// 1. Tell Vitest to replace the global fetch with a mock function
vi.stubGlobal('fetch', vi.fn());

describe('Home Page Integration', () => {
  it('should show the shortened link after a successful form submission', async () => {
    const user = userEvent.setup();

    // 2. Now you can use .mockResolvedValueOnce because fetch is a Vitest mock
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ short_code: 'test123' }),
    });

    render(<Home />);

    const input = screen.getByPlaceholderText(/insert the url/i);
    const button = screen.getByRole('button', { name: /shorten url/i });

    await user.type(input, 'https://google.com');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/test123/i)).toBeInTheDocument();
    });
  });
});
