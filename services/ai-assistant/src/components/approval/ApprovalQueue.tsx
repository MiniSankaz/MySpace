/**
 * Approval Queue Component
 * Main interface for managing approval requests
 */

import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Bell,
  Settings
} from 'lucide-react';
import ApprovalRequestCard from './ApprovalRequestCard';

interface ApprovalQueueProps {
  userId: string;
  userRole: string;
  className?: string;
}

interface ApprovalRequest {
  id: string;
  type: string;
  level: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'bypassed';
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;
  operation: {
    action: string;
    resource: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  progress: {
    currentApprovals: number;
    requiredApprovals: number;
  };
  timeRemaining: {
    ms: number;
    formatted: string;
    isUrgent: boolean;
  };
  canApprove?: boolean;
  canBypass?: boolean;
}

interface QueueSummary {
  totalPending: number;
  urgentCount: number;
  myPendingCount: number;
}

const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  userId,
  userRole,
  className = ''
}) => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [summary, setSummary] = useState<QueueSummary>({
    totalPending: 0,
    urgentCount: 0,
    myPendingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [showAssignedToMe, setShowAssignedToMe] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        sortBy: 'requestedAt',
        sortOrder: 'desc'
      });

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }
      if (selectedLevel !== 'all') {
        params.append('level', selectedLevel);
      }
      if (showMyRequests) {
        params.append('requestedByMe', 'true');
      }
      if (showAssignedToMe) {
        params.append('assignedToMe', 'true');
      }

      const response = await fetch(`/api/v1/ai/approval/requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch requests: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data.requests);
        setTotalItems(data.data.pagination.total);
        setSummary(data.data.summary);
        setLastRefresh(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch requests');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching approval requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle approval
  const handleApprove = async (requestId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/v1/ai/approval/requests/${requestId}/decision`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decision: 'approve',
          reason
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to approve request: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Refresh the list
        await fetchRequests();
        
        // Show success notification
        showNotification('Request approved successfully', 'success');
      } else {
        throw new Error(data.error || 'Failed to approve request');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Handle rejection
  const handleReject = async (requestId: string, reason: string) => {
    try {
      const response = await fetch(`/api/v1/ai/approval/requests/${requestId}/decision`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decision: 'reject',
          reason
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to reject request: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchRequests();
        showNotification('Request rejected successfully', 'success');
      } else {
        throw new Error(data.error || 'Failed to reject request');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Handle bypass
  const handleBypass = async (requestId: string, reason: string) => {
    try {
      const response = await fetch(`/api/v1/ai/approval/requests/${requestId}/bypass`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason,
          emergencyContext: {
            userRole,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to bypass request: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchRequests();
        showNotification('Emergency bypass applied - audit trail created', 'warning');
      } else {
        throw new Error(data.error || 'Failed to bypass request');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // View details
  const handleViewDetails = (requestId: string) => {
    // Navigate to details page or open modal
    window.open(`/approvals/${requestId}`, '_blank');
  };

  // Simple notification system
  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    // This would integrate with your notification system
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Simple browser notification for now
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Approval System', {
        body: message,
        icon: '/favicon.ico'
      });
    }
  };

  // Filter requests based on search
  const filteredRequests = requests.filter(request => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.title.toLowerCase().includes(query) ||
        request.description.toLowerCase().includes(query) ||
        request.operation.action.toLowerCase().includes(query) ||
        request.operation.resource.toLowerCase().includes(query) ||
        request.requestedBy.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Auto-refresh effect
  useEffect(() => {
    fetchRequests();
  }, [currentPage, selectedStatus, selectedType, selectedLevel, showMyRequests, showAssignedToMe]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchRequests();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-1 px-3 py-2 rounded ${
                autoRefresh 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="text-sm">
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </span>
            </button>
            
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-600">Total Pending</p>
                <p className="text-2xl font-bold text-yellow-800">{summary.totalPending}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-red-600">Urgent</p>
                <p className="text-2xl font-bold text-red-800">{summary.urgentCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">Assigned to Me</p>
                <p className="text-2xl font-bold text-blue-800">{summary.myPendingCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="bypassed">Bypassed</option>
          </select>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="all">All Types</option>
            <option value="code_deployment">Code Deployment</option>
            <option value="database_changes">Database Changes</option>
            <option value="system_configuration">System Config</option>
            <option value="cost_exceeding_operations">Cost Exceeding</option>
            <option value="security_changes">Security Changes</option>
          </select>
          
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="all">All Levels</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="security">Security</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={showAssignedToMe}
                onChange={(e) => setShowAssignedToMe(e.target.checked)}
                className="rounded"
              />
              <span>Assigned to me</span>
            </label>
            
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={showMyRequests}
                onChange={(e) => setShowMyRequests(e.target.checked)}
                className="rounded"
              />
              <span>My requests</span>
            </label>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading approval requests...</span>
        </div>
      )}

      {/* Requests List */}
      {!loading && (
        <>
          <div className="space-y-4 mb-6">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <ApprovalRequestCard
                  key={request.id}
                  request={request}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onBypass={handleBypass}
                  onViewDetails={handleViewDetails}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No approval requests found
                </h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? "Try adjusting your search or filter criteria"
                    : "There are no approval requests matching your current filters"
                  }
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
                {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} requests
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ApprovalQueue;