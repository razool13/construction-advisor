import { describe, it, expect } from 'vitest';
import { parseBudgetCommands, applyBudgetCommandsToBudget } from '../budget-commands.js';

describe('parseBudgetCommands', () => {
  it('parses ADD command', () => {
    const text = 'בוצע [BUDGET:ADD|חשמל|15000|0|אינסטלציה וחשמל|הצעה ראשונית]';
    const { cleanText, budgetCmds } = parseBudgetCommands(text);
    expect(budgetCmds).toHaveLength(1);
    expect(budgetCmds[0].action).toBe('ADD');
    expect(budgetCmds[0].params[0]).toBe('חשמל');
    expect(budgetCmds[0].params[1]).toBe('15000');
    expect(cleanText).not.toContain('[BUDGET:');
  });

  it('parses UPDATE command with multiple fields', () => {
    const text = '[BUDGET:UPDATE|חשמל|planned=18000|actual=12500|notes=עודכן לאחר הצעה שנייה]';
    const { budgetCmds } = parseBudgetCommands(text);
    expect(budgetCmds[0].action).toBe('UPDATE');
    expect(budgetCmds[0].params).toContain('planned=18000');
    expect(budgetCmds[0].params).toContain('actual=12500');
  });

  it('parses DELETE command', () => {
    const text = '[BUDGET:DELETE|חשמל]';
    const { budgetCmds } = parseBudgetCommands(text);
    expect(budgetCmds[0].action).toBe('DELETE');
  });

  it('parses multiple commands', () => {
    const text = '[BUDGET:ADD|א|1000]\n[BUDGET:DELETE|ב]';
    const { budgetCmds } = parseBudgetCommands(text);
    expect(budgetCmds).toHaveLength(2);
  });

  it('returns original text when no commands', () => {
    const text = 'תשובה רגילה ללא פקודות';
    const { cleanText, budgetCmds } = parseBudgetCommands(text);
    expect(budgetCmds).toHaveLength(0);
    expect(cleanText).toBe(text);
  });

  it('does not match GANTT commands', () => {
    const text = '[GANTT:ADD|שלב|2025-01-01|2025-02-01]';
    const { budgetCmds } = parseBudgetCommands(text);
    expect(budgetCmds).toHaveLength(0);
  });
});

describe('applyBudgetCommandsToBudget', () => {
  const sample = () => [
    { id: '1', category: 'חשמל', planned: 10000, actual: 5000, phase: 'חשמל', notes: '' },
    { id: '2', category: 'אינסטלציה', planned: 8000, actual: 0, phase: 'אינסטלציה', notes: '' },
  ];

  it('ADD appends a new item with id', () => {
    const cmds = [{ action: 'ADD', params: ['גמרים', '20000', '0', 'גמרים', 'הערה'] }];
    const result = applyBudgetCommandsToBudget(cmds, sample());
    expect(result).toHaveLength(3);
    expect(result[2].category).toBe('גמרים');
    expect(result[2].planned).toBe(20000);
    expect(result[2].id).toBeTruthy();
  });

  it('ADD with missing fields fills defaults', () => {
    const cmds = [{ action: 'ADD', params: ['חדש'] }];
    const result = applyBudgetCommandsToBudget(cmds, []);
    expect(result[0].category).toBe('חדש');
    expect(result[0].planned).toBe(0);
    expect(result[0].actual).toBe(0);
    expect(result[0].phase).toBe('');
  });

  it('UPDATE modifies planned and actual numerically', () => {
    const cmds = [{ action: 'UPDATE', params: ['חשמל', 'planned=12000', 'actual=7500'] }];
    const result = applyBudgetCommandsToBudget(cmds, sample());
    const item = result.find((b) => b.category === 'חשמל');
    expect(item.planned).toBe(12000);
    expect(item.actual).toBe(7500);
  });

  it('UPDATE matches by substring (case-insensitive)', () => {
    const cmds = [{ action: 'UPDATE', params: ['אינסטל', 'notes=דחוף'] }];
    const result = applyBudgetCommandsToBudget(cmds, sample());
    const item = result.find((b) => b.category === 'אינסטלציה');
    expect(item.notes).toBe('דחוף');
  });

  it('UPDATE strips currency symbols from numbers', () => {
    const cmds = [{ action: 'UPDATE', params: ['חשמל', 'actual=₪9,500'] }];
    const result = applyBudgetCommandsToBudget(cmds, sample());
    expect(result.find((b) => b.category === 'חשמל').actual).toBe(9500);
  });

  it('DELETE removes matching items', () => {
    const cmds = [{ action: 'DELETE', params: ['חשמל'] }];
    const result = applyBudgetCommandsToBudget(cmds, sample());
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('אינסטלציה');
  });

  it('applies multiple commands sequentially', () => {
    const cmds = [
      { action: 'ADD', params: ['גמרים', '5000'] },
      { action: 'UPDATE', params: ['חשמל', 'planned=11000'] },
      { action: 'DELETE', params: ['אינסטלציה'] },
    ];
    const result = applyBudgetCommandsToBudget(cmds, sample());
    expect(result).toHaveLength(2);
    expect(result.find((b) => b.category === 'חשמל').planned).toBe(11000);
    expect(result.find((b) => b.category === 'גמרים')).toBeTruthy();
  });

  it('does not mutate original budget array', () => {
    const original = sample();
    const cmds = [{ action: 'DELETE', params: ['חשמל'] }];
    applyBudgetCommandsToBudget(cmds, original);
    expect(original).toHaveLength(2);
  });
});
