import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock child components to simplify App.tsx testing
const MockMainPage = vi.fn(() => <div data-testid="main-page"></div>);
vi.mock('./pages/MainPage', () => ({
  default: MockMainPage,
}));

vi.mock('./firebase', () => ({
  findConnectionsCloud: vi.fn(),
  embedNote: vi.fn(),
  engrammerFlow_start: vi.fn(),
  getEngrammerState: vi.fn(),
  engrammerFlow_continue: vi.fn(),
  engrammerFlow_getNote: vi.fn(),
}));

vi.mock('./db', () => ({
  db: {
    notes: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock React.Suspense to render children immediately
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    Suspense: ({ children }: { children: React.ReactNode }) => children,
  };
});


describe('App Component', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    MockMainPage.mockClear();
  });

  it('should render MainPage and pass correct initial props', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('main-page')).toBeInTheDocument();
    });

    // The mock component is called with two arguments in this test environment: (props, undefined)
    // The assertion must match this signature.
    expect(MockMainPage).toHaveBeenCalledWith(
      // 1. The props object, checking only for initially available props.
      expect.objectContaining({
        isEngrammerWorking: false,
        isInsightWorking: false,
        engrammerError: null,
        onAddNote: expect.any(Function),
        onCallEngrammerFlow: expect.any(Function),
        onEngrammerResponseClick: expect.any(Function),
        // onContinueEngrammerFlow is correctly omitted as it's not present on initial render.
      }),
      // 2. The second argument, which is `undefined`.
      undefined
    );
  });
});
