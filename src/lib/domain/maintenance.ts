export type WorkOrderStatus = 'open' | 'in_progress' | 'done';

export interface Schedule {
  id: string;
  itemId: string;
  type: 'preventive';
  interval_days: number;
  lastDone: Date;
  nextDue: Date;
}

export interface WorkOrder {
  id: string;
  scheduleId: string | null;
  itemId: string;
  status: WorkOrderStatus;
  assignee: string;
  notes: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Property {
  id: string;
  name: string;
  workOrders?: WorkOrder[];
}

/**
 * Normalizes a date to midnight in local time (or UTC, but consistently).
 * Let's use midnight local time for day-based operations to avoid timezone flakiness.
 */
export function normalizeToMidnight(date: Date): Date {
  const normalized = new Date(date.getTime());
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Creates a preventive maintenance schedule for an item.
 */
export function createSchedule(itemId: string, interval_days: number, lastDone: Date): Schedule {
  const normalizedLastDone = normalizeToMidnight(lastDone);
  const nextDue = computeNextDue({ lastDone: normalizedLastDone, interval_days } as Schedule);

  return {
    id: `sched-${crypto.randomUUID()}`,
    itemId,
    type: 'preventive',
    interval_days,
    lastDone: normalizedLastDone,
    nextDue
  };
}

/**
 * Computes the next due date for a schedule (lastDone + interval_days).
 * Output normalized to midnight.
 */
export function computeNextDue(schedule: Pick<Schedule, 'lastDone' | 'interval_days'>): Date {
  const lastDoneTime = normalizeToMidnight(schedule.lastDone).getTime();
  const nextDueTime = lastDoneTime + schedule.interval_days * 86400000;
  return new Date(nextDueTime);
}

/**
 * Determines if a schedule is overdue relative to a reference date (today).
 */
export function isOverdue(schedule: Schedule, today: Date = new Date()): boolean {
  const normalizedToday = normalizeToMidnight(today);
  const normalizedNextDue = normalizeToMidnight(schedule.nextDue);
  return normalizedToday.getTime() > normalizedNextDue.getTime();
}

/**
 * Calculates the number of days remaining until the schedule's next due date.
 * Returns negative days if overdue.
 */
export function daysUntilDue(schedule: Schedule, today: Date = new Date()): number {
  const normalizedToday = normalizeToMidnight(today);
  const normalizedNextDue = normalizeToMidnight(schedule.nextDue);
  const diffMs = normalizedNextDue.getTime() - normalizedToday.getTime();
  return Math.round(diffMs / 86400000);
}

/**
 * Creates a WorkOrder from a Schedule (or manually for an item).
 */
export function createWorkOrder(
  schedule: Schedule | null,
  options: { assignee: string; notes: string; itemId?: string }
): WorkOrder {
  const itemId = schedule ? schedule.itemId : (options.itemId || 'unknown-item');
  const scheduleId = schedule ? schedule.id : null;

  return {
    id: `wo-${crypto.randomUUID()}`,
    scheduleId,
    itemId,
    status: 'open',
    assignee: options.assignee,
    notes: options.notes,
    createdAt: new Date()
  };
}

/**
 * Updates a WorkOrder's status.
 */
export function updateWorkOrderStatus(workOrder: WorkOrder, status: WorkOrderStatus): WorkOrder {
  return {
    ...workOrder,
    status,
    updatedAt: new Date()
  };
}

/**
 * Lists the completed/maintenance history or work orders for a specific item in a property.
 * If property has workOrders, returns those matching itemId.
 */
export function listMaintenanceHistory(property: Property, itemId: string): WorkOrder[] {
  const workOrders = property.workOrders || [];
  return workOrders.filter(wo => wo.itemId === itemId);
}
