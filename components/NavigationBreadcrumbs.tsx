import React from 'react';
import { ChevronRight, Home, Box, List, ShoppingCart } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import localizationService from '../services/localizationService';

interface NavigationBreadcrumbsProps {
  showBucketView: boolean;
  selectedWarehouseName: string | null;
  selectedRoomName: string | null;
  selectedShelfName: string | null;
  onNavigateToWarehouse: () => void;
  onNavigateToRoom: () => void;
}

const NavigationBreadcrumbs: React.FC<NavigationBreadcrumbsProps> = ({
  showBucketView,
  selectedWarehouseName,
  selectedRoomName,
  selectedShelfName,
  onNavigateToWarehouse,
  onNavigateToRoom,
}) => {
  if (showBucketView) {
    return (
      <div className={`flex items-center gap-2 text-sm ${ASCII_COLORS.text} mb-4 p-2 rounded-lg bg-blue-900/20 border ${ASCII_COLORS.border}`}>
        <ShoppingCart size={16} className="text-blue-400" />
        <span className="font-semibold">{localizationService.translate('nav.bucket')} - {localizationService.translate('ui.staging_area')}</span>
      </div>
    );
  }

  const breadcrumbs = [];
  
  // Always show Home
  breadcrumbs.push({
    label: localizationService.translate('nav.home', 'Home'),
    icon: <Home size={14} />,
    onClick: () => {},
    active: !selectedWarehouseName
  });

  if (selectedWarehouseName) {
    breadcrumbs.push({
      label: selectedWarehouseName,
      icon: <Home size={14} />,
      onClick: onNavigateToWarehouse,
      active: selectedWarehouseName && !selectedRoomName
    });
  }

  if (selectedRoomName) {
    breadcrumbs.push({
      label: selectedRoomName,
      icon: <Box size={14} />,
      onClick: onNavigateToRoom,
      active: selectedRoomName && !selectedShelfName
    });
  }

  if (selectedShelfName) {
    breadcrumbs.push({
      label: selectedShelfName,
      icon: <List size={14} />,
      onClick: () => {},
      active: true
    });
  }

  return (
    <nav className={`flex items-center gap-1 text-sm ${ASCII_COLORS.text} mb-4`}>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight size={12} className="text-gray-500 mx-1" />}
          <button
            onClick={crumb.onClick}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              crumb.active 
                ? `${ASCII_COLORS.accent} font-semibold` 
                : `hover:bg-gray-700 ${ASCII_COLORS.text}`
            }`}
            disabled={crumb.active}
          >
            {crumb.icon}
            <span>{crumb.label}</span>
          </button>
        </React.Fragment>
      ))}
      
      {!selectedWarehouseName && (
        <span className="ml-2 text-gray-500 italic">
          {localizationService.translate('ui.select_warehouse', 'Select a warehouse to begin')}
        </span>
      )}
    </nav>
  );
};

export default NavigationBreadcrumbs;