import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublishReadinessPanel } from './PublishReadinessPanel';

describe('PublishReadinessPanel', () => {
  it('shows ready state message', () => {
    render(
      <PublishReadinessPanel
        readiness={{
          blockers: [],
          warnings: [],
          ready: true,
        }}
      />
    );

    expect(screen.getByText('Ready To Publish')).toBeInTheDocument();
  });

  it('renders blockers and warnings', () => {
    render(
      <PublishReadinessPanel
        readiness={{
          blockers: ['Title is required', 'Category is required'],
          warnings: ['No files uploaded yet'],
          ready: false,
        }}
      />
    );

    expect(screen.getByText('Publish Requirements')).toBeInTheDocument();
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(screen.getByText('No files uploaded yet')).toBeInTheDocument();
  });
});
