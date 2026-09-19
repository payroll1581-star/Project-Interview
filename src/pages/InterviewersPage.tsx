import { useState } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { useAppData } from '../context/useAppData';
import { InterviewerFormModal } from '../components/interviewers/InterviewerFormModal';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';

export function InterviewersPage() {
  const { interviewers, removeInterviewer, revokeUserSessions } = useAppData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      await removeInterviewer(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRevokeSessions(id: string, name: string) {
    if (!window.confirm(`Log ${name} out of all their devices?`)) return;
    setRevokingId(id);
    try {
      await revokeUserSessions(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Interviewer accounts that can log in and score interviews.</p>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus size={16} />
          Add Interviewer
        </Button>
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          {interviewers.length === 0 ? (
            <EmptyState icon={UserRound} message="No interviewer accounts yet." />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Position</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {interviewers.map((interviewer) => (
                  <TableRow key={interviewer.id}>
                    <TableCell className="font-medium text-slate-900">{interviewer.name}</TableCell>
                    <TableCell>{interviewer.position ?? '—'}</TableCell>
                    <TableCell>{interviewer.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={revokingId === interviewer.id}
                          onClick={() => handleRevokeSessions(interviewer.id, interviewer.name)}
                        >
                          Revoke sessions
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={removingId === interviewer.id}
                          onClick={() => handleRemove(interviewer.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InterviewerFormModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}
