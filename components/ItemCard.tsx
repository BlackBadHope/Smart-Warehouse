
import React from 'react';
import { Plus, Minus, Trash2, Edit, Move, DollarSign, Folder, Info, Grid3X3, ArrowDownWideNarrow, RotateCcw, CheckSquare, Square, Tag as TagIcon } from 'lucide-react';
import { Item, BucketItem, Priority } from '../types';
import { ASCII_COLORS, getPriorityColorClass, isExpired } from '../constants';
import TagDisplay from './TagDisplay';

type ItemCardProps = {
  item: Item | BucketItem;
  context: 'storage' | 'bucket';
  currency: string;
  onMoveClick: (item: Item | BucketItem) => void;
  onEditClick: (item: Item | BucketItem) => void;
  onDeleteClick: (item: Item | BucketItem) => void;
  onToggleTransfer?: (item: BucketItem) => void; // Optional, only for bucket context
  onUpdateQuantity: (item: Item | BucketItem, amount: number) => void;
};

const ItemCard: React.FC<ItemCardProps> = ({
  item,
  context,
  currency,
  onMoveClick,
  onEditClick,
  onDeleteClick,
  onToggleTransfer,
  onUpdateQuantity,
}) => {
  const safeItem: Item & Partial<BucketItem> = {
    name: 'Unnamed Item',
    priority: 'Normal' as Priority,
    category: '',
    quantity: 0,
    unit: 'pcs',
    ...item,
  };

  const itemIsExpired = isExpired(safeItem.expiryDate);

  return (
    <div
      className={`${ASCII_COLORS.inputBg} border-2 ${itemIsExpired && safeItem.priority !== 'Dispose' ? 'border-red-600 animate-pulse' : ASCII_COLORS.border} 
      rounded-lg flex flex-col justify-between ${safeItem.priority === 'Dispose' ? 'opacity-60 grayscale' : ''} transition-all duration-300 hover:shadow-xl hover:border-yellow-300`}
    >
      <div className="p-3">
        <h3 className={`font-semibold text-lg mb-2 truncate flex items-center ${ASCII_COLORS.accent}`}>
          <Grid3X3 className="w-5 h-5 mr-2 shrink-0" />
          {safeItem.name.toUpperCase()}
        </h3>
        <div className="flex items-center justify-between text-sm mb-1">
          <p className="flex items-center"><RotateCcw className="w-4 h-4 mr-1 shrink-0" />QTY: {safeItem.quantity} {safeItem.unit || 'pcs'}</p>
          {context !== 'bucket' && (
            <div className="flex items-center">
              <button onClick={() => onUpdateQuantity(safeItem, -1)} className="p-1 rounded-full bg-gray-700 hover:bg-red-800 transition-colors"><Minus size={14} /></button>
              <button onClick={() => onUpdateQuantity(safeItem, 1)} className="ml-1 p-1 rounded-full bg-gray-700 hover:bg-green-800 transition-colors"><Plus size={14} /></button>
            </div>
          )}
        </div>
        {safeItem.category && <p className="text-sm mb-1 flex items-center truncate"><Folder className="w-4 h-4 mr-1 shrink-0" />{safeItem.category.toUpperCase()}</p>}
        
        <p className={`text-xs my-2 flex items-center ${getPriorityColorClass(safeItem.priority)} px-2 py-0.5 rounded-full inline-flex font-semibold`}>
          <ArrowDownWideNarrow className="w-4 h-4 mr-1 shrink-0" />{safeItem.priority.toUpperCase()}
        </p>

        {safeItem.price && safeItem.price > 0 && <p className="text-sm flex items-center"><DollarSign className="w-4 h-4 mr-1 shrink-0" />{safeItem.price} {currency}</p>}
        {itemIsExpired && safeItem.priority !== 'Dispose' && <p className="text-sm text-red-400 font-bold">EXPIRED: {safeItem.expiryDate}</p>}
        {!itemIsExpired && safeItem.expiryDate && <p className="text-sm">Expires: {safeItem.expiryDate}</p>}

        {safeItem.description && <p className="text-xs mt-2 flex items-start"><Info className="w-3 h-3 mr-1 mt-0.5 shrink-0" />{safeItem.description}</p>}
        <TagDisplay tags={safeItem.labels} />

        {context === 'bucket' && 'destination' in safeItem && safeItem.destination && (
          <div className={`mt-2 text-xs p-2 ${ASCII_COLORS.inputBg} border ${ASCII_COLORS.border} rounded-md`}>
            <p className={`font-bold ${ASCII_COLORS.accent}`}>DESTINATION:</p>
            <p>{`${safeItem.destination.warehouseName} > ${safeItem.destination.roomName} > ${safeItem.destination.shelfName}`}</p>
          </div>
        )}
      </div>
      <div className={`flex space-x-1 mt-auto p-2 border-t ${ASCII_COLORS.border} border-opacity-50`}>
        {context === 'bucket' && 'destination' in safeItem && safeItem.destination && onToggleTransfer && (
          <button onClick={() => onToggleTransfer(safeItem as BucketItem)} className="p-2 text-green-400 hover:text-green-300 transition-colors" title="Mark for transfer">
            {safeItem.isReadyToTransfer ? <CheckSquare /> : <Square />}
          </button>
        )}
        <button onClick={() => onMoveClick(safeItem)} className={`flex-1 ${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} flex items-center justify-center text-xs border ${ASCII_COLORS.border} transition-colors`}>
          <Move className="w-3 h-3 mr-1" />{context === 'bucket' ? 'EDIT PATH' : 'TO BUCKET'}
        </button>
        <button onClick={() => onEditClick(safeItem)} className={`flex-1 ${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} flex items-center justify-center text-xs border ${ASCII_COLORS.border} transition-colors`}>
          <Edit className="w-3 h-3 mr-1" />EDIT
        </button>
        <button onClick={() => onDeleteClick(safeItem)} className={`flex-1 ${ASCII_COLORS.buttonBg} text-red-400 p-2 rounded-md hover:bg-red-900 flex items-center justify-center text-xs border ${ASCII_COLORS.border} transition-colors`}>
          <Trash2 className="w-3 h-3 mr-1" />DELETE
        </button>
      </div>
    </div>
  );
};

export default ItemCard;
