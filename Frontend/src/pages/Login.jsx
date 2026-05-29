import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { Logo } from '../components/ui/Logo';

export const Login = () => {
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    login({ email, password });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col justify-center items-center p-4 transition-colors duration-200">
      {/* Glow Backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-block mb-4">
            <Logo className="h-16 w-auto mx-auto drop-shadow-md" />
          </Link>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-dark-text">Welcome back</h2>
          <p className="text-sm text-neutral-500 dark:text-dark-muted mt-1">
            Pune's localized collaboration marketplace
          </p>
        </div>

        <Card className="p-8 border border-neutral-200/60 dark:border-dark-border shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <Input
              label="Business or Personal Email"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              error={errors.email}
              icon={<Mail size={18} className="text-neutral-400" />}
              required
            />

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-neutral-500 dark:text-dark-muted uppercase tracking-wider">
                  Password
                </label>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                error={errors.password}
                icon={<Lock size={18} className="text-neutral-400" />}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              loading={isLoggingIn}
            >
              Sign In
              <LogIn size={18} />
            </Button>
          </form>


        </Card>

        <p className="text-center text-sm text-neutral-500 dark:text-dark-muted">
          New to Pune's aesthetic community?{' '}
          <Link to="/signup" className="font-semibold text-primary hover:underline transition-all">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
