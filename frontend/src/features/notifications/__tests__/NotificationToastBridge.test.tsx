import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { NotificationToastBridge } from '../NotificationToastBridge';
import { enqueueNotificationToast, resetNotificationToastBus } from '../toastBus';
import type { NotificationRow } from '../types';

const INCOMING: NotificationRow = {
  id: 2,
  type: 'ebook',
  title: 'Ebook da san sang',
  body: 'Nhan vao de xem thong bao',
  data: { orderCode: 'ATHENA1' },
  readAt: null,
  createdAt: '2026-06-23T08:00:00.000Z',
};

function PathnameProbe() {
  const location = useLocation();
  return <div data-testid="pathname">{location.pathname}</div>;
}

describe('NotificationToastBridge', () => {
  afterEach(() => {
    resetNotificationToastBus();
  });

  it('shows top-right toast and navigates to notifications page when clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <NotificationToastBridge />
        <Routes>
          <Route path="*" element={<PathnameProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await act(async () => {
      enqueueNotificationToast(INCOMING);
    });

    expect(await screen.findByText('Ebook da san sang')).toBeInTheDocument();
    expect(screen.getByText('Nhan vao de xem thong bao')).toBeInTheDocument();
    expect(screen.getByText('Xem thông báo')).toBeInTheDocument();

    await user.click(screen.getByText('Ebook da san sang'));

    expect(screen.getByTestId('pathname')).toHaveTextContent('/user/notifications');
  });
});
