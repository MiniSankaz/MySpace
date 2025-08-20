/**
 * Approval Request Card Component
 * Displays individual approval request with actions
 */

import React, { useState } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Users, 
  Shield, 
  AlertCircle,
  Zap
} from 'lucide-react';

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

interface ApprovalRequestCardProps {
  request: ApprovalRequest;
  onApprove: (requestId: string, reason?: string) => void;
  onReject: (requestId: string, reason: string) => void;
  onBypass: (requestId: string, reason: string) => void;
  onViewDetails: (requestId: string) => void;
  className?: string;
}

const ApprovalRequestCard: React.FC<ApprovalRequestCardProps> = ({
  request,
  onApprove,
  onReject,
  onBypass,
  onViewDetails,
  className = ''
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showBypassForm, setShowBypassForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [bypassReason, setBypassReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper functions
  const getStatusIcon = () => {
    switch (request.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'expired':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'bypassed':
        return <Zap className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (request.status) {
      case 'pending':
        return 'border-yellow-200 bg-yellow-50';
      case 'approved':
        return 'border-green-200 bg-green-50';
      case 'rejected':
        return 'border-red-200 bg-red-50';
      case 'expired':
        return 'border-orange-200 bg-orange-50';
      case 'bypassed':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getRiskLevelColor = () => {
    switch (request.operation.riskLevel) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelIcon = () => {
    switch (request.level) {
      case 'user':
        return <Users className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'security':
        return <AlertCircle className="w-4 h-4" />;
      case 'emergency':
        return <Zap className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(request.id);
      setShowActions(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      return;
    }
    
    setIsProcessing(true);
    try {
      await onReject(request.id, rejectReason);
      setShowRejectForm(false);
      setShowActions(false);
      setRejectReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBypass = async () => {
    if (!bypassReason.trim() || bypassReason.length < 10) {
      return;
    }
    
    setIsProcessing(true);
    try {
      await onBypass(request.id, bypassReason);
      setShowBypassForm(false);
      setShowActions(false);
      setBypassReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isPending = request.status === 'pending';
  const canInteract = isPending && (request.canApprove || request.canBypass);

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h3 className="font-semibold text-gray-900 truncate">
            {request.title}
          </h3>
          <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskLevelColor()}`}>
            {request.operation.riskLevel.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {getLevelIcon()}
          <span className="text-sm text-gray-600 capitalize">
            {request.level}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-700 mb-3 line-clamp-2">
        {request.description}
      </p>

      {/* Operation Details */}
      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
        <div>
          <span className="text-gray-500">Action:</span>
          <span className="ml-1 font-medium">{request.operation.action}</span>
        </div>
        <div>
          <span className="text-gray-500">Resource:</span>
          <span className="ml-1 font-medium truncate">{request.operation.resource}</span>
        </div>
      </div>

      {/* Progress and Timing */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {request.progress.currentApprovals}/{request.progress.requiredApprovals} approvals
            </span>
          </div>
          
          {isPending && (
            <div className={`flex items-center space-x-1 ${request.timeRemaining.isUrgent ? 'text-red-600' : 'text-gray-600'}`}>
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {request.timeRemaining.formatted} remaining
              </span>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          Requested: {formatDate(request.requestedAt)}
        </div>
      </div>

      {/* Progress Bar */}
      {isPending && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Approval Progress</span>
            <span className="text-xs text-gray-600">
              {Math.round((request.progress.currentApprovals / request.progress.requiredApprovals) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(request.progress.currentApprovals / request.progress.requiredApprovals) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onViewDetails(request.id)}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
        >
          <Eye className="w-4 h-4" />
          <span>View Details</span>
        </button>

        {canInteract && (
          <div className="flex items-center space-x-2">
            {!showActions ? (
              <button
                onClick={() => setShowActions(true)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Actions
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                {request.canApprove && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={isProcessing}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                
                {request.canBypass && (
                  <button
                    onClick={() => setShowBypassForm(true)}
                    disabled={isProcessing}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    Bypass
                  </button>
                )}
                
                <button
                  onClick={() => setShowActions(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Form Modal */}
      {showRejectForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reject Approval Request</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full p-3 border rounded-lg resize-none h-24"
              disabled={isProcessing}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bypass Form Modal */}
      {showBypassForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-purple-600">
              Emergency Bypass Request
            </h3>
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
              <p className="text-sm text-yellow-800">
                ⚠️ Emergency bypasses are audited and require strong justification.
              </p>
            </div>
            <textarea
              value={bypassReason}
              onChange={(e) => setBypassReason(e.target.value)}
              placeholder="Provide detailed justification for emergency bypass (minimum 10 characters)..."
              className="w-full p-3 border rounded-lg resize-none h-32"
              disabled={isProcessing}
            />
            <div className="text-xs text-gray-500 mb-4">
              {bypassReason.length}/10 characters minimum
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowBypassForm(false);
                  setBypassReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleBypass}
                disabled={bypassReason.length < 10 || isProcessing}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Request Bypass'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalRequestCard;