import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import CreateNotificationModal from '../../components/CreateNotificationModal';

function renderModal(onSubmit = vi.fn<() => Promise<boolean>>()) {
  const onClose = vi.fn();
  const trigger = document.createElement('button');
  trigger.textContent = 'Create notification';
  document.body.appendChild(trigger);
  trigger.focus();

  const utils = render(<CreateNotificationModal onClose={onClose} onSubmit={onSubmit} />);

  return { ...utils, onClose, onSubmit, trigger };
}

describe('CreateNotificationModal', () => {
  it('does not show a validation error when it first opens', () => {
    renderModal();

    expect(screen.queryByText(/Message is required/i)).not.toBeInTheDocument();
    expect(screen.queryByText('✓ Valid')).not.toBeInTheDocument();
  });

  it('moves focus into the dialog on open', () => {
    renderModal();

    expect(document.activeElement).toBe(screen.getByLabelText('Message'));
  });

  it('shows a required error after blurring an empty message', () => {
    renderModal();

    fireEvent.blur(screen.getByLabelText('Message'));

    expect(screen.getByText('Message is required.')).toBeInTheDocument();
  });

  it('shows a whitespace-only error', () => {
    renderModal();

    const textarea = screen.getByLabelText('Message');
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.blur(textarea);

    expect(screen.getByText('Message cannot contain only whitespace.')).toBeInTheDocument();
  });

  it('shows a maximum-length error for a message over 500 characters', () => {
    renderModal();

    const textarea = screen.getByLabelText('Message');
    fireEvent.change(textarea, { target: { value: 'x'.repeat(501) } });
    fireEvent.blur(textarea);

    expect(screen.getByText('Message must be 500 characters or fewer.')).toBeInTheDocument();
  });

  it('shows a valid indicator once a real message is typed and the field is touched', () => {
    renderModal();

    const textarea = screen.getByLabelText('Message');
    fireEvent.change(textarea, { target: { value: 'Hello user!' } });
    fireEvent.blur(textarea);

    expect(screen.getByText('✓ Valid')).toBeInTheDocument();
  });

  it('clears the error automatically once the message becomes valid', () => {
    renderModal();

    const textarea = screen.getByLabelText('Message');
    fireEvent.blur(textarea);
    expect(screen.getByText('Message is required.')).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'Now valid' } });

    expect(screen.queryByText('Message is required.')).not.toBeInTheDocument();
  });

  it('updates the character counter as the user types', () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello' } });

    expect(screen.getByText('5/500')).toBeInTheDocument();
  });

  it('prevents submission when the message is invalid and shows the error', () => {
    const onSubmit = vi.fn();
    renderModal(onSubmit);

    fireEvent.click(screen.getByRole('button', { name: /Send notification/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Message is required.')).toBeInTheDocument();
  });

  it('submits the selected type and typed message, then closes on success', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const { onClose } = renderModal(onSubmit);

    fireEvent.click(screen.getByRole('radio', { name: /Alert/i }));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Disk usage is high' } });
    fireEvent.click(screen.getByRole('button', { name: /Send notification/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith('alert', 'Disk usage is high');
  });

  it('shows a sending state while the submission is in flight and blocks duplicate submits', async () => {
    let resolveSubmit: ((value: boolean) => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    renderModal(onSubmit);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /Send notification/i }));

    const sendingButton = await screen.findByRole('button', { name: /Sending/i });
    expect(sendingButton).toBeDisabled();

    fireEvent.click(sendingButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolveSubmit?.(true);
  });

  it('keeps the modal open and preserves the typed message when submission fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    const { onClose } = renderModal(onSubmit);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Will this survive?' } });
    fireEvent.click(screen.getByRole('button', { name: /Send notification/i }));

    expect(await screen.findByText(/Unable to send notification/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Message')).toHaveValue('Will this survive?');
  });

  it('closes and returns focus to the trigger element when Cancel is clicked', () => {
    const { onClose, trigger } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);
  });

  it('does not show a validation error on open under StrictMode', () => {
    // Regression test: an earlier version restored focus to the trigger
    // element from the focus-management effect's cleanup. React's
    // StrictMode double-invokes every effect in development (setup ->
    // cleanup -> setup) specifically to catch cleanup that isn't safe to
    // run early - that refocus fired a real blur on the textarea before
    // the user ever touched it, marking the field "touched" and showing
    // "Message is required." the instant the dialog opened.
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    render(
      <StrictMode>
        <CreateNotificationModal onClose={vi.fn()} onSubmit={vi.fn()} />
      </StrictMode>,
    );

    expect(screen.queryByText('Message is required.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toHaveValue('');
  });

  it('closes when Escape is pressed', () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the overlay backdrop is clicked, but not when the dialog itself is clicked', () => {
    const { onClose, container } = renderModal();

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    // The backdrop is deliberately aria-hidden (it's a mouse-only close
    // affordance; keyboard users close via Escape), so it's queried
    // directly rather than through an accessible role.
    const backdrop = container.querySelector('.modal-overlay-backdrop');
    if (backdrop === null) {
      throw new Error('Expected the modal overlay backdrop to be present');
    }
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps focus from the last element to the first on Tab', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');
    const sendButton = screen.getByRole('button', { name: /Send notification/i });
    sendButton.focus();

    fireEvent.keyDown(dialog, { key: 'Tab' });

    const [firstRadio] = screen.getAllByRole('radio');
    expect(document.activeElement).toBe(firstRadio);
  });

  it('wraps focus from the first element to the last on Shift+Tab', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');
    const [firstRadio] = screen.getAllByRole('radio');
    firstRadio?.focus();

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Send notification/i }));
  });

  it('ignores a duplicate form submission while one is already in flight', async () => {
    let resolveSubmit: ((value: boolean) => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const { container } = renderModal(onSubmit);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello' } });
    const form = container.querySelector('form');
    if (form === null) {
      throw new Error('Expected a form element');
    }

    fireEvent.submit(form);
    await screen.findByRole('button', { name: /Sending/i });
    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolveSubmit?.(true);
  });
});
