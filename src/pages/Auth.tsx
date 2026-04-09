import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Shield, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'admin' | 'student';

export default function Auth() {
  const { user, role, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('student');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && role) {
    return <Navigate to={role === 'admin' ? '/admin' : '/student'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        const { error } = await signUp(email, password, fullName, selectedRole);
        if (error) throw error;
        toast.success('Account created! Check your email to confirm.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent opacity-90" />
        <div className="relative z-10 text-primary-foreground max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <BookOpen className="h-16 w-16 mb-8" />
            <h1 className="text-4xl font-heading font-bold mb-4">ExamFlow</h1>
            <p className="text-lg opacity-90">
              A modern platform for creating, taking, and evaluating online examinations. 
              Built for educators and students.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-primary-foreground"
          />
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-primary mb-2" />
            <h1 className="text-2xl font-heading font-bold text-foreground">ExamFlow</h1>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">
                {isLogin ? 'Welcome back' : 'Create account'}
              </CardTitle>
              <CardDescription>
                {isLogin ? 'Sign in to your account' : 'Register to get started'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      key="signup-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          required={!isLogin}
                        />
                      </div>
                      <div>
                        <Label>I am a...</Label>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRole('student')}
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                              selectedRole === 'student'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/40'
                            }`}
                          >
                            <GraduationCap className="h-5 w-5" />
                            <span className="font-medium text-sm">Student</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRole('admin')}
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                              selectedRole === 'admin'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/40'
                            }`}
                          >
                            <Shield className="h-5 w-5" />
                            <span className="font-medium text-sm">Teacher</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary font-medium hover:underline"
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
