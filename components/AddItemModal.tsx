
import React, { useState, useEffect } from 'react';
import { ItemCore, Priority, Unit, NewItemFormState } from '../types';
import { ASCII_COLORS, DEFAULT_NEW_ITEM_VALUES, UNITS } from '../constants';
import BarcodeScannerModal from './BarcodeScannerModal';
import debugService from '../services/debugService';

interface AddItemModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (itemData: Partial<ItemCore>, editingItemId: string | null) => void; // Can be async
  initialData?: ItemCore | null;
  editingItemId?: string | null;
  currency: string;
}

const initialFormState: NewItemFormState = {
  name: DEFAULT_NEW_ITEM_VALUES.name,
  category: DEFAULT_NEW_ITEM_VALUES.category,
  quantity: DEFAULT_NEW_ITEM_VALUES.quantity.toString(),
  unit: DEFAULT_NEW_ITEM_VALUES.unit,
  price: DEFAULT_NEW_ITEM_VALUES.price,
  purchaseDate: DEFAULT_NEW_ITEM_VALUES.purchaseDate,
  expiryDate: DEFAULT_NEW_ITEM_VALUES.expiryDate,
  priority: DEFAULT_NEW_ITEM_VALUES.priority,
  description: DEFAULT_NEW_ITEM_VALUES.description,
  labels: DEFAULT_NEW_ITEM_VALUES.labels,
};

