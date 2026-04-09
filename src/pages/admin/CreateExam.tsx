import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, Loader2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionDraft {
  question_text: string;
  options: string[];
  correct_answer: number;
  marks: number;
}

export default function CreateExam() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeValue, setNegativeValue] = useState(0.25);
  const [randomize, setRandomize] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { question_text: '', options: ['', '', '', ''], correct_answer: 0, marks: 1 },
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { question_text: '', options: ['', '', '', ''], correct_answer: 0, marks: 1 }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSave = async (publish: boolean) => {
    if (!user) return;
    if (!title.trim()) { toast.error('Enter exam title'); return; }
    
    const emptyQ = questions.find(q => !q.question_text.trim() || q.options.some(o => !o.trim()));
    if (emptyQ) { toast.error('Fill all question fields and options'); return; }

    setSaving(true);
    try {
      const { data: exam, error: examErr } = await supabase.from('exams').insert({
        title: title.trim(),
        description: description.trim(),
        duration_minutes: duration,
        negative_marking: negativeMarking,
        negative_mark_value: negativeValue,
        randomize_questions: randomize,
        is_published: publish,
        created_by: user.id,
      }).select().single();

      if (examErr) throw examErr;

      const questionsToInsert = questions.map((q, i) => ({
        exam_id: exam.id,
        question_text: q.question_text.trim(),
        options: JSON.stringify(q.options),
        correct_answer: q.correct_answer,
        marks: q.marks,
        sort_order: i,
      }));

      const { error: qErr } = await supabase.from('questions').insert(questionsToInsert);
      if (qErr) throw qErr;

      toast.success(publish ? 'Exam published!' : 'Exam saved as draft');
      navigate('/admin/exams');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground">Create New Exam</h1>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Exam Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mathematics Final" />
          </div>
          <div>
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="randomize">Randomize question order</Label>
            <Switch id="randomize" checked={randomize} onCheckedChange={setRandomize} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="negative">Negative marking</Label>
            <Switch id="negative" checked={negativeMarking} onCheckedChange={setNegativeMarking} />
          </div>
          {negativeMarking && (
            <div>
              <Label htmlFor="negVal">Negative mark deduction (fraction of mark)</Label>
              <Input id="negVal" type="number" step={0.05} min={0} max={1} value={negativeValue} onChange={(e) => setNegativeValue(Number(e.target.value))} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold text-foreground">Questions ({questions.length})</h2>
        <Button variant="outline" onClick={addQuestion}><PlusCircle className="h-4 w-4 mr-2" /> Add Question</Button>
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <Card key={qi} className="glass-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span className="font-heading font-semibold text-sm">Q{qi + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Marks:</Label>
                  <Input
                    type="number"
                    min={1}
                    className="w-16 h-8 text-sm"
                    value={q.marks}
                    onChange={(e) => updateQuestion(qi, 'marks', Number(e.target.value))}
                  />
                  {questions.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeQuestion(qi)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <Textarea
                placeholder="Enter question text..."
                value={q.question_text}
                onChange={(e) => updateQuestion(qi, 'question_text', e.target.value)}
              />

              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(qi, 'correct_answer', oi)}
                      className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        q.correct_answer === oi
                          ? 'border-success bg-success text-success-foreground'
                          : 'border-muted-foreground text-muted-foreground hover:border-success/50'
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}
                    </button>
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Click a letter to mark it as the correct answer (green = correct)</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 justify-end pb-6">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save as Draft
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Publish Exam
        </Button>
      </div>
    </div>
  );
}
