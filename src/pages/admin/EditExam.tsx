import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  id?: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  marks: number;
}

export default function EditExam() {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeValue, setNegativeValue] = useState(0.25);
  const [randomize, setRandomize] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  useEffect(() => {
    if (!examId) return;
    const fetch = async () => {
      const [examRes, qRes] = await Promise.all([
        supabase.from('exams').select('*').eq('id', examId).single(),
        supabase.from('questions').select('*').eq('exam_id', examId).order('sort_order'),
      ]);
      if (!examRes.data) { navigate('/admin/exams'); return; }
      const e = examRes.data;
      setTitle(e.title);
      setDescription(e.description || '');
      setDuration(e.duration_minutes);
      setNegativeMarking(e.negative_marking);
      setNegativeValue(e.negative_mark_value);
      setRandomize(e.randomize_questions);
      setIsPublished(e.is_published);
      setQuestions((qRes.data || []).map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options as string[],
        correct_answer: q.correct_answer,
        marks: q.marks,
      })));
      setLoading(false);
    };
    fetch();
  }, [examId]);

  const addQuestion = () => {
    setQuestions([...questions, { question_text: '', options: ['', '', '', ''], correct_answer: 0, marks: 1 }]);
  };

  const removeQuestion = (index: number) => {
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

  const handleSave = async () => {
    if (!user || !examId) return;
    if (!title.trim()) { toast.error('Enter exam title'); return; }

    setSaving(true);
    try {
      await supabase.from('exams').update({
        title: title.trim(),
        description: description.trim(),
        duration_minutes: duration,
        negative_marking: negativeMarking,
        negative_mark_value: negativeValue,
        randomize_questions: randomize,
        is_published: isPublished,
      }).eq('id', examId);

      // Delete existing questions and re-insert
      await supabase.from('questions').delete().eq('exam_id', examId);
      const toInsert = questions.map((q, i) => ({
        exam_id: examId,
        question_text: q.question_text.trim(),
        options: JSON.stringify(q.options),
        correct_answer: q.correct_answer,
        marks: q.marks,
        sort_order: i,
      }));
      if (toInsert.length > 0) {
        await supabase.from('questions').insert(toInsert);
      }

      toast.success('Exam updated!');
      navigate('/admin/exams');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground">Edit Exam</h1>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-heading text-lg">Exam Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Randomize questions</Label>
            <Switch checked={randomize} onCheckedChange={setRandomize} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Negative marking</Label>
            <Switch checked={negativeMarking} onCheckedChange={setNegativeMarking} />
          </div>
          {negativeMarking && (
            <div>
              <Label>Negative mark deduction</Label>
              <Input type="number" step={0.05} min={0} max={1} value={negativeValue} onChange={(e) => setNegativeValue(Number(e.target.value))} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label>Published</Label>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
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
                  <Input type="number" min={1} className="w-16 h-8 text-sm" value={q.marks} onChange={(e) => updateQuestion(qi, 'marks', Number(e.target.value))} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeQuestion(qi)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Textarea value={q.question_text} onChange={(e) => updateQuestion(qi, 'question_text', e.target.value)} placeholder="Enter question text..." />
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(qi, 'correct_answer', oi)}
                      className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        q.correct_answer === oi ? 'border-success bg-success text-success-foreground' : 'border-muted-foreground text-muted-foreground hover:border-success/50'
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}
                    </button>
                    <Input placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 justify-end pb-6">
        <Button variant="outline" onClick={() => navigate('/admin/exams')}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Changes
        </Button>
      </div>
    </div>
  );
}
