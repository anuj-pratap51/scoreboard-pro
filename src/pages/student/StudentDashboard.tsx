import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Trophy, Clock, ArrowRight } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ available: 0, completed: 0, avgScore: 0 });
  const [recentResults, setRecentResults] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [examsRes, attemptsRes] = await Promise.all([
        supabase.from('exams').select('id').eq('is_published', true),
        supabase.from('exam_attempts').select('*, exams(title)').eq('user_id', user.id).eq('is_submitted', true).order('submitted_at', { ascending: false }).limit(5),
      ]);

      const completedAttempts = attemptsRes.data || [];
      const avgScore = completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + (a.total_marks ? ((a.score || 0) / a.total_marks) * 100 : 0), 0) / completedAttempts.length
        : 0;

      setStats({
        available: examsRes.data?.length || 0,
        completed: completedAttempts.length,
        avgScore: Math.round(avgScore),
      });
      setRecentResults(completedAttempts);
    };
    fetchData();
  }, [user]);

  const statCards = [
    { label: 'Available Exams', value: stats.available, icon: FileText, color: 'text-primary' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-success' },
    { label: 'Avg Score', value: `${stats.avgScore}%`, icon: Trophy, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Welcome back!</h1>
        <p className="text-muted-foreground">Here's your exam overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-card">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold text-foreground">Recent Results</h2>
        <Link to="/student/results">
          <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4 ml-1" /></Button>
        </Link>
      </div>

      {recentResults.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No exams completed yet.</p>
            <Link to="/student/exams">
              <Button className="mt-4">Browse Exams</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recentResults.map((result) => (
            <Card key={result.id} className="glass-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{(result.exams as any)?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Score: {result.score}/{result.total_marks} • {new Date(result.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <Link to={`/student/results/${result.id}`}>
                  <Button variant="outline" size="sm">View Details</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
