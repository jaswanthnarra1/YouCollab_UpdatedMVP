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
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col justify-center items-center py-12 px-4">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold dark:text-dark-text">Complete Your Brand Profile</h1>
          <p className="text-neutral-500 dark:text-dark-muted">
            Tell Pune creators about your business
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Business Name"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                error={errors.businessName}
                icon={<Building size={18} className="text-neutral-400" />}
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
                icon={<MapPin size={18} className="text-neutral-400" />}
                placeholder="e.g., Koregaon Park, Pune"
              />
              <Input
                label="Website URL"
                name="website"
                value={formData.website}
                onChange={handleChange}
                icon={<LinkIcon size={18} className="text-neutral-400" />}
                placeholder="https://"
              />
            </div>

            <Input
              label="Logo URL"
              name="logoUrl"
              value={formData.logoUrl}
              onChange={handleChange}
              icon={<Camera size={18} className="text-neutral-400" />}
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

            <div className="pt-4 border-t border-neutral-100 dark:border-dark-border">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
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
