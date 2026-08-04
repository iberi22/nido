import { describe, it, expect } from 'vitest';
import {
  createSchedule,
  computeNextDue,
  isOverdue,
  daysUntilDue,
  normalizeToMidnight,
  createWorkOrder,
  updateWorkOrderStatus,
  listMaintenanceHistory
} from '../../src/lib/domain/maintenance';

describe('Maintenance Schedule Calculations', () => {
  it('should normalize a date to midnight local time', () => {
    const d = new Date(2026, 7, 3, 14, 30, 0); // 2026-08-03 14:30
    const normalized = normalizeToMidnight(d);
    expect(normalized.getHours()).toBe(0);
    expect(normalized.getMinutes()).toBe(0);
    expect(normalized.getSeconds()).toBe(0);
    expect(normalized.getMilliseconds()).toBe(0);
  });

  it('should create a schedule with correct next due date', () => {
    const lastDone = new Date(2026, 7, 1); // Aug 1
    const schedule = createSchedule('ac-unit-1', 30, lastDone);

    expect(schedule.itemId).toBe('ac-unit-1');
    expect(schedule.interval_days).toBe(30);
    expect(schedule.type).toBe('preventive');

    // nextDue should be Aug 31
    const expectedNextDue = new Date(2026, 7, 31);
    expect(schedule.nextDue.getTime()).toBe(expectedNextDue.getTime());
  });

  it('should calculate next due date correctly using computeNextDue', () => {
    const lastDone = new Date(2026, 7, 10); // Aug 10
    const scheduleMock = { lastDone, interval_days: 15 };
    const nextDue = computeNextDue(scheduleMock);

    const expectedNextDue = new Date(2026, 7, 25); // Aug 25
    expect(nextDue.getTime()).toBe(expectedNextDue.getTime());
  });

  it('should correctly evaluate if a schedule is overdue', () => {
    const lastDone = new Date(2026, 7, 1); // Aug 1
    const schedule = createSchedule('pump-2', 10, lastDone); // Due Aug 11

    // Today is Aug 10, not overdue
    expect(isOverdue(schedule, new Date(2026, 7, 10))).toBe(false);

    // Today is Aug 11, due date itself is not overdue (is over-due means strictly greater)
    expect(isOverdue(schedule, new Date(2026, 7, 11))).toBe(false);

    // Today is Aug 12, overdue
    expect(isOverdue(schedule, new Date(2026, 7, 12))).toBe(true);
  });

  it('should calculate correct number of days until due date', () => {
    const lastDone = new Date(2026, 7, 1); // Aug 1
    const schedule = createSchedule('roof-3', 10, lastDone); // Due Aug 11

    // Today is Aug 5, 6 days until due
    expect(daysUntilDue(schedule, new Date(2026, 7, 5))).toBe(6);

    // Today is Aug 11, 0 days until due
    expect(daysUntilDue(schedule, new Date(2026, 7, 11))).toBe(0);

    // Today is Aug 15, -4 days until due (overdue)
    expect(daysUntilDue(schedule, new Date(2026, 7, 15))).toBe(-4);
  });

  it('should create work orders from schedules and track status flow', () => {
    const schedule = createSchedule('boiler-1', 90, new Date(2026, 0, 1));
    let wo = createWorkOrder(schedule, { assignee: 'tech-a', notes: 'annual service' });

    expect(wo.scheduleId).toBe(schedule.id);
    expect(wo.itemId).toBe('boiler-1');
    expect(wo.status).toBe('open');

    wo = updateWorkOrderStatus(wo, 'in_progress');
    expect(wo.status).toBe('in_progress');
    expect(wo.updatedAt).toBeInstanceOf(Date);

    wo = updateWorkOrderStatus(wo, 'done');
    expect(wo.status).toBe('done');

    const property = { id: 'p1', name: 'Casa', workOrders: [wo] };
    expect(listMaintenanceHistory(property, 'boiler-1')).toHaveLength(1);
    expect(listMaintenanceHistory(property, 'other')).toHaveLength(0);
  });

  it('should allow manual work orders without a schedule', () => {
    const wo = createWorkOrder(null, {
      assignee: 'tech-b',
      notes: 'ad-hoc fix',
      itemId: 'faucet-2'
    });
    expect(wo.scheduleId).toBeNull();
    expect(wo.itemId).toBe('faucet-2');
    expect(wo.status).toBe('open');
  });
});
