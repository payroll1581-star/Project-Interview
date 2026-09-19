export interface ActivityLogEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  details?: string;
  createdAt: string;
}
