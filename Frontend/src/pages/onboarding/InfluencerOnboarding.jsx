import React, { useState } from 'react';
import { User, Instagram, AlignLeft, Camera, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';

export const InfluencerOnboarding = () => {
  const { onboardInfluencer, isOnboardingInfluencer } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    instagramHandle: '',
    niche: 'Fashion',
    bio: '',
    profileImageUrl: '',
    followerCount: ''
  });
  const [errors, setErrors] = useState({});

  const niches = [
    { value: 'Fashion', label: 'Fashion' },
    { value: 'Food', label: 'Food' },
    { value: 'Travel', label: 'Travel' },
    { value: 'Tech', label: 'Tech' },
    { value: 'Fitness', label: 'Fitness' },
    { value: 'Beauty', label: 'Beauty' },
    { value: 'Lifestyle', label: 'Lifestyle' },
    { value: 'Photography', label: 'Photography' },
    { value: 'Art', label: 'Art' },
    { value: 'Other', label: 'Other' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.instagramHandle) newErrors.instagramHandle = 'Instagram handle is required';
    if (!formData.niche) newErrors.niche = 'Niche is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      ...formData,
      followerCount: formData.followerCount ? parseInt(formData.followerCount, 10) : 0
    };

    onboardInfluencer(payload);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden">
      {/* Glow Backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-2xl space-y-8 animate-fade-in z-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-dark-text tracking-tight">Set Up Your Creator Profile</h1>
          <p className="text-dark-muted text-sm">
            Showcase your aesthetic to Pune's top brands
          </p>
        </div>

        <Card className="p-6 sm:p-8 border border-dark-border shadow-2xl backdrop-blur-md bg-dark-card/90">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                icon={<User size={18} className="text-dark-muted" />}
                required
              />
              <Input
                label="Instagram Handle"
                name="instagramHandle"
                value={formData.instagramHandle}
                onChange={handleChange}
                error={errors.instagramHandle}
                icon={<Instagram size={18} className="text-dark-muted" />}
                placeholder="@username"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Primary Niche"
                name="niche"
                value={formData.niche}
                onChange={handleChange}
                options={niches}
              />
              <Input
                label="Follower Count (approx)"
                name="followerCount"
                type="number"
                value={formData.followerCount}
                onChange={handleChange}
                icon={<Users size={18} className="text-dark-muted" />}
                placeholder="e.g. 5000"
              />
            </div>

            <Input
              label="Profile Image URL"
              name="profileImageUrl"
              value={formData.profileImageUrl}
              onChange={handleChange}
              icon={<Camera size={18} className="text-dark-muted" />}
              placeholder="Link to your best photo"
            />

            <Textarea
              label="Creator Bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="What makes your content unique? What kind of collabs are you looking for?"
              rows={4}
            />

            <div className="pt-4 border-t border-dark-border">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                isLoading={isOnboardingInfluencer}
              >
                Complete Setup & Browse Gigs
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default InfluencerOnboarding;