const AddItemModal: React.FC<AddItemModalProps> = ({ show, onClose, onSubmit, initialData, editingItemId, currency }) => {
  const [newItem, setNewItem] = useState<NewItemFormState>(initialFormState);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (show) {
      if (editingItemId && initialData) {
        setNewItem({
          name: initialData.name,
          category: initialData.category || '',
          quantity: (initialData.quantity || 1).toString(),
          unit: initialData.unit || 'pcs',
          price: initialData.price?.toString() || '',
          purchaseDate: initialData.purchaseDate || DEFAULT_NEW_ITEM_VALUES.purchaseDate,
          expiryDate: initialData.expiryDate || '',
          priority: initialData.priority || 'Normal',
          description: initialData.description || '',
          labels: initialData.labels?.join(', ') || '',
          barcode: (initialData as any).barcode || '',
        });
      } else {
        setNewItem(initialFormState);
      }
    }
  }, [show, editingItemId, initialData]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    debugService.action('AddItemModal: Submitting item', { name: newItem.name, isEditing: !!editingItemId });

    const itemDataForFirestore: Partial<ItemCore> & Pick<ItemCore, 'name' | 'quantity' | 'unit' | 'priority'> = {
      name: newItem.name.trim(),
      quantity: parseFloat(newItem.quantity),
      unit: newItem.unit,
      priority: newItem.priority,
    };

    if (newItem.category.trim()) itemDataForFirestore.category = newItem.category.trim();
    if (newItem.price.trim()) {
      const priceValue = parseFloat(newItem.price);
      if (!isNaN(priceValue)) itemDataForFirestore.price = priceValue;
    }
    if (newItem.purchaseDate.trim()) itemDataForFirestore.purchaseDate = newItem.purchaseDate;
    if (newItem.expiryDate.trim()) itemDataForFirestore.expiryDate = newItem.expiryDate;
    if (newItem.description.trim()) itemDataForFirestore.description = newItem.description.trim();
    if ((newItem as any).barcode && (newItem as any).barcode.trim()) {
      (itemDataForFirestore as any).barcode = (newItem as any).barcode.trim();
    }
    
    const labelsArray = newItem.labels.split(',').map(s => s.trim()).filter(Boolean);
    if (labelsArray.length > 0) itemDataForFirestore.labels = labelsArray;

    try {
      await onSubmit(itemDataForFirestore, editingItemId || null);
      debugService.info('AddItemModal: Item submitted successfully');
    } catch (error) {
      debugService.error('AddItemModal: Submit failed', error);
    }
    // onClose(); // The caller (InventoryApp) now handles closing the modal in its onSubmit callback.
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-40 p-2 sm:p-4`} style={{ paddingBottom: '60px' }}>
      <div className={`${ASCII_COLORS.modalBg} p-3 sm:p-6 rounded-lg shadow-xl w-full max-w-lg border-2 ${ASCII_COLORS.border} max-h-[calc(100vh-80px)] flex flex-col`}>
        <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.accent}`}>
          {editingItemId ? '[EDIT ITEM]' : '[ADD NEW ITEM]'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-2 flex-grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm ${ASCII_COLORS.text}`}>Name:</label>
              <input name="name" value={newItem.name} onChange={handleInputChange} className={`w-full p-3 text-base border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`} required autoComplete="off" autoCorrect="on" autoCapitalize="words" spellCheck={true} inputMode="text" lang="ru" style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className={`block text-sm ${ASCII_COLORS.text}`}>Category:</label>
              <input name="category" value={newItem.category} onChange={handleInputChange} className={`w-full p-3 text-base border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`} autoComplete="off" autoCorrect="on" autoCapitalize="words" spellCheck={true} inputMode="text" lang="ru" style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className={`block text-sm ${ASCII_COLORS.text}`}>Quantity:</label>
              <input name="quantity" type="number" step="any" value={newItem.quantity} onChange={handleInputChange} className={`w-full p-3 text-base border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`} required min="0" style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className={`block text-sm ${ASCII_COLORS.text}`}>Unit:</label>
              <select name="unit" value={newItem.unit} onChange={handleInputChange} className={`w-full p-3 text-base border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`} style={{ fontSize: '16px' }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-sm ${ASCII_COLORS.text}`}>Price ({currency}):</label>
              <input name="price" type="number" step="0.01" value={newItem.price} onChange={handleInputChange} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`} />
            </div>
            <div>
              <label className={`block text-sm ${ASCII_COLORS.text}`}>Purchase Date:</label>
              <input name="purchaseDate" type="date" value={newItem.purchaseDate} onChange={handleInputChange} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`} />
            </div>
            <div>
              <label className={`block text-sm ${ASCII_COLORS.text}`}>Expiry Date:</label>
              <input name="expiryDate" type="date" value={newItem.expiryDate} onChange={handleInputChange} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`} />
            </div>
            <div className="sm:col-span-2">
              <label className={`block text-sm ${ASCII_COLORS.text}`}>Barcode:</label>
              <div className="flex gap-2">
                <input name="barcode" value={(newItem as any).barcode || ''} onChange={handleInputChange} className={`flex-1 p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`} placeholder="Scan or enter barcode" />
                <button type="button" onClick={() => setShowScanner(true)} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-3 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>
                  [SCAN]
                </button>
              </div>
            </div>
            <div>
              <label className={`block text-sm ${ASCII_COLORS.text}`}>Priority:</label>
              <select name="priority" value={newItem.priority} onChange={handleInputChange} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Low">Low</option>
                <option value="Dispose">Dispose</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-sm ${ASCII_COLORS.text}`}>Description:</label>
            <textarea name="description" value={newItem.description} onChange={handleInputChange} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`} rows={2}></textarea>
          </div>
          <div>
            <label className={`block text-sm ${ASCII_COLORS.text}`}>Labels (comma-separated):</label>
            <input name="labels" value={newItem.labels} onChange={handleInputChange} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`} />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>
              [CANCEL]
            </button>
            <button type="submit" className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>
              {editingItemId ? '[SAVE CHANGES]' : '[ADD ITEM]'}
            </button>
          </div>
        </form>
        <BarcodeScannerModal
          show={showScanner}
          onClose={() => setShowScanner(false)}
          onDetected={(code) => { setNewItem(prev => ({ ...prev, barcode: code } as any)); setShowScanner(false); }}
        />
      </div>
    </div>
  );
};

export default AddItemModal;
