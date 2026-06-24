import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export const GigFilters = ({
  search,
  setSearch,
  category,
  setCategory,
  sort,
  setSort,
}) => {
  const categoryOptions = [
    { value: 'Food & Beverage', label: 'Food & Beverage' },
    { value: 'Fitness & Health', label: 'Fitness & Health' },
    { value: 'Lifestyle & Fashion', label: 'Lifestyle & Fashion' },
    { value: 'Travel & Photography', label: 'Travel & Photography' },
    { value: 'Beauty & Cosmetics', label: 'Beauty & Cosmetics' },
    { value: 'Technology & Gaming', label: 'Technology & Gaming' },
    { value: 'Education & Careers', label: 'Education & Careers' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest Collabs First' },
    { value: 'budget_high', label: 'Budget: High to Low' },
    { value: 'budget_low', label: 'Budget: Low to High' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-end bg-dark-surface p-5 rounded-3xl border border-dark-border shadow-sm w-full mb-6">
      
      {/* Search Input Search */}
      <div className="flex-1 w-full text-left">
        <Input
          label="Search collaborations"
          placeholder="Search by keyword, cafe name..."
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category Dropdown Filter */}
      <div className="w-full lg:w-60 text-left">
        <Select
          label="Category"
          placeholder="All categories"
          options={categoryOptions}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      {/* Sort Options */}
      <div className="w-full lg:w-60 text-left">
        <Select
          label="Sort order"
          placeholder=""
          options={sortOptions}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        />
      </div>

    </div>
  );
};

export default GigFilters;
