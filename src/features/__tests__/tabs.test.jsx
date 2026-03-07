import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardTab } from '../dashboard/DashboardTab.jsx';
import { DocsTab } from '../documents/DocsTab.jsx';
import { ContractorsTab } from '../contractors/ContractorsTab.jsx';
import { BudgetTab } from '../budget/BudgetTab.jsx';
import { DailyLogTab } from '../daily-log/DailyLogTab.jsx';

const noop = () => {};

describe('Tab smoke tests', () => {
  it('DashboardTab renders without crashing', () => {
    const dashData = { totalBudget: 0, totalSpent: 0, totalPhases: 0, completedPhases: 0, overallProgress: 0, activeContractors: 0, openIssues: 0 };
    const { container } = render(
      <DashboardTab dashData={dashData} notifications={[]} smartSuggestions={[]} phases={[]} exportCSV={noop} quickExport={noop} setActiveTab={noop} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('DocsTab renders without crashing', () => {
    const { container } = render(
      <DocsTab documents={[]} setDocuments={noop} setViewDoc={noop} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('ContractorsTab renders without crashing', () => {
    const { container } = render(
      <ContractorsTab contractors={[]} phases={[]} setEditContractor={noop} setWaCompose={noop} setWaText={noop} openWhatsApp={noop} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('BudgetTab renders without crashing', () => {
    const dashData = { totalBudget: 0, totalSpent: 0 };
    const { container } = render(
      <BudgetTab budget={[]} setBudget={noop} dashData={dashData} phases={[]} setEditBudget={noop} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('DailyLogTab renders without crashing', () => {
    const { container } = render(
      <DailyLogTab dailyLogs={[]} punchList={[]} setEditLog={noop} setEditPunch={noop} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
