import type { Interview } from '../types';

function daysFromNow(n: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const interviews: Interview[] = [
  {
    id: 'i1',
    candidateId: 'c1',
    interviewers: ['Priya Nair'],
    date: daysFromNow(1, 14),
    durationMinutes: 45,
    type: 'Technical',
    status: 'Scheduled',
    location: 'https://meet.example.com/ava-tech',
  },
  {
    id: 'i2',
    candidateId: 'c5',
    interviewers: ['Daniel Cho', 'Priya Nair'],
    date: daysFromNow(2, 10),
    durationMinutes: 60,
    type: 'Technical',
    status: 'Scheduled',
    location: 'https://meet.example.com/emma-tech',
  },
  {
    id: 'i3',
    candidateId: 'c9',
    interviewers: ['Sam Osei'],
    date: daysFromNow(3, 11),
    durationMinutes: 30,
    type: 'Phone',
    status: 'Scheduled',
  },
  {
    id: 'i4',
    candidateId: 'c3',
    interviewers: ['Hana Suzuki'],
    date: daysFromNow(-6, 15),
    durationMinutes: 60,
    type: 'Final',
    status: 'Completed',
    notes: 'Great presentation, moving to offer.',
  },
  {
    id: 'i5',
    candidateId: 'c10',
    interviewers: ['Daniel Cho'],
    date: daysFromNow(-10, 13),
    durationMinutes: 45,
    type: 'Onsite',
    status: 'Completed',
    notes: 'Solid SQL skills, offer extended.',
  },
  {
    id: 'i6',
    candidateId: 'c6',
    interviewers: ['Sam Osei'],
    date: daysFromNow(-15, 9),
    durationMinutes: 45,
    type: 'Technical',
    status: 'Completed',
    notes: 'Rejected after technical round.',
  },
  {
    id: 'i7',
    candidateId: 'c11',
    interviewers: ['Hana Suzuki'],
    date: daysFromNow(-3, 16),
    durationMinutes: 30,
    type: 'Phone',
    status: 'Cancelled',
    notes: 'Candidate withdrew.',
  },
  {
    id: 'i8',
    candidateId: 'c1',
    interviewers: ['Hana Suzuki'],
    date: daysFromNow(-8, 10),
    durationMinutes: 30,
    type: 'Phone',
    status: 'Completed',
    notes: 'Good communication, advanced to technical round.',
  },
  {
    id: 'i9',
    candidateId: 'c5',
    interviewers: ['Sam Osei'],
    date: daysFromNow(6, 9),
    durationMinutes: 45,
    type: 'Onsite',
    status: 'Scheduled',
    location: 'HQ - Room 4B',
  },
];
