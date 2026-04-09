import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AvailableExams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [examsRes, attemptsRes] = await Promise.all([
        supabase.from('exams').select('*, questions(id)').eq('is_published', true),
        supabase.from('exam_attempts').select('*').eq('user_id', user.id),
      ]);
      setExams(examsRes.data || []);
      const map: Record<string, any> = {};
      (attemptsRes.data || []).forEach((a) => { map[a.exam_id] = a; });
      setAttempts(map);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const startExam = async (examId: string) => {
    if (!user) return;
    setStarting(examId);
    try {
      const existing = attempts[examId];
      if (existing && !existing.is_submitted) {
        navigate(`/student/exam/${examId}`);
        return;
      }
      if (existing && existing.is_submitted) {
        toast.error('You have already completed this exam.');
        return;
      }
      const { error } = await supabase.from('exam_attempts').insert({
        user_id: user.id,
        exam_id: examId,
      });
      if (error) throw error;
      navigate(`/student/exam/${examId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start exam');
    } finally {
      setStarting(null);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Available Exams</h1>
        <p className="text-muted-foreground">Choose an exam to begin.</p>
      </div>

      {exams.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No exams available right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const attempt = attempts[exam.id];
            const isCompleted = attempt?.is_submitted;
            const isInProgress = attempt && !attempt.is_submitted;
            const questionCount = exam.questions?.length || 0;

            return (
              <Card key={exam.id} className="glass-card hover:shadow-xl transition-shadow">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="font-heading font-semibold text-foreground text-lg">{exam.title}</h3>
                    {exam.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{exam.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" /> {exam.duration_minutes} min
                    </Badge>
                    <Badge variant="secondary">{questionCount} questions</Badge>
                    {exam.negative_marking && <Badge variant="destructive">Negative marking</Badge>}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => startExam(exam.id)}
                    disabled={isCompleted || starting === exam.id}
                    variant={isInProgress ? 'outline' : 'default'}
                  >
                    {starting === exam.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {isCompleted ? 'Completed' : isInProgress ? 'Resume Exam' : 'Start Exam'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
