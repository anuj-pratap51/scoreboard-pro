import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, BarChart3, PlusCircle, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ exams: 0, students: 0, avgScore: 0 });
  const [recentExams, setRecentExams] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [examsRes, attemptsRes, recentRes] = await Promise.all([
        supabase.from('exams').select('id').eq('created_by', user.id),
        supabase.from('exam_attempts').select('score, total_marks').eq('is_submitted', true),
        supabase.from('exams').select('*, questions(id)').eq('created_by', user.id).order('created_at', { ascending: false }).limit(5),
      ]);

      const attempts = attemptsRes.data || [];
      const avg = attempts.length > 0
        ? attempts.reduce((s, a) => s + (a.total_marks ? ((a.score || 0) / a.total_marks) * 100 : 0), 0) / attempts.length
        : 0;

      setStats({
        exams: examsRes.data?.length || 0,
        students: attempts.length,
        avgScore: Math.round(avg),
      });
      setRecentExams(recentRes.data || []);
    };
    fetchData();
  }, [user]);

  const statCards = [
    { label: 'Total Exams', value: stats.exams, icon: FileText, color: 'text-primary' },
    { label: 'Total Attempts', value: stats.students, icon: Users, color: 'text-accent' },
    { label: 'Avg Score', value: `${stats.avgScore}%`, icon: BarChart3, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your exams and view analytics.</p>
        </div>
        <Link to="/admin/create-exam">
          <Button><PlusCircle className="h-4 w-4 mr-2" /> Create Exam</Button>
        </Link>
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
        <h2 className="text-lg font-heading font-semibold text-foreground">Recent Exams</h2>
        <Link to="/admin/exams">
          <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4 ml-1" /></Button>
        </Link>
      </div>

      <div className="space-y-3">
        {recentExams.map((exam) => (
          <Card key={exam.id} className="glass-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{exam.title}</p>
                <p className="text-sm text-muted-foreground">
                  {exam.questions?.length || 0} questions • {exam.duration_minutes} min • {exam.is_published ? 'Published' : 'Draft'}
                </p>
              </div>
              <Link to={`/admin/exams/${exam.id}`}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
