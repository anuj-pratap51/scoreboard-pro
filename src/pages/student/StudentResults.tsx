import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText } from 'lucide-react';

export default function StudentResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('exam_attempts')
      .select('*, exams(title, duration_minutes)')
      .eq('user_id', user.id)
      .eq('is_submitted', true)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        setResults(data || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground">My Results</h1>

      {results.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No results yet. Take an exam first!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((r) => {
            const pct = r.total_marks ? Math.round((r.score / r.total_marks) * 100) : 0;
            return (
              <Card key={r.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-heading font-semibold text-foreground">{(r.exams as any)?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(r.submitted_at).toLocaleDateString()} • {r.correct_count} correct, {r.incorrect_count} wrong, {r.unanswered_count} unanswered
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={pct >= 60 ? 'default' : 'destructive'} className="text-base px-3 py-1">
                      {r.score}/{r.total_marks} ({pct}%)
                    </Badge>
                    <Link to={`/student/results/${r.id}`}>
                      <Button variant="outline" size="sm">Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
