import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppData } from '../context/useAppData';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input, fieldClasses } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import type { EvaluationSection } from '../types';

export function EvaluationCriteriaPage() {
  const {
    evaluationTemplate,
    addEvaluationSection,
    renameEvaluationSection,
    removeEvaluationSection,
    addEvaluationCriterion,
    renameEvaluationCriterion,
    removeEvaluationCriterion,
  } = useAppData();

  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);

  const totalCriteria = evaluationTemplate.reduce((sum, s) => sum + s.criteria.length, 0);

  async function handleAddSection(e: FormEvent) {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    setIsAddingSection(true);
    try {
      await addEvaluationSection(newSectionName.trim());
      setNewSectionName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsAddingSection(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Sections and criteria used on the Interview Evaluation Form. Each criterion is scored 1-5, so the
        current template totals {totalCriteria * 5} points across {totalCriteria} criteria. Changes here apply
        to future evaluations only — past reports keep the wording they were submitted with.
      </p>

      {evaluationTemplate.length === 0 ? (
        <EmptyState icon={Trash2} message="No evaluation sections yet." />
      ) : (
        evaluationTemplate.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            onRenameSection={renameEvaluationSection}
            onRemoveSection={removeEvaluationSection}
            onAddCriterion={addEvaluationCriterion}
            onRenameCriterion={renameEvaluationCriterion}
            onRemoveCriterion={removeEvaluationCriterion}
          />
        ))
      )}

      <Card>
        <CardContent>
          <form className="flex items-end gap-2" onSubmit={handleAddSection}>
            <div className="flex-1">
              <Input
                label="New section name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isAddingSection}>
              <Plus size={16} />
              Add Section
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionCard({
  section,
  onRenameSection,
  onRemoveSection,
  onAddCriterion,
  onRenameCriterion,
  onRemoveCriterion,
}: {
  section: EvaluationSection;
  onRenameSection: (id: string, name: string) => Promise<void>;
  onRemoveSection: (id: string) => Promise<void>;
  onAddCriterion: (sectionId: string, name: string) => Promise<void>;
  onRenameCriterion: (id: string, name: string) => Promise<void>;
  onRemoveCriterion: (id: string) => Promise<void>;
}) {
  const [sectionName, setSectionName] = useState(section.name);
  const [newCriterionName, setNewCriterionName] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleSaveSectionName() {
    if (!sectionName.trim() || sectionName === section.name) return;
    try {
      await onRenameSection(section.id, sectionName.trim());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function handleRemoveSection() {
    if (isRemoving) return;
    if (!window.confirm(`Remove "${section.name}" and all its criteria?`)) return;
    setIsRemoving(true);
    try {
      await onRemoveSection(section.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsRemoving(false);
    }
  }

  async function handleAddCriterion(e: FormEvent) {
    e.preventDefault();
    if (!newCriterionName.trim()) return;
    try {
      await onAddCriterion(section.id, newCriterionName.trim());
      setNewCriterionName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-end gap-2">
          <div className="flex-1">
            <Input
              label="Section name"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              onBlur={handleSaveSectionName}
            />
          </div>
        </div>
        <Button size="sm" variant="danger" disabled={isRemoving} onClick={handleRemoveSection}>
          Remove Section
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {section.criteria.length === 0 ? (
          <p className="text-sm text-slate-400">No criteria in this section yet.</p>
        ) : (
          section.criteria.map((criterion) => (
            <CriterionRow
              key={criterion.id}
              id={criterion.id}
              name={criterion.name}
              onRename={onRenameCriterion}
              onRemove={onRemoveCriterion}
            />
          ))
        )}

        <form className="flex items-end gap-2 border-t border-slate-100 pt-3" onSubmit={handleAddCriterion}>
          <div className="flex-1">
            <Input
              label="New criterion"
              value={newCriterionName}
              onChange={(e) => setNewCriterionName(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm">
            <Plus size={14} />
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CriterionRow({
  id,
  name,
  onRename,
  onRemove,
}: {
  id: string;
  name: string;
  onRename: (id: string, name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [value, setValue] = useState(name);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleSave() {
    if (!value.trim() || value === name) return;
    try {
      await onRename(id, value.trim());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function handleRemove() {
    if (isRemoving) return;
    if (!window.confirm(`Remove "${name}"?`)) return;
    setIsRemoving(true);
    try {
      await onRemove(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
      setIsRemoving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        aria-label={name}
        className={fieldClasses}
      />
      <Button size="sm" variant="ghost" disabled={isRemoving} onClick={handleRemove} aria-label={`Remove ${name}`}>
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
