import React, { useState } from 'react';
import { ASCII_COLORS } from '../constants';
import * as localStorageService from '../services/localStorageService';
import { ChevronDown, ChevronRight, Search, Tag } from 'lucide-react';

interface Props {
  show: boolean;
  onClose: () => void;
}

const VisualView: React.FC<Props> = ({ show, onClose }) => {
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedShelves, setExpandedShelves] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  if (!show) return null;
  
  const warehouses = localStorageService.getWarehouses();

  const toggleWarehouse = (warehouseId: string) => {
    const newExpanded = new Set(expandedWarehouses);
    if (newExpanded.has(warehouseId)) {
      newExpanded.delete(warehouseId);
    } else {
      newExpanded.add(warehouseId);
    }
    setExpandedWarehouses(newExpanded);
  };

  const toggleRoom = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  const toggleShelf = (shelfId: string) => {
    const newExpanded = new Set(expandedShelves);
    if (newExpanded.has(shelfId)) {
      newExpanded.delete(shelfId);
    } else {
      newExpanded.add(shelfId);
    }
    setExpandedShelves(newExpanded);
  };

  const itemMatchesFilter = (item: any) => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = !tagFilter || 
      item.labels?.some((label: string) => label.toLowerCase().includes(tagFilter.toLowerCase()));
    
    return matchesSearch && matchesTag;
  };

  return (
    <div className={`modal-backdrop fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-95 flex items-center justify-center z-50 p-4`}>
      <div className={`modal-content ${ASCII_COLORS.modalBg} rounded-lg shadow-2xl w-full max-w-5xl h-5/6 border-2 ${ASCII_COLORS.border} flex flex-col`}>
        <div className={`flex items-center justify-between p-4 border-b-2 ${ASCII_COLORS.border}`}>
          <h2 className={`${ASCII_COLORS.accent} text-xl font-bold`}>Visual View - Hierarchical</h2>
          <button onClick={onClose} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[CLOSE]</button>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} pl-10 pr-4 py-2 rounded border ${ASCII_COLORS.border} w-full text-sm`}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by tag..."
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className={`${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} pl-10 pr-4 py-2 rounded border ${ASCII_COLORS.border} w-full text-sm`}
                />
              </div>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setTagFilter('');
              }}
              className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-sm`}
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {warehouses.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No warehouses yet.</div>
          ) : (
            <div className="space-y-2">
              {warehouses.map((warehouse) => (
                <div key={warehouse.id} className={`border-2 ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.inputBg}`}>
                  {/* Warehouse Header */}
                  <div
                    className="hierarchy-item flex items-center p-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
                    onClick={() => toggleWarehouse(warehouse.id)}
                  >
                    {expandedWarehouses.has(warehouse.id) ? (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-2" />
                    )}
                    <span className="font-bold text-yellow-300">🏢 {warehouse.name}</span>
                    <span className="ml-auto text-sm text-gray-400">
                      {warehouse.rooms?.length || 0} rooms
                    </span>
                  </div>
                  
                  {/* Warehouse Content */}
                  {expandedWarehouses.has(warehouse.id) && (
                    <div className="px-6 pb-3">
                      {!warehouse.rooms || warehouse.rooms.length === 0 ? (
                        <div className="text-gray-600 text-sm py-2">[no rooms]</div>
                      ) : (
                        <div className="space-y-2">
                          {warehouse.rooms.map((room) => (
                            <div key={room.id} className="border border-yellow-800 rounded bg-black/40">
                              {/* Room Header */}
                              <div
                                className="flex items-center p-2 cursor-pointer hover:bg-gray-600/50"
                                onClick={() => toggleRoom(room.id)}
                              >
                                {expandedRooms.has(room.id) ? (
                                  <ChevronDown className="w-4 h-4 mr-2" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 mr-2" />
                                )}
                                <span className="font-semibold text-blue-300">🏠 {room.name}</span>
                                <span className="ml-auto text-sm text-gray-400">
                                  {room.shelves?.length || 0} containers
                                </span>
                              </div>
                              
                              {/* Room Content */}
                              {expandedRooms.has(room.id) && (
                                <div className="px-6 pb-2">
                                  {!room.shelves || room.shelves.length === 0 ? (
                                    <div className="text-gray-600 text-sm py-2">[no containers]</div>
                                  ) : (
                                    <div className="space-y-1">
                                      {room.shelves.map((shelf) => {
                                        const filteredItems = shelf.items?.filter(itemMatchesFilter) || [];
                                        const totalItems = shelf.items?.length || 0;
                                        
                                        return (
                                          <div key={shelf.id} className="border border-yellow-900 rounded bg-black/60">
                                            {/* Shelf Header */}
                                            <div
                                              className="flex items-center p-2 cursor-pointer hover:bg-gray-500/50"
                                              onClick={() => toggleShelf(shelf.id)}
                                            >
                                              {expandedShelves.has(shelf.id) ? (
                                                <ChevronDown className="w-3 h-3 mr-2" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3 mr-2" />
                                              )}
                                              <span className="text-sm text-green-300">📦 {shelf.name}</span>
                                              <span className="ml-auto text-xs text-gray-400">
                                                {(searchQuery || tagFilter) && filteredItems.length !== totalItems 
                                                  ? `${filteredItems.length}/${totalItems} items`
                                                  : `${totalItems} items`
                                                }
                                              </span>
                                            </div>
                                            
                                            {/* Shelf Content */}
                                            {expandedShelves.has(shelf.id) && (
                                              <div className="px-4 pb-2">
                                                {filteredItems.length === 0 ? (
                                                  <div className="text-gray-600 text-xs py-1">
                                                    {totalItems === 0 ? '[empty]' : '[no matches]'}
                                                  </div>
                                                ) : (
                                                  <div className="space-y-1">
                                                    {filteredItems.map((item) => (
                                                      <div key={item.id} className="flex items-center justify-between text-xs bg-black/40 p-2 rounded">
                                                        <div className="flex-1 truncate">
                                                          <span className="text-white">• {item.name}</span>
                                                          {item.description && (
                                                            <span className="text-gray-400 ml-2">({item.description})</span>
                                                          )}
                                                        </div>
                                                        <div className="flex items-center space-x-2 text-xs">
                                                          <span className="text-cyan-300">
                                                            {item.quantity}{item.unit ? ' ' + item.unit : ''}
                                                          </span>
                                                          {item.priority !== 'Normal' && (
                                                            <span className={`px-1 rounded ${
                                                              item.priority === 'High' ? 'bg-red-800 text-red-200' :
                                                              item.priority === 'Low' ? 'bg-blue-800 text-blue-200' :
                                                              'bg-gray-800 text-gray-200'
                                                            }`}>
                                                              {item.priority}
                                                            </span>
                                                          )}
                                                          {item.labels && item.labels.length > 0 && (
                                                            <div className="flex space-x-1">
                                                              {item.labels.slice(0, 2).map((label, idx) => (
                                                                <span key={idx} className="bg-purple-800 text-purple-200 px-1 rounded text-xs">
                                                                  {label}
                                                                </span>
                                                              ))}
                                                              {item.labels.length > 2 && (
                                                                <span className="text-gray-400">+{item.labels.length - 2}</span>
                                                              )}
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualView;


