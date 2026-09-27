import type { Interview } from '../types';

// A "round" is any interview that was not cancelled, in the order the caller passes them (date order).
export function interviewRounds(interviews: Interview[]): Interview[] {
  return interviews.filter((interview) => interview.status !== 'Cancelled');
}

// The clicked interview, or -- before anything is clicked or if it has disappeared -- the latest
// evaluated round, falling back to the latest round of any kind.
export function resolveSelectedInterview(
  interviews: Interview[],
  selectedId: string | null,
): Interview | undefined {
  const clicked = interviews.find((interview) => interview.id === selectedId);
  if (clicked) return clicked;

  const rounds = interviewRounds(interviews);
  return [...rounds].reverse().find((interview) => interview.evaluation) ?? rounds[rounds.length - 1];
}
