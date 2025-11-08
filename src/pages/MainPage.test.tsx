import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MainPage from './MainPage';

describe('MainPage Component', () => {
  const mockOnAddNote = vi.fn();
  const mockOnCallEngrammerFlow = vi.fn();
  const mockOnContinueEngrammerFlow = vi.fn();
  const mockOnEngrammerResponseClick = vi.fn();

  const defaultProps = {
    onAddNote: mockOnAddNote,
    onCallEngrammerFlow: mockOnCallEngrammerFlow,
    onContinueEngrammerFlow: mockOnContinueEngrammerFlow,
    engrammerState: null,
    isEngrammerWorking: false,
    isInsightWorking: false,
    engrammerError: null,
    onEngrammerResponseClick: mockOnEngrammerResponseClick,
  };

  it('should render NoteInput and Engrammer section', () => {
    render(<MainPage {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Write your thoughts here.../i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask Engrammer a question.../i)).toBeInTheDocument();
  });

  it('should show loading animation when Engrammer is working', () => {
    render(<MainPage {...defaultProps} isEngrammerWorking={true} />);
    expect(screen.getByTestId('insight-bloom-animation')).toBeInTheDocument();
  });

  it('should display Engrammer response', () => {
    const engrammerState = [{ type: 'end', content: 'Test response' }];
    render(<MainPage {...defaultProps} engrammerState={engrammerState} />);
    expect(screen.getByText('Test response')).toBeInTheDocument();
  });

  it('should display error message when engrammerError is present', () => {
    render(<MainPage {...defaultProps} engrammerError="Test Error" />);
    expect(screen.getByText('Test Error')).toBeInTheDocument();
  });

  it('should call onEngrammerResponseClick when response is clicked', () => {
    const engrammerState = [{ type: 'end', content: 'Clickable Ref: note-123' }];
    render(<MainPage {...defaultProps} engrammerState={engrammerState} />);
    fireEvent.click(screen.getByText(/Clickable Ref: note-123/i));
    expect(mockOnEngrammerResponseClick).toHaveBeenCalledWith('note-123');
  });

  it('should show HITL input and call onContinueEngrammerFlow', async () => {
    const engrammerState = [{ type: 'human', content: 'Please provide more details.' }];
    render(<MainPage {...defaultProps} engrammerState={engrammerState} />);
    
    const hitlInput = screen.getByPlaceholderText(/Your response.../i);
    const hitlButton = screen.getByText(/Continue/i);

    fireEvent.change(hitlInput, { target: { value: 'User input' } });
    fireEvent.click(hitlButton);

    await waitFor(() => expect(mockOnContinueEngrammerFlow).toHaveBeenCalledWith('User input'));
  });
});
