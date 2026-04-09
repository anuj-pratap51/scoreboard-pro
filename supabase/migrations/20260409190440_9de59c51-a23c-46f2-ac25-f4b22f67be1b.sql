-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  negative_marking BOOLEAN NOT NULL DEFAULT false,
  negative_mark_value NUMERIC(3,2) NOT NULL DEFAULT 0.25,
  randomize_questions BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer INTEGER NOT NULL,
  marks INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exam_attempts table
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  score NUMERIC(6,2),
  total_marks INTEGER,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  unanswered_count INTEGER DEFAULT 0,
  is_submitted BOOLEAN NOT NULL DEFAULT false,
  tab_switches INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, exam_id)
);

-- Create student_answers table
CREATE TABLE public.student_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer INTEGER,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role on signup" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Exams policies
CREATE POLICY "Anyone authenticated can view published exams" ON public.exams FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Admins can view all exams" ON public.exams FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create exams" ON public.exams FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update own exams" ON public.exams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Admins can delete own exams" ON public.exams FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

-- Questions policies
CREATE POLICY "Students can view questions of published exams" ON public.questions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND is_published = true));
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Exam attempts policies
CREATE POLICY "Students can view own attempts" ON public.exam_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students can create attempts" ON public.exam_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can update own attempts" ON public.exam_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all attempts" ON public.exam_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Student answers policies
CREATE POLICY "Students can view own answers" ON public.student_answers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND user_id = auth.uid()));
CREATE POLICY "Students can insert answers" ON public.student_answers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND user_id = auth.uid()));
CREATE POLICY "Students can update answers" ON public.student_answers FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND user_id = auth.uid()));
CREATE POLICY "Admins can view all answers" ON public.student_answers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'));
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_questions_exam_id ON public.questions(exam_id);
CREATE INDEX idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX idx_student_answers_attempt_id ON public.student_answers(attempt_id);
