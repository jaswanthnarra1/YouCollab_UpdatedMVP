import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Calendar, Users, Eye, MoreVertical, XCircle, LayoutTemplate } from 'lucide-react';
import { useGigs } from '../../hooks/useGigs';
import { formatDate } from '../../utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';

export const MyGigs = () => {
  const { useMyGigs, closeGig, isClosing } = useGigs();
  const { data: response, isLoading } = useMyGigs();
  const gigs = response?.data || [];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [gigToClose, setGigToClose] = useState(null);

  const filteredGigs = gigs.filter(gig => 
    gig.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    gig.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCloseConfirm = () => {
    if (gigToClose) {
      closeGig(gigToClose.id, {
        onSuccess: () => setGigToClose(null)
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN': return <Badge variant="success">Open</Badge>;
      case 'CLOSED': return <Badge variant="default">Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">My Collabs</h1>
          <p className="text-dark-muted mt-1">
            Manage your campaign listings and track applications.
          </p>
        </div>
        <Button to="/gigs/create" className="flex items-center gap-2">
          <PlusCircle size={18} />
          Post New Collab
        </Button>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search by title or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} className="text-dark-muted" />}
            />
          </div>
          <div className="text-sm font-semibold text-dark-muted">
            Total listings: {filteredGigs.length}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant="rect" className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredGigs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-dark-border text-xs font-bold uppercase tracking-wider text-dark-muted">
                  <th className="px-4 py-4 w-2/5">Campaign Title</th>
                  <th className="px-4 py-4 w-1/6 text-center">Status</th>
                  <th className="px-4 py-4 w-1/6 text-center">Applications</th>
                  <th className="px-4 py-4 w-1/6">Deadline</th>
                  <th className="px-4 py-4 w-auto text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredGigs.map((gig) => (
                  <tr key={gig.id} className="hover:bg-dark-surface/50 transition-colors group">
                    <td className="px-4 py-4">
                      <Link to={`/gigs/${gig.id}`} className="block">
                        <div className="font-bold text-dark-text group-hover:text-primary-light transition-colors truncate">
                          {gig.title}
                        </div>
                        <div className="text-xs font-medium text-dark-muted mt-1">
                          {gig.category} • Posted {formatDate(gig.createdAt)}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(gig.status)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Link to={`/gigs/${gig.id}/applicants`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-sm font-bold text-dark-text hover:bg-dark-surface transition-colors">
                        <Users size={14} className="text-primary-light" />
                        {gig._count?.applications || 0}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-dark-text flex items-center gap-1.5">
                        <Calendar size={14} className="text-dark-muted" />
                        {formatDate(gig.deadline)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                      <Button 
                        to={`/gigs/${gig.id}/applicants`} 
                        variant="secondary" 
                        size="sm"
                      >
                        Review
                      </Button>
                      {gig.status === 'OPEN' && (
                        <button 
                          onClick={() => setGigToClose(gig)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-dark-border text-dark-muted hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                          title="Close Collab"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12">
            <EmptyState
              icon={<LayoutTemplate size={48} />}
              title="No collabs found"
              description={searchTerm ? "Try a different search term." : "You haven't posted any collabs yet. Create one to start connecting with creators."}
              actionText={!searchTerm ? "Post a Collab" : undefined}
              onAction={!searchTerm ? () => navigate('/gigs/create') : undefined}
            />
          </div>
        )}
      </Card>

      {/* Confirm Close Modal */}
      <Modal
        isOpen={!!gigToClose}
        onClose={() => setGigToClose(null)}
        title="Close Collaboration"
      >
        <div className="space-y-4">
          <p className="text-dark-muted">
            Are you sure you want to close the collab <strong>"{gigToClose?.title}"</strong>? 
            Once closed, no new creators will be able to apply.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-border">
            <Button variant="ghost" onClick={() => setGigToClose(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleCloseConfirm} isLoading={isClosing}>
              Yes, Close Collab
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyGigs;
