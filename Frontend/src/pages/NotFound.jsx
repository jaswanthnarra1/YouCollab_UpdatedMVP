import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-dark-bg flex flex-col justify-center items-center p-4 transition-colors duration-200">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="text-9xl font-extrabold bg-gradient-premium bg-clip-text text-transparent animate-pulse">
          404
        </h1>
        <h2 className="text-3xl font-bold text-dark-text">Page Not Found</h2>
        <p className="text-dark-muted text-lg">
          Looks like this page got lost somewhere between Koregaon Park and Hinjewadi.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <Button to="/" variant="outline" size="lg">
            Go Home
          </Button>
          <Button to="/gigs" variant="primary" size="lg">
            Explore Gigs
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
