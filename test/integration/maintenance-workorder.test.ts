import { describe, it, expect } from 'vitest';
import {
  createSchedule,
  createWorkOrder,
  updateWorkOrderStatus,
  listMaintenanceHistory,
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

    expect(workOrder.scheduleId).toBe(schedule.id);
    expect(workOrder.itemId).toBe('elevator-main');
    expect(workOrder.status).toBe('open');
    expect(workOrder.assignee).toBe('John Doe Services');
    expect(workOrder.notes).toContain('Quarterly elevator');

    // 3. Update status to in_progress
    workOrder = updateWorkOrderStatus(workOrder, 'in_progress');
    expect(workOrder.status).toBe('in_progress');
    expect(workOrder.updatedAt).toBeInstanceOf(Date);

    // 4. Update status to done
    workOrder = updateWorkOrderStatus(workOrder, 'done');
    expect(workOrder.status).toBe('done');

    // 5. Add to property work orders history
    const property: Property = {
      id: 'prop-123',
      name: 'Nido Premium Apartment Suite',
      workOrders: [workOrder]
    };

    // 6. List history for the elevator item
    const history = listMaintenanceHistory(property, 'elevator-main');
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(workOrder.id);
    expect(history[0].status).toBe('done');
    expect(history[0].assignee).toBe('John Doe Services');

    // 7. Manual work order with no schedule
    const manualWorkOrder = createWorkOrder(null, {
      itemId: 'lightbulb-corridor-1',
      assignee: 'Building Super',
      notes: 'Replace flicker light in main lobby'
    });

    expect(manualWorkOrder.scheduleId).toBeNull();
    expect(manualWorkOrder.itemId).toBe('lightbulb-corridor-1');
    expect(manualWorkOrder.status).toBe('open');

    property.workOrders?.push(manualWorkOrder);

    // Check history for lightbulb
    const lightbulbHistory = listMaintenanceHistory(property, 'lightbulb-corridor-1');
    expect(lightbulbHistory.length).toBe(1);
    expect(lightbulbHistory[0].notes).toBe('Replace flicker light in main lobby');
  });
});
