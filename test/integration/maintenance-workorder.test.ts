import { describe, it, expect } from 'vitest';
import {
  createSchedule,
  createWorkOrder,
  updateWorkOrderStatus,
  listMaintenanceHistory,
  computeNextDue,
  isOverdue,
  daysUntilDue,
  type Property,
  type WorkOrder
} from '../../src/lib/domain/maintenance';

describe('Maintenance and WorkOrder Integration Flow', () => {
  it('should flow correctly from schedule to open, in-progress, and done work orders, and log history', () => {
    // 1. Setup a schedule for elevator preventive maintenance
    const lastDone = new Date(2026, 6, 15); // July 15, 2026
    const schedule = createSchedule('elevator-main', 90, lastDone); // Due Oct 13, 2026

    // 2. Create a work order for this schedule
    let workOrder = createWorkOrder(schedule, {
      assignee: 'John Doe Services',
      notes: 'Quarterly elevator security and cable check'
    });

    expect(workOrder.scheduleId).toEqual(schedule.id);
    expect(workOrder.itemId).toEqual('elevator-main');
    expect(workOrder.status).toEqual('open');
    expect(workOrder.assignee).toEqual('John Doe Services');
    expect(workOrder.notes).toContain('Quarterly elevator');

    // 3. Update status to in_progress
    workOrder = updateWorkOrderStatus(workOrder, 'in_progress');
    expect(workOrder.status).toEqual('in_progress');
    expect(workOrder.updatedAt).toBeInstanceOf(Date);

    // 4. Update status to done
    workOrder = updateWorkOrderStatus(workOrder, 'done');
    expect(workOrder.status).toEqual('done');

    // 5. Add to property work orders history
    const property: Property = {
      id: 'prop-123',
      name: 'Nido Premium Apartment Suite',
      workOrders: [workOrder]
    };

    // 6. List history for the elevator item
    const history = listMaintenanceHistory(property, 'elevator-main');
    expect(history.length).toEqual(1);
    expect(history[0].id).toEqual(workOrder.id);
    expect(history[0].status).toEqual('done');
    expect(history[0].assignee).toEqual('John Doe Services');

    // 7. Manual work order with no schedule
    const manualWorkOrder = createWorkOrder(null, {
      itemId: 'lightbulb-corridor-1',
      assignee: 'Building Super',
      notes: 'Replace flicker light in main lobby'
    });

    expect(manualWorkOrder.scheduleId).toBeNull();
    expect(manualWorkOrder.itemId).toEqual('lightbulb-corridor-1');
    expect(manualWorkOrder.status).toEqual('open');

    property.workOrders?.push(manualWorkOrder);

    // Check history for lightbulb
    const lightbulbHistory = listMaintenanceHistory(property, 'lightbulb-corridor-1');
    expect(lightbulbHistory.length).toEqual(1);
    expect(lightbulbHistory[0].notes).toEqual('Replace flicker light in main lobby');
  });

  it('should compute next due date with month/year roll-over', () => {
    // Rollover across months (Dec to Jan)
    const lastDone = new Date(2026, 11, 20); // Dec 20, 2026
    const schedule = createSchedule('hvac-1', 20, lastDone); // Due Jan 9, 2027

    expect(schedule.nextDue.getFullYear()).toEqual(2027);
    expect(schedule.nextDue.getMonth()).toEqual(0); // Jan is 0
    expect(schedule.nextDue.getDate()).toEqual(9);
  });

  it('should correctly determine if a schedule is overdue relative to reference dates', () => {
    const lastDone = new Date(2026, 7, 1); // Aug 1
    const schedule = createSchedule('water-pump', 15, lastDone); // Due Aug 16

    // Check exactly on due date (isOverdue is strictly greater than)
    const exactlyDue = new Date(2026, 7, 16);
    expect(isOverdue(schedule, exactlyDue)).toEqual(false);

    // Check one day after
    const overdueDay = new Date(2026, 7, 17);
    expect(isOverdue(schedule, overdueDay)).toEqual(true);

    // Check before due date
    const earlyDay = new Date(2026, 7, 15);
    expect(isOverdue(schedule, earlyDay)).toEqual(false);
  });

  it('should track days remaining until next due across date boundaries', () => {
    const lastDone = new Date(2026, 11, 15); // Dec 15, 2026
    const schedule = createSchedule('roof-check', 30, lastDone); // Due Jan 14, 2027

    // Today is Dec 31, 2026
    const today = new Date(2026, 11, 31);
    const remaining = daysUntilDue(schedule, today);
    // Jan 14 - Dec 31 = 14 days
    expect(remaining).toEqual(14);

    // Today is Jan 15, 2027 (1 day overdue)
    const lateToday = new Date(2027, 0, 15);
    const overdueDays = daysUntilDue(schedule, lateToday);
    expect(overdueDays).toEqual(-1);
  });

  it('should handle manual work orders and maintain clear history isolation per item', () => {
    const property: Property = {
      id: 'prop-456',
      name: 'Secondary House',
      workOrders: []
    };

    const wo1 = createWorkOrder(null, {
      itemId: 'toilet-leak',
      assignee: 'Plumber Joe',
      notes: 'Fixing master bathroom leak'
    });

    const wo2 = createWorkOrder(null, {
      itemId: 'kitchen-paint',
      assignee: 'Painter Ann',
      notes: 'Repainting kitchen walls'
    });

    property.workOrders?.push(wo1, wo2);

    const leakHistory = listMaintenanceHistory(property, 'toilet-leak');
    expect(leakHistory.length).toEqual(1);
    expect(leakHistory[0].assignee).toEqual('Plumber Joe');

    const paintHistory = listMaintenanceHistory(property, 'kitchen-paint');
    expect(paintHistory.length).toEqual(1);
    expect(paintHistory[0].assignee).toEqual('Painter Ann');

    const nonExistentHistory = listMaintenanceHistory(property, 'missing-item');
    expect(nonExistentHistory.length).toEqual(0);
  });
});
