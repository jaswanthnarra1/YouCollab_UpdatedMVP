import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, UserPlus, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import { Logo } from '../components/ui/Logo';

export const Signup = () => {
  const { register, isRegistering } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'BRAND',
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Must be at least 6 characters';
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    register({ 
      email: formData.email, 
      password: formData.password, 
      role: formData.role 
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
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
          <h2 className="text-2xl font-bold dark:text-dark-text">Create an account</h2>
          <p className="text-sm text-neutral-500 dark:text-dark-muted mt-1">
            Join Pune's premier creator-brand hub
          </p>
        </div>

        <Card className="p-8 border border-neutral-200/60 dark:border-dark-border shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <Select
              label="I want to join as a"
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={[
                { value: 'BRAND', label: 'Brand (Looking for creators)' },
                { value: 'INFLUENCER', label: 'Creator (Looking for gigs)' }
              ]}
              icon={<Shield size={18} className="text-neutral-400" />}
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="you@domain.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={<Mail size={18} className="text-neutral-400" />}
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon={<Lock size={18} className="text-neutral-400" />}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              icon={<Lock size={18} className="text-neutral-400" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              isLoading={isRegistering}
            >
              Sign Up
              <UserPlus size={18} />
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-neutral-500 dark:text-dark-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline transition-all">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
