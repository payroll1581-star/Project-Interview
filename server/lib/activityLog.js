import { db } from '../db.js';
import { generateId } from './ids.js';

const insertEntry = db.prepare(
  `INSERT INTO activity_log (id, actor_id, actor_name, action, entity_type, entity_id, entity_label, details, created_at)
   VALUES (@id, @actorId, @actorName, @action, @entityType, @entityId, @entityLabel, @details, @createdAt)`,
);

export function logActivity({ actor, action, entityType, entityId, entityLabel, details }) {
  insertEntry.run({
    id: generateId('log'),
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? 'System',
    action,
    entityType,
    entityId: entityId ?? null,
    entityLabel: entityLabel ?? null,
    details: details ?? null,
    createdAt: new Date().toISOString(),
  });
}
