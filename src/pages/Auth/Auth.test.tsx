import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { IonReactRouter } from '@ionic/react-router';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import AuthPage from './index';

// Mock the useAuth hook
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    resetPassword: mockResetPassword,
    user: null,
    error: null,
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({
      push: vi.fn(),
    }),
    useLocation: () => ({
      state: { from: { pathname: '/home' } },
    }),
  };
});

describe('AuthPage', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAuthPage = () => {
    return render(
      <IonReactRouter>
        <MemoryRouter>
          <AuthPage />
        </MemoryRouter>
      </IonReactRouter>
    );
  };

  test('renders login form', () => {
    renderAuthPage();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  test('validates email format', async () => {
    renderAuthPage();
    
    fireEvent.input(screen.getByLabelText('Email'), { 
      target: { value: 'invalid-email' } 
    });
    
    fireEvent.click(screen.getByText('Sign In'));
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });
  });

  test('handles login success', async () => {
    mockSignIn.mockResolvedValueOnce({ error: null });
    
    renderAuthPage();
    
    fireEvent.input(screen.getByLabelText('Email'), { 
      target: { value: 'test@example.com' } 
    });
    
    fireEvent.input(screen.getByLabelText('Password'), { 
      target: { value: 'password123' } 
    });
    
    fireEvent.click(screen.getByText('Sign In'));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('handles login error', async () => {
    mockSignIn.mockResolvedValueOnce({ 
      error: { message: 'Invalid credentials' } 
    });
    
    renderAuthPage();
    
    fireEvent.input(screen.getByLabelText('Email'), { 
      target: { value: 'test@example.com' } 
    });
    
    fireEvent.input(screen.getByLabelText('Password'), { 
      target: { value: 'wrongpassword' } 
    });
    
    fireEvent.click(screen.getByText('Sign In'));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('switches to sign up form', () => {
    renderAuthPage();
    
    fireEvent.click(screen.getByText('Create an account'));
    
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByText('Already have an account? Sign In')).toBeInTheDocument();
  });
});
