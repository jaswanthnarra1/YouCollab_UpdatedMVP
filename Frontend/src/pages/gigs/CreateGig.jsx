import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenTool, DollarSign, Calendar, Tag, AlignLeft, CheckSquare } from 'lucide-react';
import { useGigs } from '../../hooks/useGigs';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';

export const CreateGig = () => {
  const { createGig, isCreating } = useGigs();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budgetMin: '',
    budgetMax: '',
    deliverables: '',
    deadline: '',
    category: 'Food & Beverage',
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
    { value: 'Other', label: 'Other' }
  ];

  const validate = () => {
    const newErrors = {};
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.deliverables) newErrors.deliverables = 'Deliverables are required';
    if (!formData.deadline) newErrors.deadline = 'Deadline is required';
    
    if (!formData.budgetMin) {
      newErrors.budgetMin = 'Minimum budget is required';
    } else if (isNaN(formData.budgetMin) || Number(formData.budgetMin) < 0) {
      newErrors.budgetMin = 'Must be a valid positive number';
    }

    if (formData.budgetMax) {
      if (isNaN(formData.budgetMax) || Number(formData.budgetMax) < 0) {
        newErrors.budgetMax = 'Must be a valid positive number';
      } else if (Number(formData.budgetMax) < Number(formData.budgetMin)) {
        newErrors.budgetMax = 'Max budget cannot be less than min budget';
      }
    }
    
    // Check if deadline is in the future
    if (formData.deadline) {
      const selectedDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.deadline = 'Deadline cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Convert string inputs to correct types
    const payload = {
      ...formData,
      budgetMin: parseInt(formData.budgetMin, 10),
      budgetMax: formData.budgetMax ? parseInt(formData.budgetMax, 10) : null,
      city: 'Pune', // MVP hardcoded
    };

    createGig(payload);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-bold dark:text-dark-text">Post a New Collab</h1>
        <p className="text-neutral-500 dark:text-dark-muted mt-1">
          Create a campaign gig to receive pitches from local creators.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Basics */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold border-b border-neutral-100 dark:border-dark-border pb-2 dark:text-dark-text">
              1. Campaign Basics
            </h3>
            
            <Input
              label="Campaign Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              error={errors.title}
              icon={<PenTool size={18} className="text-neutral-400" />}
              placeholder="e.g., Weekend Cafe Reel Promotion"
              required
            />
            
            <Select
              label="Category / Industry"
              name="category"
              value={formData.category}
              onChange={handleChange}
              options={categories}
              icon={<Tag size={18} className="text-neutral-400" />}
            />

            <Textarea
              label="Campaign Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              error={errors.description}
              placeholder="Describe the campaign, your goals, and what you're looking for in a creator..."
              rows={4}
              required
            />
          </div>

          {/* Requirements & Compensation */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold border-b border-neutral-100 dark:border-dark-border pb-2 dark:text-dark-text">
              2. Requirements & Compensation
            </h3>

            <Textarea
              label="Specific Deliverables"
              name="deliverables"
              value={formData.deliverables}
              onChange={handleChange}
              error={errors.deliverables}
              placeholder="e.g., 1x 30s Instagram Reel, 3x Stories with tags, 1x Grid Post..."
              rows={3}
              required
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Budget (Minimum ₹)"
                name="budgetMin"
                type="number"
                value={formData.budgetMin}
                onChange={handleChange}
                error={errors.budgetMin}
                icon={<DollarSign size={18} className="text-neutral-400" />}
                placeholder="e.g., 5000"
                required
              />
              <Input
                label="Budget (Maximum ₹ - Optional)"
                name="budgetMax"
                type="number"
                value={formData.budgetMax}
                onChange={handleChange}
                error={errors.budgetMax}
                icon={<DollarSign size={18} className="text-neutral-400" />}
                placeholder="e.g., 10000"
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold border-b border-neutral-100 dark:border-dark-border pb-2 dark:text-dark-text">
              3. Timeline
            </h3>

            <div className="max-w-md">
              <Input
                label="Application Deadline"
                name="deadline"
                type="date"
                value={formData.deadline}
                onChange={handleChange}
                error={errors.deadline}
                icon={<Calendar size={18} className="text-neutral-400" />}
                required
              />
              <p className="text-xs text-neutral-500 mt-1.5 ml-1">
                The listing will automatically close for new applications after this date.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-100 dark:border-dark-border flex gap-4 justify-end">
            <Button type="button" variant="ghost" onClick={() => navigate('/dashboard/brand')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Post Collab Gig
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateGig;
