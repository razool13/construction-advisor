import { describe, it, expect } from 'vitest';
import { parseGanttCommands, applyGanttCommandsToPhases } from '../gantt-commands.js';

describe('parseGanttCommands', () => {
  it('parses ADD command', () => {
    const text = 'Some text [GANTT:ADD|Foundation|2025-01-01|2025-02-01|#ff0000]';
    const { cleanText, ganttCmds } = parseGanttCommands(text);
    expect(ganttCmds).toHaveLength(1);
    expect(ganttCmds[0].action).toBe('ADD');
    expect(ganttCmds[0].params).toEqual(['Foundation', '2025-01-01', '2025-02-01', '#ff0000']);
    expect(cleanText).not.toContain('[GANTT:');
  });

  it('parses DELETE command', () => {
    const text = '[GANTT:DELETE|Foundation]';
    const { ganttCmds } = parseGanttCommands(text);
    expect(ganttCmds).toHaveLength(1);
    expect(ganttCmds[0].action).toBe('DELETE');
  });

  it('parses MOVE command', () => {
    const text = '[GANTT:MOVE|Foundation|2025-03-01|2025-04-01]';
    const { ganttCmds } = parseGanttCommands(text);
    expect(ganttCmds[0].action).toBe('MOVE');
    expect(ganttCmds[0].params[1]).toBe('2025-03-01');
  });

  it('parses UPDATE command', () => {
    const text = '[GANTT:UPDATE|Foundation|progress=50|status=active]';
    const { ganttCmds } = parseGanttCommands(text);
    expect(ganttCmds[0].action).toBe('UPDATE');
  });

  it('parses multiple commands', () => {
    const text = '[GANTT:ADD|A|2025-01-01|2025-02-01]\n[GANTT:DELETE|B]';
    const { ganttCmds } = parseGanttCommands(text);
    expect(ganttCmds).toHaveLength(2);
  });

  it('returns original text when no commands', () => {
    const text = 'Just regular text';
    const { cleanText, ganttCmds } = parseGanttCommands(text);
    expect(ganttCmds).toHaveLength(0);
    expect(cleanText).toBe(text);
  });
});

describe('applyGanttCommandsToPhases', () => {
  const basePhases = [
    { id: '1', name: 'Foundation', start: '2025-01-01', end: '2025-02-01', color: '#6366f1', status: 'pending', contractor: '', progress: 0 },
    { id: '2', name: 'Framing', start: '2025-02-01', end: '2025-03-01', color: '#6366f1', status: 'pending', contractor: '', progress: 0 },
  ];

  it('adds a new phase', () => {
    const cmds = [{ action: 'ADD', params: ['Roofing', '2025-03-01', '2025-04-01', '#ff0000'] }];
    const result = applyGanttCommandsToPhases(cmds, basePhases);
    expect(result).toHaveLength(3);
    expect(result[2].name).toBe('Roofing');
    expect(result[2].color).toBe('#ff0000');
  });

  it('deletes a phase by name', () => {
    const cmds = [{ action: 'DELETE', params: ['Foundation'] }];
    const result = applyGanttCommandsToPhases(cmds, basePhases);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Framing');
  });

  it('moves a phase to new dates', () => {
    const cmds = [{ action: 'MOVE', params: ['Foundation', '2025-06-01', '2025-07-01'] }];
    const result = applyGanttCommandsToPhases(cmds, basePhases);
    expect(result[0].start).toBe('2025-06-01');
    expect(result[0].end).toBe('2025-07-01');
  });

  it('updates phase fields', () => {
    const cmds = [{ action: 'UPDATE', params: ['Foundation', 'progress=75', 'status=active'] }];
    const result = applyGanttCommandsToPhases(cmds, basePhases);
    expect(result[0].progress).toBe(75);
    expect(result[0].status).toBe('active');
  });

  it('does not mutate original array', () => {
    const cmds = [{ action: 'DELETE', params: ['Foundation'] }];
    applyGanttCommandsToPhases(cmds, basePhases);
    expect(basePhases).toHaveLength(2);
  });

  it('reorders phases', () => {
    const cmds = [{ action: 'REORDER', params: ['Framing', 'Foundation'] }];
    const result = applyGanttCommandsToPhases(cmds, basePhases);
    expect(result[0].name).toBe('Framing');
    expect(result[1].name).toBe('Foundation');
  });
});
