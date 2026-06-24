import React, { useState } from 'react';
import { Building, MapPin, AlignLeft, Link as LinkIcon, Camera } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';

export const BrandOnboarding = () => {
  const { onboardBrand, isOnboardingBrand } = useAuth();
  const [formData, setFormData] = useState({
    businessName: '',
    category: 'Food & Beverage',
    location: 'Pune',
    bio: '',
    logoUrl: '',
    website: ''
  });
  const [errors, setErrors] = useState({});

  const categories = [
    { value: 'Food & Beverage', label: 'Food & Beverage' },
    { value: 'Fashion', label: 'Fashion' },
    { value: 'Fitness', label: 'Fitness' },
    { value: 'Tech', label: 'Tech' },
    { value: 'Beauty', label: 'Beauty' },
    { value: 'Lifestyle', label: 'Lifestyle' },
    { value: 'Travel', label: 'Travel' },
    { value: 'Education', label: 'Education' },
    { value: 'Other', label: 'Other' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.businessName) newErrors.businessName = 'Business name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onboardBrand(formData);
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
          <h1 className="text-3xl font-bold text-dark-text tracking-tight">Complete Your Brand Profile</h1>
          <p className="text-dark-muted text-sm">
            Tell Pune creators about your business
          </p>
        </div>

        <Card className="p-6 sm:p-8 border border-dark-border shadow-2xl backdrop-blur-md bg-dark-card/90">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Business Name"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                error={errors.businessName}
                icon={<Building size={18} className="text-dark-muted" />}
                required
              />
              <Select
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                options={categories}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                icon={<MapPin size={18} className="text-dark-muted" />}
                placeholder="e.g., Koregaon Park, Pune"
              />
              <Input
                label="Website URL"
                name="website"
                value={formData.website}
                onChange={handleChange}
                icon={<LinkIcon size={18} className="text-dark-muted" />}
                placeholder="https://"
              />
            </div>

            <Input
              label="Logo URL"
              name="logoUrl"
              value={formData.logoUrl}
              onChange={handleChange}
              icon={<Camera size={18} className="text-dark-muted" />}
              placeholder="Link to your logo image"
            />

            <Textarea
              label="Brand Bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell creators about your brand story, aesthetics, and what you stand for..."
              rows={4}
            />

            <div className="pt-4 border-t border-dark-border">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                isLoading={isOnboardingBrand}
              >
                Complete Setup & Go to Dashboard
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default BrandOnboarding;
