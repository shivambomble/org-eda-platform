import React, { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import InventoryAlertModal from './InventoryAlertModal';

interface AlertButtonProps {
  projectId: string;
  datasetId?: string;
  userRole: string;
  className?: string;
}

const AlertButton: React.FC<AlertButtonProps> = ({
  projectId,
  datasetId,
  userRole,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Only show for admin and analyst roles
  if (userRole === 'USER') {
    return null;
  }

  const handleAlertSent = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (showSuccess) {
    return (
      <div className={`flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-md ${className}`}>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Alert sent successfully!</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors ${className}`}
        title="Send inventory alert to manager"
      >
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Report Issue</span>
      </button>

      <InventoryAlertModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        datasetId={datasetId}
        onAlertSent={handleAlertSent}
      />
    </>
  );
};

export default AlertButton;