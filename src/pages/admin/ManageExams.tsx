import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageExams() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExams = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('exams')
      .select('*, questions(id)')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    setExams(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExams(); }, [user]);

  const togglePublish = async (exam: any) => {
    await supabase.from('exams').update({ is_published: !exam.is_published }).eq('id', exam.id);
    toast.success(exam.is_published ? 'Exam unpublished' : 'Exam published');
    fetchExams();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from('exams').delete().eq('id', deleteId);
    toast.success('Exam deleted');
    setDeleteId(null);
    setDeleting(false);
    fetchExams();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-foreground">Manage Exams</h1>
        <Link to="/admin/create-exam">
          <Button><PlusCircle className="h-4 w-4 mr-2" /> New Exam</Button>
        </Link>
      </div>

      {exams.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            No exams created yet. Create your first exam!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="glass-card">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-semibold text-foreground">{exam.title}</p>
                    <Badge variant={exam.is_published ? 'default' : 'secondary'}>
                      {exam.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {exam.questions?.length || 0} questions • {exam.duration_minutes} min
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => togglePublish(exam)} title={exam.is_published ? 'Unpublish' : 'Publish'}>
                    {exam.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Link to={`/admin/exams/${exam.id}`}>
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(exam.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Delete Exam?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">This will permanently delete the exam and all associated data.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
