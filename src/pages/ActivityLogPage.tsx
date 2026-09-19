import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/date';
import type { ActivityLogEntry } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';

function describeAction(action: string): string {
  const [entity, verb] = action.split('.');
  const entityLabel = entity.charAt(0).toUpperCase() + entity.slice(1);
  const verbLabel = verb.replace(/_/g, ' ');
  return `${entityLabel} ${verbLabel}`;
}

export function ActivityLogPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ActivityLogEntry[]>('/activity-log')
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load activity log.'));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Recent changes to candidates, interviews, and accounts, with who made them and when.
      </p>

      <Card>
        <CardContent className="px-0 py-0">
          {error ? (
            <p className="px-4 py-6 text-sm text-red-600">{error}</p>
          ) : entries === null ? (
            <p className="px-4 py-6 text-sm text-slate-400">Loading…</p>
          ) : entries.length === 0 ? (
            <EmptyState icon={History} message="No activity recorded yet." />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>When</TableHeaderCell>
                  <TableHeaderCell>Who</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                  <TableHeaderCell>Item</TableHeaderCell>
                  <TableHeaderCell>Details</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
                    <TableCell>{entry.actorName}</TableCell>
                    <TableCell className="font-medium text-slate-900">{describeAction(entry.action)}</TableCell>
                    <TableCell>{entry.entityLabel ?? '—'}</TableCell>
                    <TableCell className="text-slate-500">{entry.details ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
