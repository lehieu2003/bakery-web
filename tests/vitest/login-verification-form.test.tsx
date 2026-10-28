import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LoginVerificationForm from '@/components/auth/LoginVerificationForm';
import { useVerifyLogin } from '@/hooks/use-auth';

vi.mock('@/hooks/use-auth', () => ({
  useVerifyLogin: vi.fn(),
}));

const mutate = vi.fn();

beforeEach(() => {
  mutate.mockReset();
  vi.mocked(useVerifyLogin).mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useVerifyLogin>);
});

function renderForm(onCancel = vi.fn()) {
  render(
    <LoginVerificationForm
      verification={{ challengeId: 'ch-1', email: 'o***r@gmail.com' }}
      onVerified={vi.fn()}
      onCancel={onCancel}
    />,
  );
  return {
    input: screen.getByLabelText('Mã xác minh') as HTMLInputElement,
    submit: screen.getByRole('button', { name: 'Xác minh' }),
  };
}

describe('admin new-device code step', () => {
  test('says where the code went', () => {
    renderForm();
    expect(screen.getByText('o***r@gmail.com')).toBeTruthy();
  });

  test('takes digits only and waits for all six', () => {
    const { input, submit } = renderForm();

    fireEvent.change(input, { target: { value: '12a3' } });
    expect(input.value).toBe('123');
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: '123456' } });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  test('sends the code for this challenge', () => {
    const { input, submit } = renderForm();
    fireEvent.change(input, { target: { value: '654321' } });
    fireEvent.click(submit);

    expect(mutate).toHaveBeenCalledWith(
      { challengeId: 'ch-1', otp: '654321' },
      expect.anything(),
    );
  });

  test('"Quay lại đăng nhập" leaves the code step', () => {
    const onCancel = vi.fn();
    renderForm(onCancel);
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại đăng nhập' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
