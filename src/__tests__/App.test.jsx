import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock fetch globally
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  localStorage.clear();
});

import { App } from '../App.jsx';

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows the header with app title', () => {
    render(<App />);
    expect(screen.getByText(/יועץ הבנייה שלי/i)).toBeInTheDocument();
  });

  it('renders tab navigation buttons', () => {
    render(<App />);
    expect(screen.getByText(/דשבורד/i)).toBeInTheDocument();
    expect(screen.getByText(/מסמכים/i)).toBeInTheDocument();
  });
});
