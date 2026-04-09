import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Clock, ChevronLeft, ChevronRight, AlertTriangle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  marks: number;
  sort_order: number;
}

export default function TakeExam() {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);
  const tabSwitchCount = useRef(0);

  // Fetch exam data
  useEffect(() => {
    if (!user || !examId) return;
    const fetchAll = async () => {
      const [examRes, questionsRes, attemptRes] = await Promise.all([
        supabase.from('exams').select('*').eq('id', examId).single(),
        supabase.from('questions').select('*').eq('exam_id', examId).order('sort_order'),
        supabase.from('exam_attempts').select('*').eq('user_id', user.id).eq('exam_id', examId).single(),
      ]);

      if (!examRes.data || !attemptRes.data) {
        toast.error('Exam not found');
        navigate('/student/exams');
        return;
      }

      if (attemptRes.data.is_submitted) {
        navigate(`/student/results/${attemptRes.data.id}`);
        return;
      }

      let qs = (questionsRes.data || []) as Question[];
      if (examRes.data.randomize_questions) {
        qs = qs.sort(() => Math.random() - 0.5);
      }

      setExam(examRes.data);
      setQuestions(qs);
      setAttempt(attemptRes.data);

      // Load saved answers
      const { data: savedAnswers } = await supabase
        .from('student_answers')
        .select('*')
        .eq('attempt_id', attemptRes.data.id);
      
      const ansMap: Record<string, number | null> = {};
      (savedAnswers || []).forEach((sa) => {
        ansMap[sa.question_id] = sa.selected_answer;
      });
      setAnswers(ansMap);

      // Calculate remaining time
      const startedAt = new Date(attemptRes.data.started_at).getTime();
      const duration = examRes.data.duration_minutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((startedAt + duration - Date.now()) / 1000));
      setTimeLeft(remaining);
      setLoading(false);
    };
    fetchAll();
  }, [user, examId]);

  // Timer
  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !loading && attempt && !attempt.is_submitted) {
        tabSwitchCount.current++;
        setTabWarning(true);
        supabase.from('exam_attempts')
          .update({ tab_switches: tabSwitchCount.current })
          .eq('id', attempt.id);
        toast.warning(`Tab switch detected! (${tabSwitchCount.current})`);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loading, attempt]);

  const saveAnswer = useCallback(async (questionId: string, answer: number | null) => {
    if (!attempt) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    
    const question = questions.find(q => q.id === questionId);
    const isCorrect = answer !== null ? answer === question?.correct_answer : null;

    await supabase.from('student_answers').upsert({
      attempt_id: attempt.id,
      question_id: questionId,
      selected_answer: answer,
      is_correct: isCorrect,
    }, { onConflict: 'attempt_id,question_id' });
  }, [attempt, questions]);

  const handleSubmit = async (autoSubmit = false) => {
    if (submitting || !attempt || !exam) return;
    setSubmitting(true);
    setShowSubmitDialog(false);

    try {
      let correctCount = 0;
      let incorrectCount = 0;
      let unanswered = 0;
      let score = 0;
      const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

      questions.forEach((q) => {
        const ans = answers[q.id];
        if (ans === null || ans === undefined) {
          unanswered++;
        } else if (ans === q.correct_answer) {
          correctCount++;
          score += q.marks;
        } else {
          incorrectCount++;
          if (exam.negative_marking) {
            score -= exam.negative_mark_value * q.marks;
          }
        }
      });

      score = Math.max(0, score);

      await supabase.from('exam_attempts').update({
        is_submitted: true,
        submitted_at: new Date().toISOString(),
        score,
        total_marks: totalMarks,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unanswered_count: unanswered,
      }).eq('id', attempt.id);

      toast.success(autoSubmit ? 'Time is up! Exam auto-submitted.' : 'Exam submitted successfully!');
      navigate(`/student/results/${attempt.id}`);
    } catch (err: any) {
      toast.error('Failed to submit exam');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const currentQ = questions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLowTime = timeLeft < 60;
  const answeredCount = Object.values(answers).filter((a) => a !== null && a !== undefined).length;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground">{exam?.title}</h1>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length} • {answeredCount} answered
          </p>
        </div>
        <Badge
          variant={isLowTime ? 'destructive' : 'secondary'}
          className={cn('text-base px-4 py-2 gap-2 font-mono', isLowTime && 'animate-pulse-slow')}
        >
          <Clock className="h-4 w-4" />
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </Badge>
      </div>

      {/* Tab switch warning */}
      {tabWarning && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Tab switch detected! Your activity is being monitored. Switches: {tabSwitchCount.current}</span>
          <button className="ml-auto text-xs underline" onClick={() => setTabWarning(false)}>Dismiss</button>
        </div>
      )}

      {/* Question */}
      {currentQ && (
        <Card className="glass-card">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <p className="text-foreground font-medium text-lg leading-relaxed">{currentQ.question_text}</p>
              <Badge variant="outline" className="ml-3 shrink-0">{currentQ.marks} mark{currentQ.marks > 1 ? 's' : ''}</Badge>
            </div>

            <div className="space-y-3">
              {(currentQ.options as string[]).map((option, i) => (
                <button
                  key={i}
                  onClick={() => saveAnswer(currentQ.id, answers[currentQ.id] === i ? null : i)}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border-2 transition-all flex items-center gap-3',
                    answers[currentQ.id] === i
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border hover:border-primary/40 text-foreground'
                  )}
                >
                  <span className={cn(
                    'h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0',
                    answers[currentQ.id] === i
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground text-muted-foreground'
                  )}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex(currentIndex - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>

        <div className="flex gap-1.5 overflow-x-auto max-w-xs px-2">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'h-8 w-8 rounded-md text-xs font-medium transition-all shrink-0',
                i === currentIndex && 'ring-2 ring-primary',
                answers[q.id] !== null && answers[q.id] !== undefined
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {currentIndex < questions.length - 1 ? (
          <Button onClick={() => setCurrentIndex(currentIndex + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => setShowSubmitDialog(true)} className="bg-success hover:bg-success/90 text-success-foreground">
            <Send className="h-4 w-4 mr-1" /> Submit
          </Button>
        )}
      </div>

      {/* Submit confirmation */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Submit Exam?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            You have answered {answeredCount} out of {questions.length} questions.
            {answeredCount < questions.length && ` ${questions.length - answeredCount} question(s) unanswered.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Go Back</Button>
            <Button onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
