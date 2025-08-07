import { Priority, Unit } from './types';

export const ASCII_COLORS = {
  bg: 'bg-black',
  text: 'text-yellow-400',
  accent: 'text-orange-400',
  border: 'border-yellow-500',
  buttonBg: 'bg-gray-800',
  buttonHoverBg: 'hover:bg-gray-700',
  inputBg: 'bg-zinc-900',
  modalBg: 'bg-zinc-900',
  error: 'bg-red-800 text-red-200',
  success: 'bg-green-800 text-green-200',
  priorityHigh: 'bg-red-900 text-red-400',
  priorityNormal: 'bg-green-900 text-green-400',
  priorityLow: 'bg-blue-900 text-blue-400',
  priorityDispose: 'bg-gray-800 text-gray-500',
  tagBg: 'bg-indigo-900 text-indigo-400',
};

export const getPriorityColorClass = (priority: Priority): string => {
  return {
    High: ASCII_COLORS.priorityHigh,
    Normal: ASCII_COLORS.priorityNormal,
    Low: ASCII_COLORS.priorityLow,
    Dispose: ASCII_COLORS.priorityDispose,
  }[priority] || 'bg-gray-700 text-gray-400';
};

export const isExpired = (dateString?: string): boolean => {
  if (!dateString) return false; 

  const parts = dateString.split('-');
  if (parts.length !== 3) return false; 

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; 
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  const expiryDate = new Date(year, month, day);
  
  if (expiryDate.getFullYear() !== year || expiryDate.getMonth() !== month || expiryDate.getDate() !== day) {
    return false; 
  }
  
  expiryDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expiryDate < today;
};

export const CURRENCIES: string[] = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'UAH'];
export const UNITS: Unit[] = ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack'];

export const DEFAULT_NEW_ITEM_VALUES = {
  name: '',
  category: '',
  quantity: 1,
  price: '', 
  purchaseDate: new Date().toISOString().split('T')[0],
  expiryDate: '',
  priority: 'Normal' as Priority,
  description: '',
  labels: '', 
  unit: 'pcs' as Unit,
};

export const APP_ID = 'inventory-os-v2.6-local';