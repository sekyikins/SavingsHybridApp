import React, { useState, useEffect } from 'react';
import { SavingsRecord } from '../types/supabase';

interface EditModalProps {
  isOpen: boolean;
  selectedDate: string | null;
  savings: SavingsRecord[];
  onClose: () => void;
  onSave: (date: string, amount: number, saved: boolean) => Promise<boolean>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function EditModal({ 
  isOpen, 
  selectedDate, 
  savings, 
  onClose, 
  onSave, 
  onSuccess, 
  onError 
}: EditModalProps) {
  const [saved, setSaved] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      const record = savings.find(r => r.date === selectedDate);
      setSaved(record?.saved || false);
      setAmount(record?.amount?.toString() || '');
    }
  }, [selectedDate, savings]);

  const handleSave = async () => {
    if (!selectedDate) return;

    if (saved && (!amount || parseFloat(amount) <= 0)) {
      onError('Please enter a valid amount when marking as saved');
      return;
    }

    setLoading(true);
    const success = await onSave(selectedDate, parseFloat(amount) || 0, saved);
    setLoading(false);

    if (success) {
      onSuccess('Savings record updated successfully!');
      onClose();
    } else {
      onError('Failed to save. Please check your connection and try again.');
    }
  };

  if (!isOpen || !selectedDate) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Edit Savings for {new Date(selectedDate).toLocaleDateString()}
        </h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input 
              type="checkbox" 
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <span className="ml-2 text-gray-700">Saved on this day</span>
          </label>
          
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount saved (GHS)" 
            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="0.01" 
            min="0"
          />
        </div>
        
        <div className="flex gap-3 mt-6">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="loading w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              'Save'
            )}
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
