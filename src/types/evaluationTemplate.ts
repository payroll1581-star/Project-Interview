export interface EvaluationCriterionDef {
  id: string;
  name: string;
}

export interface EvaluationSection {
  id: string;
  name: string;
  criteria: EvaluationCriterionDef[];
}
