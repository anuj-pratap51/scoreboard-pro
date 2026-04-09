import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Award } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminResults() {
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('exams').select('id, title').then(({ data }) => {
      setExams(data || []);
    });
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      let query = supabase
        .from('exam_attempts')
        .select('*, exams(title), profiles!exam_attempts_user_id_fkey(full_name, email)')
        .eq('is_submitted', true)
        .order('submitted_at', { ascending: false });

      if (selectedExam !== 'all') {
        query = query.eq('exam_id', selectedExam);
      }

      const { data } = await query;
      setResults(data || []);
      setLoading(false);
    };
    fetchResults();
  }, [selectedExam]);

  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.total_marks ? ((r.score || 0) / r.total_marks) * 100 : 0), 0) / results.length)
    : 0;
  const topPerformer = results.length > 0
    ? results.reduce((top, r) => {
        const pct = r.total_marks ? ((r.score || 0) / r.total_marks) * 100 : 0;
        const topPct = top.total_marks ? ((top.score || 0) / top.total_marks) * 100 : 0;
        return pct > topPct ? r : top;
      }, results[0])
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-heading font-bold text-foreground">Student Results</h1>
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Filter by exam" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Analytics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-secondary text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{results.length}</p>
              <p className="text-sm text-muted-foreground">Total Attempts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-secondary text-warning">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{avgScore}%</p>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-secondary text-accent">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground truncate">
                {topPerformer ? ((topPerformer.profiles as any)?.full_name || (topPerformer.profiles as any)?.email || 'N/A') : 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">Top Performer</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : results.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">No results yet.</CardContent></Card>
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-3 font-heading font-semibold text-foreground">Student</th>
                  <th className="text-left p-3 font-heading font-semibold text-foreground">Exam</th>
                  <th className="text-left p-3 font-heading font-semibold text-foreground">Score</th>
                  <th className="text-left p-3 font-heading font-semibold text-foreground">%</th>
                  <th className="text-left p-3 font-heading font-semibold text-foreground">Date</th>
                  <th className="text-left p-3 font-heading font-semibold text-foreground">Tab Switches</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const pct = r.total_marks ? Math.round((r.score / r.total_marks) * 100) : 0;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="p-3 text-foreground">{(r.profiles as any)?.full_name || (r.profiles as any)?.email || 'Unknown'}</td>
                      <td className="p-3 text-foreground">{(r.exams as any)?.title}</td>
                      <td className="p-3 text-foreground">{r.score}/{r.total_marks}</td>
                      <td className="p-3">
                        <Badge variant={pct >= 60 ? 'default' : 'destructive'}>{pct}%</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        {r.tab_switches > 0 ? (
                          <Badge variant="destructive">{r.tab_switches}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
