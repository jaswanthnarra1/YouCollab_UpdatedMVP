import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, UserPlus, Shield, Check, X } from 'lucide-react';
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

  // Real-time validations
  const password = formData.password;
  const checks = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@#$%&*]/.test(password),
  };
  const isPasswordValid = Object.values(checks).every(Boolean);
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
  
  // Basic email structure check
  const isEmailValid = formData.email && formData.email.includes('@') && formData.email.includes('.');
  const isFormValid = isEmailValid && isPasswordValid && passwordsMatch;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;

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
    <div className="min-h-screen bg-dark-bg flex flex-col justify-center items-center p-4 transition-colors duration-200">
      {/* Glow Backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-block mb-4">
            <Logo className="h-16 w-auto mx-auto drop-shadow-md" />
          </Link>
          <h2 className="text-2xl font-bold text-dark-text animate-fade-in">Create an account</h2>
          <p className="text-sm text-dark-muted mt-1">
            Join Pune's premier creator-brand hub
          </p>
        </div>

        <Card className="p-8 border border-dark-border shadow-xl">
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
              icon={<Shield size={18} className="text-dark-muted" />}
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="Enter your business email address"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={<Mail size={18} className="text-dark-muted" />}
              required
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                icon={<Lock size={18} className="text-dark-muted" />}
                required
              />

              {/* Password Requirements Section */}
              {formData.password && (
                <div className="mt-2.5 p-3.5 rounded-2xl bg-[#050505] border border-dark-border/60 space-y-2 text-left select-none animate-fade-in">
                  <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">
                    Password Requirements
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      {checks.length ? (
                        <>
                          <Check size={12} className="text-emerald-400 shrink-0 mt-0.5 animate-fade-in" />
                          <span className="text-emerald-400 font-medium">Minimum 6 characters</span>
                        </>
                      ) : (
                        <>
                          <X size={12} className="text-rose-500 shrink-0 mt-0.5" />
                          <span className="text-rose-400/80">Minimum 6 characters</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      {checks.uppercase ? (
                        <>
                          <Check size={12} className="text-emerald-400 shrink-0 mt-0.5 animate-fade-in" />
                          <span className="text-emerald-400 font-medium">At least one uppercase letter (A-Z)</span>
                        </>
                      ) : (
                        <>
                          <X size={12} className="text-rose-500 shrink-0 mt-0.5" />
                          <span className="text-rose-400/80">At least one uppercase letter (A-Z)</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      {checks.lowercase ? (
                        <>
                          <Check size={12} className="text-emerald-400 shrink-0 mt-0.5 animate-fade-in" />
                          <span className="text-emerald-400 font-medium">At least one lowercase letter (a-z)</span>
                        </>
                      ) : (
                        <>
                          <X size={12} className="text-rose-500 shrink-0 mt-0.5" />
                          <span className="text-rose-400/80">At least one lowercase letter (a-z)</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      {checks.number ? (
                        <>
                          <Check size={12} className="text-emerald-400 shrink-0 mt-0.5 animate-fade-in" />
                          <span className="text-emerald-400 font-medium">At least one number (0-9)</span>
                        </>
                      ) : (
                        <>
                          <X size={12} className="text-rose-500 shrink-0 mt-0.5" />
                          <span className="text-rose-400/80">At least one number (0-9)</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-start gap-2 sm:col-span-2">
                      {checks.special ? (
                        <>
                          <Check size={12} className="text-emerald-400 shrink-0 mt-0.5 animate-fade-in" />
                          <span className="text-emerald-400 font-medium">At least one special character (@, #, $, %, &, *)</span>
                        </>
                      ) : (
                        <>
                          <X size={12} className="text-rose-500 shrink-0 mt-0.5" />
                          <span className="text-rose-400/80">At least one special character (@, #, $, %, &, *)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                icon={<Lock size={18} className="text-dark-muted" />}
                required
              />
              {formData.confirmPassword && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs select-none">
                  {passwordsMatch ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X size={12} className="text-rose-400" />
                      <span className="text-rose-400 font-medium">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              isLoading={isRegistering}
              disabled={!isFormValid}
            >
              Sign Up
              <UserPlus size={18} />
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-dark-muted">
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
