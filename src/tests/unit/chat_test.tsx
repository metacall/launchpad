import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInterface } from '@/features/chat/components/ChatInterface';
import { generateMetaCallReply } from '@/features/chat/support';

describe('ChatInterface', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns helpful rule-based responses for deployment questions', () => {
    expect(generateMetaCallReply('How do I deploy a ZIP package?')).toMatch(/Deployments/i);
    expect(generateMetaCallReply('Show function logs')).toMatch(/Logs/i);
    expect(generateMetaCallReply('How can I call a function?')).toMatch(/Inspect\/Call/i);
  });

  it('sends a message, persists it, and resets the chat', () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'deploy a ZIP package' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('deploy a ZIP package')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText(/open Deployments/i)).toBeInTheDocument();
    expect(localStorage.getItem('metacall_launchpad_chat')).toContain('deploy a ZIP package');

    fireEvent.click(screen.getByRole('button', { name: 'Reset chat' }));
    expect(screen.queryByText('deploy a ZIP package')).not.toBeInTheDocument();
    expect(screen.getByText(/Welcome to MetaCall Support/i)).toBeInTheDocument();
  });
});
