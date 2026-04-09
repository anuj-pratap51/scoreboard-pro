import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Minus, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResultDetail() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !attemptId) return;
    const fetch = async () => {
      const { data: att } = await supabase.from('exam_attempts').select('*, exams(*)').eq('id', attemptId).single();
      if (!att) return;
      setAttempt(att);

      const [qRes, aRes] = await Promise.all([
        supabase.from('questions').select('*').eq('exam_id', att.exam_id).order('sort_order'),
        supabase.from('student_answers').select('*').eq('attempt_id', attemptId),
      ]);
      setQuestions(qRes.data || []);
      const map: Record<string, any> = {};
      (aRes.data || []).forEach((a) => { map[a.question_id] = a; });
      setAnswers(map);
      setLoading(false);
    };
    fetch();
  }, [user, attemptId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!attempt) return <p className="text-muted-foreground text-center py-12">Result not found.</p>;

  const pct = attempt.total_marks ? Math.round((attempt.score / attempt.total_marks) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/student/results">
        <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Results</Button>
      </Link>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading">{(attempt.exams as any)?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-secondary rounded-lg">
              <p className="text-2xl font-heading font-bold text-foreground">{attempt.score}/{attempt.total_marks}</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <div className="text-center p-3 bg-secondary rounded-lg">
              <p className="text-2xl font-heading font-bold text-foreground">{pct}%</p>
              <p className="text-xs text-muted-foreground">Percentage</p>
            </div>
            <div className="text-center p-3 bg-secondary rounded-lg">
              <p className="text-2xl font-heading font-bold text-success">{attempt.correct_count}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="text-center p-3 bg-secondary rounded-lg">
              <p className="text-2xl font-heading font-bold text-destructive">{attempt.incorrect_count}</p>
              <p className="text-xs text-muted-foreground">Wrong</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-lg font-heading font-semibold text-foreground">Question Review</h2>

      <div className="space-y-4">
        {questions.map((q, i) => {
          const ans = answers[q.id];
          const selected = ans?.selected_answer;
          const isCorrect = ans?.is_correct;
          const isUnanswered = selected === null || selected === undefined;

          return (
            <Card key={q.id} className="glass-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  {isUnanswered ? (
                    <Minus className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  ) : isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  )}
                  <p className="text-foreground font-medium">
                    <span className="text-muted-foreground mr-2">Q{i + 1}.</span>
                    {q.question_text}
                  </p>
                </div>

                <div className="space-y-2 pl-8">
                  {(q.options as string[]).map((opt: string, oi: number) => (
                    <div
                      key={oi}
                      className={cn(
                        'p-3 rounded-lg border text-sm flex items-center gap-2',
                        oi === q.correct_answer && 'bg-success/10 border-success/30 text-foreground',
                        oi === selected && oi !== q.correct_answer && 'bg-destructive/10 border-destructive/30 text-foreground',
                        oi !== q.correct_answer && oi !== selected && 'border-border text-muted-foreground'
                      )}
                    >
                      <span className="font-mono text-xs">{String.fromCharCode(65 + oi)}</span>
                      <span>{opt}</span>
                      {oi === q.correct_answer && <Badge className="ml-auto bg-success text-success-foreground text-xs">Correct</Badge>}
                      {oi === selected && oi !== q.correct_answer && <Badge variant="destructive" className="ml-auto text-xs">Your answer</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
