import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainPage from './MainPage';
import { EngrammerSessionState } from '../App';

// Mock child components to isolate MainPage logic
vi.mock('../components/NoteInput', () => ({ 
  default: ({ onAddNote }) => (
    <form aria-label="note-form" onSubmit={(e) => { e.preventDefault(); onAddNote({ text: 'mock text', attachment: null }); }}>
      <input type="text" placeholder="Write your thoughts, or attach a file..." />
      <button type="submit" aria-label="Add Note">Send</button>
    </form>
  )
}));
vi.mock('../components/InsightBloomAnimation', () => ({ 
  default: () => <div data-testid="insight-bloom-animation" /> 
}));


describe('MainPage Component', () => {
  const user = userEvent.setup();
  const mockOnAddNote = vi.fn();
  const mockOnCallEngrammerFlow = vi.fn();
  const mockOnContinueEngrammerFlow = vi.fn();
  const mockOnEngrammerResponseClick = vi.fn();

  const defaultProps = {
    onAddNote: mockOnAddNote,
    onCallEngrammerFlow: mockOnCallEngrammerFlow,
    onContinueEngrammerFlow: mockOnContinueEngrammerFlow,
    engrammerState: undefined,
    isEngrammerWorking: false,
    isInsightWorking: false,
    engrammerError: null,
    onEngrammerResponseClick: mockOnEngrammerResponseClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onCallEngrammerFlow when engrammer form is submitted', async () => {
    render(<MainPage {...defaultProps} />);
    const engrammerInput = screen.getByPlaceholderText(/Ask Engrammer a question.../i);
    const engrammerButton = screen.getByRole('button', { name: /Ask Engrammer/i });

    await user.type(engrammerInput, 'Test Query');
    await user.click(engrammerButton);

    expect(mockOnCallEngrammerFlow).toHaveBeenCalledWith('Test Query');
  });

  it('should display final response when engrammerState status is done', () => {
    const doneState: EngrammerSessionState = {
      threadId: '1', status: 'done', latestResponse: 'This is the final answer.', pendingInsights: null, references: null, error: null
    };
    render(<MainPage {...defaultProps} engrammerState={doneState} />);
    expect(screen.getByText('This is the final answer.')).toBeInTheDocument();
  });

  it('should call onEngrammerResponseClick when a reference link is clicked', async () => {
    const doneState: EngrammerSessionState = {
      threadId: '1', status: 'done', latestResponse: 'Here is a reference: Ref: note-abc-123.', pendingInsights: null, references: null, error: null
    };
    render(<MainPage {...defaultProps} engrammerState={doneState} />);
    await user.click(screen.getByText(/Ref: note-abc-123/i));
    expect(mockOnEngrammerResponseClick).toHaveBeenCalledWith('note-abc-123');
  });

  describe('when engrammerState status is interrupted (HITL)', () => {
    const interruptedState: EngrammerSessionState = {
      threadId: '1',
      status: 'interrupted',
      latestResponse: 'I found a new connection.',
      pendingInsights: [{ type: 'new_theme', description: 'Connecting A and B.' }],
      references: null,
      error: null
    };

    it('should call onContinueEngrammerFlow with "approve" when approve button is clicked', async () => {
      render(<MainPage {...defaultProps} engrammerState={interruptedState} onContinueEngrammerFlow={mockOnContinueEngrammerFlow} />);
      const approveButton = screen.getByRole('button', { name: /Approve & Continue/i });
      await user.click(approveButton);
      expect(mockOnContinueEngrammerFlow).toHaveBeenCalledWith('approve');
    });

    it('should call onContinueEngrammerFlow with "deny" when deny button is clicked', async () => {
      render(<MainPage {...defaultProps} engrammerState={interruptedState} onContinueEngrammerFlow={mockOnContinueEngrammerFlow} />);
      const denyButton = screen.getByRole('button', { name: /Deny/i });
      await user.click(denyButton);
      expect(mockOnContinueEngrammerFlow).toHaveBeenCalledWith('deny');
    });
  });
});
