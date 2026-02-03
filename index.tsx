
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import React, { useState, useEffect, ReactNode, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';

// Add WakeLockSentinel type as it is not part of standard lib.d.ts
interface WakeLockSentinel extends EventTarget {
    readonly released: boolean;
    readonly type: 'screen';
    release(): Promise<void>;
}

// Add jsPDF types for global scope
declare const jspdf: any;


// --- Utility Functions ---
const triggerVibration = (duration = 10) => {
    if (navigator.vibrate) {
        try {
            navigator.vibrate(duration);
        } catch (e) {
            console.warn("Haptic feedback is not supported or enabled.", e);
        }
    }
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
};


// --- Icon Components ---
const WifiIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
);
const WifiOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
);
const PaletteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a7 7 0 1 0 10 10"></path></svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);
const RefreshCwIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
);
const InstallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m0 12l-4-4m4 4l4-4"/><path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/></svg>
);
const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const BriefcaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);
const BookOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);
const CalculatorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="12" y1="10" x2="12" y2="18"></line><line x1="8" y1="14" x2="16" y2="14"></line></svg>
);
const TrendingUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);
const TrendingDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);
const ImportIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
);
const ZapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);
const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
);
const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
);
const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
);
const RedoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
);
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);
const ChevronUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
);
const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);
const StarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
);
const TelegramIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
);
const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
);


// --- Accessibility Hook ---
const useFocusTrap = (modalRef: React.RefObject<HTMLDivElement>, isOpen: boolean, onClose: () => void) => {
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement;

            setTimeout(() => {
                const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements && focusableElements.length > 0) {
                    focusableElements[0].focus();
                }
            }, 100);

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                    return;
                }
                
                if (e.key === 'Tab') {
                    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    if (!focusableElements || focusableElements.length === 0) return;

                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey) { // Shift + Tab
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            e.preventDefault();
                        }
                    } else { // Tab
                        if (document.activeElement === lastElement) {
                            firstElement.focus();
                            e.preventDefault();
                        }
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);

            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                previousFocusRef.current?.focus();
            };
        }
    }, [isOpen, modalRef, onClose]);
};

// --- Modal Component ---
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useFocusTrap(modalRef, isOpen, onClose);

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} role="presentation">
            <div className="modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div className="modal-header">
                    <h2 id="modal-title">{title}</h2>
                    <button className="btn-icon" onClick={onClose} aria-label="Close modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>,
        document.body
    );
};


// --- Types ---
type InputFields = 'buyPrice' | 'sellPrice' | 'quantity' | 'customBuyBrokerage' | 'customSellBrokerage' | 'customSign' | 'fixedBuyCharge';
type TradeType = 'intraday' | 'delivery' | 'none' | 'custom';
type CustomSignSide = 'buy' | 'sell' | 'none';
type CalculatorState = {
    buyPrice: string;
    sellPrice: string;
    quantity: string;
    tradeType: TradeType;
    customBuyBrokerage: string;
    customSellBrokerage: string;
    customSign: string;
    customSignSide: CustomSignSide;
    fixedBuyCharge: string;
};
type CalculationResult = {
    turnover: number;
    buyBrokerage: number;
    sellBrokerage: number;
    brokerage: number;
    stt: number;
    transactionCharges: number;
    gst: number;
    sebiCharges: number;
    stampDuty: number;
    totalCharges: number;
    netPL: number;
    grossPL: number;
};
type HistoryItem = {
    id: string;
    timestamp: string;
    inputs: {
        buyPrice: string;
        sellPrice: string;
        quantity: string;
        customBuyBrokerage?: string;
        customSellBrokerage?: string;
        customSign?: string;
        customSignSide?: CustomSignSide;
        fixedBuyCharge?: string;
        isImportedFixed?: boolean; // Flag to indicate NetPL was provided during import
    };
    results: CalculationResult;
    tradeType: TradeType;
};
type Settings = {
    profileName: string;
};

// --- Constants ---
const DEFAULT_SETTINGS: Settings = {
    profileName: 'Default Profile'
};

// --- EditHistoryModal Component ---
interface EditHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: HistoryItem;
    onSave: (updatedItem: HistoryItem) => void;
}

const EditHistoryModal: React.FC<EditHistoryModalProps> = ({ isOpen, onClose, item, onSave }) => {
    const [editedItem, setEditedItem] = useState<HistoryItem | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    useFocusTrap(modalRef, isOpen, onClose);

    useEffect(() => {
        if (item) {
            setEditedItem(JSON.parse(JSON.stringify(item))); // Deep copy
        }
    }, [item]);

    const handleInputChange = (field: keyof HistoryItem['inputs'], value: string) => {
        if (!editedItem) return;
        setEditedItem({
            ...editedItem,
            inputs: {
                ...editedItem.inputs,
                [field]: value,
                isImportedFixed: false // Reset flag if user manually edits prices
            },
        });
    };
    
    const handleTradeTypeChange = (newTradeType: TradeType) => {
        if (!editedItem) return;
        setEditedItem({ ...editedItem, tradeType: newTradeType, inputs: { ...editedItem.inputs, isImportedFixed: false } });
    };
    
    const handleSignSideChange = (side: CustomSignSide) => {
        if (!editedItem) return;
        setEditedItem({
            ...editedItem,
            inputs: {
                ...editedItem.inputs,
                customSignSide: editedItem.inputs.customSignSide === side ? 'none' : side,
            }
        });
    };

    const handleSave = () => {
        if (editedItem) {
            onSave(editedItem);
        }
    };

    if (!isOpen || !editedItem) return null;

    return createPortal(
         <div className="modal-overlay" onClick={onClose} role="presentation">
            <div className="modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
                <div className="modal-header">
                    <h2 id="edit-modal-title">Edit History Entry</h2>
                    <button className="btn-icon" onClick={onClose} aria-label="Close modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="modal-body edit-modal-body">
                    <div className="settings-input">
                        <label htmlFor="edit-buyPrice">Buy Price</label>
                        <input id="edit-buyPrice" type="number" value={editedItem.inputs.buyPrice} onChange={(e) => handleInputChange('buyPrice', e.target.value)} />
                    </div>
                     <div className="settings-input">
                        <label htmlFor="edit-sellPrice">Sell Price</label>
                        <input id="edit-sellPrice" type="number" value={editedItem.inputs.sellPrice} onChange={(e) => handleInputChange('sellPrice', e.target.value)} />
                    </div>
                     <div className="settings-input">
                        <label htmlFor="edit-quantity">Quantity</label>
                        <input id="edit-quantity" type="number" value={editedItem.inputs.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} />
                    </div>
                    <div className="settings-input">
                        <label htmlFor="edit-fixedBuyCharge">Fixed Adj (Buy)</label>
                        <input id="edit-fixedBuyCharge" type="number" value={editedItem.inputs.fixedBuyCharge || '0'} onChange={(e) => handleInputChange('fixedBuyCharge', e.target.value)} />
                    </div>
                     <div className="settings-input">
                        <label htmlFor="edit-customSign">Custom Sign</label>
                        <div className="custom-sign-input-wrapper">
                            <input id="edit-customSign" type="text" value={editedItem.inputs.customSign || ''} onChange={(e) => handleInputChange('customSign', e.target.value)} />
                            <div className="sign-side-selector">
                                <button
                                    className={`btn-side ${editedItem.inputs.customSignSide === 'buy' ? 'active' : ''}`}
                                    onClick={() => handleSignSideChange('buy')}
                                    aria-label="Assign sign to Buy side"
                                    title="Assign to Buy"
                                >B</button>
                                <button
                                    className={`btn-side ${editedItem.inputs.customSignSide === 'sell' ? 'active' : ''}`}
                                    onClick={() => handleSignSideChange('sell')}
                                    aria-label="Assign sign to Sell side"
                                    title="Assign to Sell"
                                >S</button>
                            </div>
                        </div>
                    </div>
                    <div className="edit-trade-type-selector">
                        { (['intraday', 'delivery', 'custom', 'none'] as TradeType[]).map(type => (
                            <button
                                key={type}
                                className={`btn ${editedItem.tradeType === type ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handleTradeTypeChange(type)}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                    {editedItem.tradeType === 'custom' && (
                        <>
                            <div className="settings-input">
                                <label htmlFor="edit-customBuyBrokerage">Buy Brok %</label>
                                <input id="edit-customBuyBrokerage" type="number" value={editedItem.inputs.customBuyBrokerage || ''} onChange={(e) => handleInputChange('customBuyBrokerage', e.target.value)} />
                            </div>
                            <div className="settings-input">
                                <label htmlFor="edit-customSellBrokerage">Sell Brok %</label>
                                <input id="edit-customSellBrokerage" type="number" value={editedItem.inputs.customSellBrokerage || ''} onChange={(e) => handleInputChange('customSellBrokerage', e.target.value)} />
                            </div>
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- ImportModal Component ---
interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (items: HistoryItem[]) => void;
    calculate: (bp: number, sp: number, qty: number, tt: TradeType, cbb: string, csb: string, fbc: string) => CalculationResult;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, calculate }) => {
    const [importText, setImportText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    useFocusTrap(modalRef, isOpen, onClose);

    const handleTextImport = () => {
        setError(null);
        if (!importText.trim()) {
            setError("Text area is empty.");
            return;
        }
        
        const lines = importText.trim().split('\n');
        const newItems: HistoryItem[] = [];

        try {
            for (const line of lines) {
                if (!line.trim()) continue;
                const parts = line.split(';').map(p => p.trim());
                // New Format: Buy;Sell;Qty;NetPL;TotalCharges;Type;Side;Sign;BuyBrok;SellBrok;StaticAdj
                const [
                    bpStr, spStr, qtyStr, 
                    providedNetPLStr = '', providedChargesStr = '',
                    tradeTypeStr = 'intraday', customSignSideStr = 'none', customSign = '', 
                    customBuyBrokerage = '0', customSellBrokerage = '0', fixedBuyChargeStr = '0.10'
                ] = parts;

                const bp = parseFloat(bpStr);
                const sp = parseFloat(spStr);
                const qty = parseInt(qtyStr, 10);
                const tradeType = ['intraday', 'delivery', 'custom', 'none'].includes(tradeTypeStr) ? tradeTypeStr as TradeType : 'intraday';
                const customSignSide = ['buy', 'sell', 'none'].includes(customSignSideStr) ? customSignSideStr as CustomSignSide : 'none';

                if (isNaN(bp) || isNaN(sp) || isNaN(qty) || qty <= 0) {
                    throw new Error(`Invalid number format in line: "${line}"`);
                }

                let results = calculate(bp, sp, qty, tradeType, customBuyBrokerage, customSellBrokerage, fixedBuyChargeStr);
                let isImportedFixed = false;

                // If user provided Net PL or Charges, override to preserve original source amount
                if (providedNetPLStr || providedChargesStr) {
                    isImportedFixed = true;
                    const netPL = providedNetPLStr ? parseFloat(providedNetPLStr) : results.netPL;
                    const totalCharges = providedChargesStr ? parseFloat(providedChargesStr) : (providedNetPLStr ? (((sp - bp) * qty) - netPL) : results.totalCharges);
                    
                    results = {
                        ...results,
                        netPL: isNaN(netPL) ? results.netPL : netPL,
                        totalCharges: isNaN(totalCharges) ? results.totalCharges : totalCharges,
                        brokerage: isNaN(totalCharges) ? results.brokerage : totalCharges // Assume brokerage is the main charge
                    };
                }
                
                const newItem: HistoryItem = {
                    id: `${new Date().toISOString()}-${Math.random()}`,
                    timestamp: new Date().toISOString(),
                    inputs: {
                        buyPrice: bpStr,
                        sellPrice: spStr,
                        quantity: qtyStr,
                        customSign,
                        customSignSide,
                        fixedBuyCharge: fixedBuyChargeStr,
                        isImportedFixed,
                        ...(tradeType === 'custom' && { customBuyBrokerage, customSellBrokerage })
                    },
                    results,
                    tradeType,
                };
                newItems.push(newItem);
            }
            onImport(newItems);
            onClose();
        } catch (e: any) {
            setError(e.message || "Failed to parse text data. Please check the format.");
        }
    };

    const handleImageImport = async (file: File) => {
        setError(null);
        setIsLoading(true);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API key is not configured.");
            }
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Data = await fileToBase64(file);

            const tradeDataSchema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        buyPrice: { type: Type.STRING },
                        sellPrice: { type: Type.STRING },
                        quantity: { type: Type.STRING },
                        netPL: { type: Type.STRING, description: 'Final Profit or Loss for this trade row' },
                        totalCharges: { type: Type.STRING, description: 'Total fees/charges/brokerage for this trade' },
                        tradeType: { type: Type.STRING, enum: ['intraday', 'delivery', 'custom', 'none'] },
                        customSign: { type: Type.STRING },
                        customSignSide: { type: Type.STRING, enum: ['buy', 'sell', 'none'] }
                    },
                    required: ['buyPrice', 'sellPrice', 'quantity']
                }
            };
            
            const prompt = `Analyze this trading log image. Extract all individual trades. For each trade, identify buy price, sell price, quantity, net profit/loss, and total charges. Output as a JSON array matching the schema. Default tradeType to 'intraday' if unclear. If net profit/loss is found, ensure it is included so the calculations remain exactly the same as shown in the image.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64Data } },
                        { text: prompt },
                    ],
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: tradeDataSchema,
                },
            });
            
            const resultJson = response.text;
            // Added safety check for AI response text
            if (!resultJson) {
                throw new Error("No trade data could be extracted from the image.");
            }
            const extractedTrades = JSON.parse(resultJson);

            const newItems: HistoryItem[] = extractedTrades.map((trade: any) => {
                const bp = parseFloat(trade.buyPrice);
                const sp = parseFloat(trade.sellPrice);
                const qty = parseInt(trade.quantity, 10);
                const tradeType = trade.tradeType || 'intraday';

                if (isNaN(bp) || isNaN(sp) || isNaN(qty) || qty <= 0) {
                     throw new Error(`Invalid data extracted from image: ${JSON.stringify(trade)}`);
                }

                let results = calculate(bp, sp, qty, tradeType, '0', '0', '0.10');
                let isImportedFixed = false;

                if (trade.netPL || trade.totalCharges) {
                    isImportedFixed = true;
                    const netPL = trade.netPL ? parseFloat(trade.netPL.replace(/[^0-9.-]/g, '')) : results.netPL;
                    const totalCharges = trade.totalCharges ? parseFloat(trade.totalCharges.replace(/[^0-9.-]/g, '')) : (trade.netPL ? (((sp - bp) * qty) - netPL) : results.totalCharges);
                    
                    results = {
                        ...results,
                        netPL: isNaN(netPL) ? results.netPL : netPL,
                        totalCharges: isNaN(totalCharges) ? results.totalCharges : totalCharges,
                        brokerage: isNaN(totalCharges) ? results.brokerage : totalCharges
                    };
                }

                return {
                    id: `${new Date().toISOString()}-${Math.random()}`,
                    timestamp: new Date().toISOString(),
                    inputs: {
                        buyPrice: String(bp),
                        sellPrice: String(sp),
                        quantity: String(qty),
                        customSign: trade.customSign || '',
                        customSignSide: trade.customSignSide || 'none',
                        fixedBuyCharge: '0.10',
                        isImportedFixed
                    },
                    results,
                    tradeType,
                };
            });

            onImport(newItems);
            onClose();

        } catch (e: any) {
             setError(`AI import failed: ${e.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageImport(file);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} role="presentation">
            <div className="modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
                {isLoading && (
                    <div className="loading-overlay">
                        <div className="loading-state">
                            <BriefcaseIcon />
                            <h3>Analyzing Image with AI...</h3>
                            <p>Ensuring amounts remain unchanged.</p>
                        </div>
                    </div>
                )}
                <div className="modal-header">
                    <h2 id="import-modal-title">Import History</h2>
                    <button className="btn-icon" onClick={onClose} aria-label="Close modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="modal-body import-modal-body">
                    <div className="import-option">
                        <h5>Option 1: Paste Text Data</h5>
                        <p className="import-instructions">
                            Format: `Buy;Sell;Qty;NetPL;Charges;Type;Side;Sign;BuyBrok;SellBrok;StaticAdj`
                            <br/>
                            <small>Only Buy, Sell, and Qty are required. Provide NetPL and Charges to keep original amounts unchanged.</small>
                        </p>
                        <textarea
                            className="import-textarea"
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder="e.g., 100;105;50;245;5;intraday&#10;250;260;20;190;10;delivery;sell;Target Hit"
                            aria-label="Paste trade data here"
                        />
                         <button className="btn btn-primary" onClick={handleTextImport}>Import from Text</button>
                    </div>

                    <div className="import-separator">OR</div>

                     <div className="import-option">
                        <h5>Option 2: Import from Image</h5>
                         <p className="import-instructions">Upload a trade log screenshot. AI will extract data and preserve exact amounts.</p>
                        <input
                            type="file"
                            id="image-upload"
                            accept="image/jpeg,image/png"
                            ref={fileInputRef}
                            onChange={onFileChange}
                            style={{ display: 'none' }}
                        />
                        <button className="btn btn-secondary ai-btn" onClick={() => fileInputRef.current?.click()}>
                           <ZapIcon /> Upload Image & Analyze with AI
                        </button>
                    </div>

                    {error && <div className="import-error-message">{error}</div>}
                </div>
            </div>
        </div>,
        document.body
    );
};


// --- Main App Component ---
const App = () => {
    // --- State Management ---
    const [calculatorState, setCalculatorState] = useState<CalculatorState>({
        buyPrice: '100',
        sellPrice: '105',
        quantity: '50',
        tradeType: 'intraday',
        customBuyBrokerage: '0.1',
        customSellBrokerage: '0.1',
        customSign: '',
        customSignSide: 'none',
        fixedBuyCharge: '0.10',
    });
    const { buyPrice, sellPrice, quantity, tradeType, customBuyBrokerage, customSellBrokerage, customSign, customSignSide, fixedBuyCharge } = calculatorState;

    const [activeInput, setActiveInput] = useState<InputFields>('buyPrice');
    const [results, setResults] = useState<CalculationResult | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [theme, setTheme] = useState('dark');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [quickEntry, setQuickEntry] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    // --- Modal States ---
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [isClearHistoryOpen, setClearHistoryOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isImportOpen, setImportOpen] = useState(false);
    
    // --- Refs and Undo/Redo State ---
    const [editingHistoryItem, setEditingHistoryItem] = useState<HistoryItem | null>(null);
    const buyPriceRef = useRef<HTMLDivElement>(null);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const undoStack = useRef<CalculatorState[]>([]);
    const redoStack = useRef<CalculatorState[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    
    // --- Popover State for Quick Sign ---
    const [quickSignTargetId, setQuickSignTargetId] = useState<string | null>(null);


    // --- Computed Values ---
    const totalHistoryNetPL = useMemo(() => {
        return history.reduce((sum, item) => sum + item.results.netPL, 0);
    }, [history]);

    // --- Effects ---
    useEffect(() => {
        const savedHistory = localStorage.getItem('calc_history');
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        const savedSettings = localStorage.getItem('calc_settings');
        if (savedSettings) setSettings(JSON.parse(savedSettings));
        const savedTheme = localStorage.getItem('calc_theme');
        if (savedTheme) setTheme(savedTheme);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('calc_history', JSON.stringify(history));
        localStorage.setItem('calc_settings', JSON.stringify(settings));
        localStorage.setItem('calc_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [history, settings, theme]);
    
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    if ('permissions' in navigator) {
                        const permissionStatus = await navigator.permissions.query({ name: 'screen-wake-lock' as any });
                        if (permissionStatus.state !== 'granted') return;
                    }
                    const lock = await (navigator as any).wakeLock.request('screen');
                    wakeLockRef.current = lock;
                } catch (err: any) {
                    console.error(`Could not acquire wake lock: ${err.message}`);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !wakeLockRef.current) {
                requestWakeLock();
            }
        };
        
        requestWakeLock();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (wakeLockRef.current) {
                wakeLockRef.current.release();
                wakeLockRef.current = null;
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);


    // --- Calculation Logic ---
    const calculate = useCallback((
        bp: number, sp: number, qty: number, currentTradeType: TradeType, customBuyBrokerage: string, customSellBrokerage: string, fixedBuyCharge: string
    ): CalculationResult => {
        const buyValue = bp * qty;
        const sellValue = sp * qty;
        const turnover = buyValue + sellValue;

        let buyBrokerage = 0;
        let sellBrokerage = 0;

        if (currentTradeType === 'intraday') {
            buyBrokerage = buyValue * 0.001;
            sellBrokerage = sellValue * 0.001;
        } else if (currentTradeType === 'delivery') {
            buyBrokerage = buyValue * 0.001;
            sellBrokerage = sellValue * 0.002;
        } else if (currentTradeType === 'custom') {
            const buyBrokeragePercent = parseFloat(customBuyBrokerage) || 0;
            const sellBrokeragePercent = parseFloat(customSellBrokerage) || 0;
            buyBrokerage = buyValue * (buyBrokeragePercent / 100);
            sellBrokerage = sellValue * (sellBrokeragePercent / 100);
        }

        const fixedAdjustment = parseFloat(fixedBuyCharge) || 0;
        const brokerage = buyBrokerage + sellBrokerage;
        const totalCharges = brokerage + fixedAdjustment;
        const grossPL = (sp - bp) * qty;
        const netPL = grossPL - totalCharges;

        return { 
            turnover, 
            buyBrokerage,
            sellBrokerage,
            brokerage, 
            stt: 0,
            transactionCharges: 0,
            gst: 0,
            sebiCharges: 0,
            stampDuty: 0,
            totalCharges, 
            grossPL,
            netPL 
        };
    }, []);

    useEffect(() => {
        const bp = parseFloat(buyPrice);
        const sp = parseFloat(sellPrice);
        const qty = parseInt(quantity, 10);

        if (isNaN(bp) || isNaN(sp) || isNaN(qty) || qty <= 0 || bp <= 0 || sp <= 0) {
            if (results !== null) setResults(null);
            return;
        }

        const calculationResults = calculate(bp, sp, qty, tradeType, customBuyBrokerage, customSellBrokerage, fixedBuyCharge);
        setResults(calculationResults);
    }, [buyPrice, sellPrice, quantity, tradeType, customBuyBrokerage, customSellBrokerage, fixedBuyCharge, calculate]);


    // --- Event Handlers ---
     const updateCalculatorState = useCallback((updater: (prevState: CalculatorState) => CalculatorState) => {
        setCalculatorState(prevState => {
            const newState = updater(prevState);
            if (JSON.stringify(prevState) !== JSON.stringify(newState)) {
                undoStack.current.push(prevState);
                redoStack.current = [];
                setCanUndo(true);
                setCanRedo(false);
            }
            return newState;
        });
    }, []);

    const handleUndo = useCallback(() => {
        if (undoStack.current.length > 0) {
            triggerVibration();
            const lastState = undoStack.current.pop()!;
            redoStack.current.push(calculatorState);
            setCalculatorState(lastState);
            setCanUndo(undoStack.current.length > 0);
            setCanRedo(true);
        }
    }, [calculatorState]);

    const handleRedo = useCallback(() => {
        if (redoStack.current.length > 0) {
            triggerVibration();
            const nextState = redoStack.current.pop()!;
            undoStack.current.push(calculatorState);
            setCalculatorState(nextState);
            setCanRedo(redoStack.current.length > 0);
            setCanUndo(true);
        }
    }, [calculatorState]);

    const handleKeypadInput = useCallback((input: string) => {
        triggerVibration();
        updateCalculatorState(prev => {
            const currentValue = prev[activeInput] || '';
            if (input === '.' && currentValue.includes('.')) return prev;

            let newValue;
            if (currentValue === '0' && input !== '.') {
                newValue = input;
            } else {
                newValue = currentValue + input;
            }
            if (activeInput === 'customSign' && currentValue === '' && input === '0') {
                newValue = '0';
            } else if (activeInput === 'customSign' && currentValue === '0' && input !== '.') {
                newValue = input;
            }
            return { ...prev, [activeInput]: newValue };
        });
    }, [activeInput, updateCalculatorState]);
    
    const handleFunctionClick = useCallback((func: string) => {
        triggerVibration();
        updateCalculatorState(prev => {
             const currentValue = prev[activeInput] || '';
            if (func === 'C') {
                 const resetValue = (activeInput === 'customSign') ? '' : ((activeInput === 'fixedBuyCharge') ? '0.10' : '0');
                return { ...prev, [activeInput]: resetValue };
            } else if (func === '⌫') {
                const newValue = currentValue.slice(0, -1);
                if (activeInput === 'customSign') return { ...prev, [activeInput]: newValue };
                return { ...prev, [activeInput]: newValue === '' ? '0' : newValue };
            }
            return prev;
        });
    }, [activeInput, updateCalculatorState]);

    const handleCalculateClick = useCallback(() => {
        triggerVibration(20);
        const bp = parseFloat(buyPrice);
        const sp = parseFloat(sellPrice);
        const qty = parseInt(quantity, 10);

        if (isNaN(bp) || isNaN(sp) || isNaN(qty) || qty <= 0) {
            alert('Please enter valid numbers for all fields.');
            return;
        }

        if (results) {
            const newHistoryItem: HistoryItem = {
                id: new Date().toISOString() + Math.random(),
                timestamp: new Date().toISOString(),
                inputs: {
                    buyPrice,
                    sellPrice,
                    quantity,
                    customSign: customSign.trim(),
                    customSignSide: customSign.trim() ? customSignSide : 'none',
                    fixedBuyCharge,
                    isImportedFixed: false,
                    ...(tradeType === 'custom' && { customBuyBrokerage, customSellBrokerage })
                },
                results: results,
                tradeType: tradeType,
            };
            setHistory(prev => [newHistoryItem, ...prev]);
        }
    }, [buyPrice, sellPrice, quantity, results, tradeType, customBuyBrokerage, customSellBrokerage, customSign, customSignSide, fixedBuyCharge]);

    const handleTradeTypeChange = (newTradeType: TradeType) => {
        triggerVibration();
        if (newTradeType === 'custom' && calculatorState.tradeType !== 'custom') {
            setActiveInput('customBuyBrokerage');
        } else if (newTradeType !== 'custom' && calculatorState.tradeType === 'custom') {
            if (activeInput === 'customBuyBrokerage' || activeInput === 'customSellBrokerage') {
                setActiveInput('buyPrice');
            }
        }
        updateCalculatorState(p => ({
            ...p, 
            tradeType: newTradeType,
            // Automatically set default custom brokerage if transitioning to custom for the first time in this session
            customBuyBrokerage: newTradeType === 'custom' ? '0.10' : p.customBuyBrokerage
        }));
    };

    const handleSignSideChange = (side: CustomSignSide) => {
        triggerVibration();
        updateCalculatorState(p => ({ ...p, customSignSide: p.customSignSide === side ? 'none' : side }));
    };
    
    const handleThemeToggle = useCallback(() => {
        triggerVibration();
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: any) => {
            setInstallPrompt(null);
        });
    };
    
    const handleSaveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        setSettingsOpen(false);
    };

    const handleClearHistory = () => {
        setHistory([]);
        setResults(null);
        setClearHistoryOpen(false);
    };
    
    const handleDeleteHistoryItem = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    };
    
    const handleMoveHistoryItem = (index: number, direction: 'up' | 'down') => {
        triggerVibration();
        setHistory(prev => {
            const newHistory = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            
            if (targetIndex >= 0 && targetIndex < newHistory.length) {
                const temp = newHistory[index];
                newHistory[index] = newHistory[targetIndex];
                newHistory[targetIndex] = temp;
            }
            return newHistory;
        });
    };
    
    const handleReloadHistoryItem = (item: HistoryItem) => {
        const reloadedState = {
            buyPrice: item.inputs.buyPrice,
            sellPrice: item.inputs.sellPrice,
            quantity: item.inputs.quantity,
            tradeType: item.tradeType,
            customBuyBrokerage: item.inputs.customBuyBrokerage || '0.1',
            customSellBrokerage: item.inputs.customSellBrokerage || '0.1',
            customSign: item.inputs.customSign || '',
            customSignSide: item.inputs.customSignSide || 'none',
            fixedBuyCharge: item.inputs.fixedBuyCharge || '0.10',
        };
        updateCalculatorState(() => reloadedState);
    };

    const createHistoryCanvas = useCallback(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const isDark = theme === 'dark';
        const textColor = isDark ? '#e2e8f0' : '#0f172a';
        const bgColor = isDark ? '#0f172a' : '#f8fafc';
        const gainColor = isDark ? '#4ade80' : '#22c55e';
        const lossColor = isDark ? '#f87171' : '#ef4444';

        const scale = 2;
        const rowHeight = 40 * scale;
        const padding = 20 * scale;
        const separatorHeight = 20 * scale;
        const totalRowHeight = 50 * scale;
        const width = 750 * scale;
        const height = (history.length * rowHeight) + separatorHeight + totalRowHeight + (padding * 2);

        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        
        const tableTop = padding;
        const colWidths = [0.08, 0.28, 0.28, 0.13, 0.23];

        ctx.font = `500 ${16 * scale}px "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
        history.forEach((item, index) => {
            const y = tableTop + (index * rowHeight);
            let currentX = padding;

            const buyText = (item.inputs.customSignSide === 'buy' && item.inputs.customSign)
                ? `${item.inputs.buyPrice} ${item.inputs.customSign}`
                : item.inputs.buyPrice;
            const sellText = (item.inputs.customSignSide === 'sell' && item.inputs.customSign)
                ? `${item.inputs.sellPrice} ${item.inputs.customSign}`
                : item.inputs.sellPrice;

            const values = [
                `#${index + 1}`,
                buyText,
                sellText,
                item.inputs.quantity,
                item.results.netPL.toFixed(2)
            ];

            values.forEach((value, i) => {
                const colW = (width - padding * 2) * colWidths[i];
                if (i === 4) ctx.fillStyle = item.results.netPL >= 0 ? gainColor : lossColor;
                else ctx.fillStyle = textColor;
                
                ctx.textAlign = (i < 3) ? 'left' : 'right';
                const textX = (i < 3) ? currentX : currentX + colW - (padding / 4);
                ctx.fillText(value, textX, y + rowHeight / 1.5);
                currentX += colW;
            });
        });

        const lastRowY = tableTop + (history.length * rowHeight);
        ctx.strokeStyle = isDark ? '#94a3b8' : '#cbd5e1';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(padding, lastRowY + separatorHeight / 2);
        ctx.lineTo(width - padding, lastRowY + separatorHeight / 2);
        ctx.stroke();

        const totalNetPL = history.reduce((acc, item) => acc + item.results.netPL, 0);
        const totalY = lastRowY + separatorHeight + totalRowHeight / 1.5;
        const totalX = width - padding;

        ctx.font = `700 ${20 * scale}px "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
        ctx.textAlign = 'right';
        ctx.fillStyle = totalNetPL >= 0 ? gainColor : lossColor;
        ctx.fillText(totalNetPL.toFixed(2), totalX - (padding / 4), totalY);

        return canvas;
    }, [history, theme]);
    
    const handleDownloadHistory = useCallback(() => {
        if (history.length === 0) return;
        triggerVibration();
        const canvas = createHistoryCanvas();
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = 'trade_history.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }, [createHistoryCanvas, history.length]);

    const generateReportText = useCallback(() => {
        const profileName = settings.profileName || 'Default Profile';
        const totalPL = formatCurrency(totalHistoryNetPL);
        
        let message = `📈 Pro Calculator Report\n`;
        message += `👤 Profile: ${profileName}\n`;
        message += `💰 Total Net P/L: ${totalPL}\n`;
        message += `------------------------\n\n`;

        return message;
    }, [settings.profileName, totalHistoryNetPL]);

    const handleShareTelegram = useCallback(() => {
        if (history.length === 0) return;
        triggerVibration();
        const message = generateReportText();
        const encodedMessage = encodeURIComponent(message);
        const telegramUrl = `https://t.me/share/url?url=&text=${encodedMessage}`;
        window.open(telegramUrl, '_blank');
    }, [history.length, generateReportText]);

    const handleShareGeneral = useCallback(async () => {
        if (history.length === 0) return;
        triggerVibration();
        setIsSharing(true);

        const canvas = createHistoryCanvas();
        if (!canvas) {
            setIsSharing(false);
            return;
        }

        const message = generateReportText();

        try {
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (blob && navigator.share && navigator.canShare) {
                const file = new File([blob], 'trade_report.png', { type: 'image/png' });
                const shareData = {
                    title: 'Trading Session Report',
                    text: message,
                    files: [file]
                };
                
                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                } else {
                    await navigator.share({ title: 'Trading Report', text: message });
                }
            } else if (navigator.share) {
                await navigator.share({ title: 'Trading Report', text: message });
            } else {
                await navigator.clipboard.writeText(message);
                alert('Report text copied to clipboard!');
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Error sharing:', err);
                alert('Sharing failed. Try downloading instead.');
            }
        } finally {
            setIsSharing(false);
        }
    }, [history.length, generateReportText, createHistoryCanvas]);

    const handleQuickEntryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuickEntry(value);
        const parts = value.trim().split(/[\s,x/]+/);
        const [bp = '', qty = '', sp = ''] = parts;
        updateCalculatorState((prev) => ({
            ...prev,
            buyPrice: bp || '0',
            quantity: qty || '0',
            sellPrice: sp || '0',
        }));
    };
    
    const handleQuickEntryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const bp = parseFloat(buyPrice);
            const sp = parseFloat(sellPrice);
            const qty = parseInt(quantity, 10);
            if (!isNaN(bp) && !isNaN(sp) && !isNaN(qty) && qty > 0) {
                handleCalculateClick();
                setQuickEntry('');
                setActiveInput('buyPrice');
                buyPriceRef.current?.focus();
            }
        }
    };
    
    const handleImportData = (newItems: HistoryItem[]) => {
        setHistory(prev => [...newItems, ...prev]);
        setImportOpen(false);
    };

    const handleOpenEditModal = (item: HistoryItem) => {
        setEditingHistoryItem(item);
        setEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setEditingHistoryItem(null);
    };

    const handleSaveHistoryEdit = (updatedItem: HistoryItem) => {
        const bp = parseFloat(updatedItem.inputs.buyPrice);
        const sp = parseFloat(updatedItem.inputs.sellPrice);
        const qty = parseInt(updatedItem.inputs.quantity, 10);
        const customBuyBrokerageValue = updatedItem.inputs.customBuyBrokerage || '0';
        const customSellBrokerageValue = updatedItem.inputs.customSellBrokerage || '0';
        const fixedBuyChargeValue = updatedItem.inputs.fixedBuyCharge || '0.10';

        if (isNaN(bp) || isNaN(sp) || isNaN(qty) || qty <= 0 || bp <= 0 || sp <= 0) {
            alert('Invalid values.');
            return;
        }

        const newResults = calculate(bp, sp, qty, updatedItem.tradeType, customBuyBrokerageValue, customSellBrokerageValue, fixedBuyChargeValue);
        const finalUpdatedItem = {
            ...updatedItem,
            inputs: {
                ...updatedItem.inputs,
                customSignSide: updatedItem.inputs.customSign?.trim() ? updatedItem.inputs.customSignSide : 'none',
            },
            results: newResults,
        };

        setHistory(prevHistory => prevHistory.map(item => item.id === finalUpdatedItem.id ? finalUpdatedItem : item));
        handleCloseEditModal();
    };

    // --- History Row Quick Actions ---
    const handleQuickSignApply = (id: string, side: CustomSignSide) => {
        triggerVibration();
        setHistory(prev => prev.map(item => {
            if (item.id === id) {
                const currentSide = item.inputs.customSignSide;
                const newSide = (currentSide === side) ? 'none' : side;
                const newSign = (newSide === 'none') ? '' : '*';
                return {
                    ...item,
                    inputs: {
                        ...item.inputs,
                        customSign: newSign,
                        customSignSide: newSide
                    }
                };
            }
            return item;
        }));
    };
    

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSettingsOpen || isClearHistoryOpen || isEditModalOpen || isImportOpen) return;
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) handleRedo(); else handleUndo();
                    return;
                }
                if (e.key.toLowerCase() === 'y') {
                    e.preventDefault(); handleRedo(); return;
                }
            }
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            if (activeInput === 'customSign' && e.key.length === 1) {
                e.preventDefault(); handleKeypadInput(e.key);
            } else if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
                e.preventDefault(); handleKeypadInput(e.key);
            } else if (e.key === 'Backspace') {
                e.preventDefault(); handleFunctionClick('⌫');
            } else if (e.key.toLowerCase() === 'c' || e.key === 'Delete') {
                e.preventDefault(); handleFunctionClick('C');
            } else if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                triggerVibration(15);
                const isCustom = tradeType === 'custom';
                const sequence: InputFields[] = isCustom
                    ? ['buyPrice', 'sellPrice', 'quantity', 'fixedBuyCharge', 'customSign', 'customBuyBrokerage', 'customSellBrokerage']
                    : ['buyPrice', 'sellPrice', 'quantity', 'fixedBuyCharge', 'customSign'];

                const currentIndex = sequence.indexOf(activeInput);
                if (currentIndex < sequence.length - 1) setActiveInput(sequence[currentIndex + 1]);
                else { handleCalculateClick(); setActiveInput('buyPrice'); }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (activeInput === 'buyPrice') setActiveInput('sellPrice');
                else if (activeInput === 'sellPrice') setActiveInput('quantity');
                else if (activeInput === 'quantity') setActiveInput('fixedBuyCharge');
                else if (activeInput === 'fixedBuyCharge') setActiveInput('customSign');
                else if (activeInput === 'customSign' && tradeType === 'custom') setActiveInput('customBuyBrokerage');
                else if (activeInput === 'customBuyBrokerage') setActiveInput('customSellBrokerage');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (activeInput === 'customSellBrokerage') setActiveInput('customBuyBrokerage');
                else if (activeInput === 'customBuyBrokerage') setActiveInput('customSign');
                else if (activeInput === 'customSign') setActiveInput('fixedBuyCharge');
                else if (activeInput === 'fixedBuyCharge') setActiveInput('quantity');
                else if (activeInput === 'quantity') setActiveInput('sellPrice');
                else if (activeInput === 'sellPrice') setActiveInput('buyPrice');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSettingsOpen, isClearHistoryOpen, isEditModalOpen, isImportOpen, activeInput, tradeType, handleKeypadInput, handleFunctionClick, handleCalculateClick, handleUndo, handleRedo]);
    
    const formatHistoryPrice = (price: string, sign?: string) => {
        if (sign) {
            return (
                <>
                    {price} <span className="history-item-sign">{sign}</span>
                </>
            );
        }
        return price;
    };

    return (
        <>
            <header>
                <div className="header-title-container">
                    <div className="header-title">
                        <BriefcaseIcon />
                        <h1>Pro Calculator</h1>
                    </div>
                    <div className="header-actions-wrapper">
                        <div className="header-actions">
                            <button className="btn-icon" onClick={handleUndo} disabled={!canUndo} aria-label="Undo"><UndoIcon /></button>
                             <button className="btn-icon" onClick={handleRedo} disabled={!canRedo} aria-label="Redo"><RedoIcon /></button>
                             <button className="btn-icon" onClick={handleThemeToggle} aria-label="Theme">
                                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                            </button>
                            <button className="btn-icon" onClick={() => setSettingsOpen(true)}><SettingsIcon /></button>
                             <span className={`btn-icon ${!isOnline ? 'offline-active' : ''}`}>
                                {isOnline ? <WifiIcon /> : <WifiOffIcon />}
                            </span>
                            {installPrompt && (
                                <button className="btn-install" onClick={handleInstallClick}>
                                    <InstallIcon /><span>Install</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            {!isOnline && <div className="offline-banner"><WifiOffIcon /> Offline</div>}

            <main>
                <div className="main-layout">
                    <div className="pro-calculator-wrapper">
                         <div className="card quick-entry-card">
                            <div className="quick-entry-wrapper">
                                <ZapIcon /><input type="text" className="quick-entry-input" placeholder="Quick Entry: Buy Qty Sell" value={quickEntry} onChange={handleQuickEntryChange} onKeyDown={handleQuickEntryKeyDown} />
                            </div>
                        </div>
                         <div className="card pro-calculator-display">
                            <div className={`display-row ${activeInput === 'buyPrice' ? 'active' : ''}`} onClick={() => setActiveInput('buyPrice')}>
                                <span className="display-label">Buy Price</span>
                                <span className="display-value">{buyPrice}<span className="cursor"></span></span>
                            </div>
                            <div className={`display-row ${activeInput === 'sellPrice' ? 'active' : ''}`} onClick={() => setActiveInput('sellPrice')}>
                                <span className="display-label">Sell Price</span>
                                <span className="display-value">{sellPrice}<span className="cursor"></span></span>
                            </div>
                            <div className={`display-row ${activeInput === 'quantity' ? 'active' : ''}`} onClick={() => setActiveInput('quantity')}>
                                <span className="display-label">Quantity</span>
                                <span className="display-value">{quantity}<span className="cursor"></span></span>
                            </div>
                            <div className={`display-row ${activeInput === 'fixedBuyCharge' ? 'active' : ''}`} onClick={() => setActiveInput('fixedBuyCharge')}>
                                <span className="display-label">Static Adj (Buy)</span>
                                <span className="display-value">{fixedBuyCharge}<span className="cursor"></span></span>
                            </div>
                            <div className={`display-row ${activeInput === 'customSign' ? 'active' : ''}`} onClick={() => setActiveInput('customSign')}>
                                <span className="display-label">Custom Sign</span>
                                <div className="custom-sign-wrapper">
                                    <span className="display-value">{customSign}<span className="cursor"></span></span>
                                    <div className="sign-side-selector">
                                        <button className={`btn-side ${customSignSide === 'buy' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); handleSignSideChange('buy'); }}>B</button>
                                        <button className={`btn-side ${customSignSide === 'sell' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); handleSignSideChange('sell'); }}>S</button>
                                    </div>
                                </div>
                            </div>
                             {tradeType === 'custom' && (
                                <>
                                    <div className={`display-row ${activeInput === 'customBuyBrokerage' ? 'active' : ''}`} onClick={() => setActiveInput('customBuyBrokerage')}>
                                        <span className="display-label">Buy Brok %</span>
                                        <span className="display-value">{customBuyBrokerage}<span className="cursor"></span></span>
                                    </div>
                                    <div className={`display-row ${activeInput === 'customSellBrokerage' ? 'active' : ''}`} onClick={() => setActiveInput('customSellBrokerage')}>
                                        <span className="display-label">Sell Brok %</span>
                                        <span className="display-value">{customSellBrokerage}<span className="cursor"></span></span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="card pro-calculator-keypad">
                            <button className={`key btn-brokerage-type ${tradeType === 'intraday' ? 'active' : ''}`} onClick={() => handleTradeTypeChange('intraday')}>Intraday</button>
                            <button className={`key btn-brokerage-type ${tradeType === 'delivery' ? 'active' : ''}`} onClick={() => handleTradeTypeChange('delivery')}>Delivery</button>
                            <button className={`key btn-brokerage-type ${tradeType === 'custom' ? 'active' : ''}`} onClick={() => handleTradeTypeChange('custom')}>Custom</button>
                            <button className={`key btn-brokerage-type ${tradeType === 'none' ? 'active' : ''}`} onClick={() => handleTradeTypeChange('none')}>No Brokerage</button>
                            {['7', '8', '9'].map(n => <button key={n} className="key key-digit" onClick={() => handleKeypadInput(n)}>{n}</button>)}
                            <button className="key key-function" onClick={() => handleFunctionClick('C')}>C</button>
                            {['4', '5', '6'].map(n => <button key={n} className="key key-digit" onClick={() => handleKeypadInput(n)}>{n}</button>)}
                            <button className="key key-function" onClick={() => handleFunctionClick('⌫')}>⌫</button>
                            {['1', '2', '3'].map(n => <button key={n} className="key key-digit" onClick={() => handleKeypadInput(n)}>{n}</button>)}
                            <button className="key key-action" style={{gridRow: '5 / 7', gridColumn: '4 / 5'}} onClick={handleCalculateClick}>=</button>
                            <button style={{gridColumn: '1 / 3'}} className="key key-digit" onClick={() => handleKeypadInput('0')}>0</button>
                            <button className="key key-digit" onClick={() => handleKeypadInput('.')}>.</button>
                        </div>
                    </div>
                    
                    <div className="results-and-history-wrapper">
                         {results && (
                            <div className="card calculator-results view-container">
                                <div className="results-header"><h2>Current Result</h2></div>
                                <div className={`net-pl-card ${results.netPL >= 0 ? 'gain' : 'loss'}`}>
                                    <div className="net-pl-card-content">
                                        <div className="label">{results.netPL >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}Net P/L</div>
                                        <div className="amount">{formatCurrency(results.netPL)}</div>
                                        <div className="gross-label">Gross: {formatCurrency(results.grossPL)}</div>
                                    </div>
                                </div>
                                
                                <div className="side-brokerage-comparison">
                                    <div className="comparison-side buy">
                                        <div className="side-title">Buy Breakdown</div>
                                        <div className="side-stat">
                                            <span className="label">Brokerage</span>
                                            <span className="val">{formatCurrency(results.buyBrokerage)}</span>
                                        </div>
                                        <div className="side-stat">
                                            <span className="label">Static Adj</span>
                                            <span className="val">{formatCurrency(parseFloat(fixedBuyCharge) || 0)}</span>
                                        </div>
                                        {results.buyBrokerage < results.sellBrokerage && <div className="best-side-tag">Cheaper Side</div>}
                                    </div>
                                    <div className="comparison-side sell">
                                        <div className="side-title">Sell Breakdown</div>
                                        <div className="side-stat">
                                            <span className="label">Brokerage</span>
                                            <span className="val">{formatCurrency(results.sellBrokerage)}</span>
                                        </div>
                                        <div className="side-stat">
                                            <span className="label">Value</span>
                                            <span className="val">{formatCurrency(parseFloat(sellPrice) * parseInt(quantity))}</span>
                                        </div>
                                        {results.sellBrokerage <= results.buyBrokerage && <div className="best-side-tag">Cheaper Side</div>}
                                    </div>
                                </div>

                                <div className="results-grid">
                                    <div className="details-column">
                                        <h3>Trade Totals</h3>
                                        <ul>
                                            <li><span>Turnover</span> <strong>{formatCurrency(results.turnover)}</strong></li>
                                            <li><span>Points Required</span> <strong>{(results.totalCharges / (parseInt(quantity) || 1)).toFixed(2)} pts</strong></li>
                                        </ul>
                                    </div>
                                    <div className="details-column">
                                        <h3>Charges Summary</h3>
                                        <ul>
                                            <li><span>Total Brokerage</span> <span>{formatCurrency(results.brokerage)}</span></li>
                                            <li className="total"><span>Final Fees</span> <strong>{formatCurrency(results.totalCharges)}</strong></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="card history-container view-container">
                            <div className="history-header">
                                <h2>History</h2>
                                <div className="history-actions">
                                     <button className="btn-history-action btn-share" onClick={handleShareGeneral} disabled={history.length === 0 || isSharing}>
                                        <ShareIcon /> {isSharing ? 'Preparing PNG...' : 'Share Report'}
                                     </button>
                                     <button className="btn-history-action btn-telegram" onClick={handleShareTelegram} disabled={history.length === 0}><TelegramIcon /> Telegram</button>
                                     <button className="btn-history-action" onClick={() => setImportOpen(true)}><ImportIcon /> Import</button>
                                     <button className="btn-history-action" onClick={handleDownloadHistory} disabled={history.length === 0}><DownloadIcon /> Download</button>
                                     <button className="btn-history-action clear-btn" onClick={() => setClearHistoryOpen(true)} disabled={history.length === 0}><TrashIcon /> Clear All</button>
                                </div>
                            </div>

                            {history.length > 0 && (
                                <div className={`history-total-summary ${totalHistoryNetPL >= 0 ? 'gain' : 'loss'}`}>
                                    <div className="summary-title">Session Total Net P/L</div>
                                    <div className="summary-amount">
                                        {totalHistoryNetPL >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                        {formatCurrency(totalHistoryNetPL)}
                                    </div>
                                </div>
                            )}

                             {history.length > 0 ? (
                                <div className="history-table">
                                    <div className="history-table-body">
                                        {history.map((item, index) => (
                                            <div className="history-table-grid" key={item.id}>
                                                <div className="history-index-cell">#{index + 1}</div>
                                                <div className={`trade-type-cell trade-type-${item.tradeType}`}>
                                                    {item.inputs.isImportedFixed ? '*' : (item.tradeType === 'none' ? 'N' : item.tradeType.charAt(0).toUpperCase())}
                                                </div>
                                                <div className="price-cell-container">
                                                    <button 
                                                        className={`btn-mini-star ${item.inputs.customSignSide === 'buy' ? 'active' : ''}`} 
                                                        onClick={() => handleQuickSignApply(item.id, 'buy')}
                                                        title="Assign Sign to Buy"
                                                    ><StarIcon /></button>
                                                    {formatHistoryPrice(item.inputs.buyPrice, item.inputs.customSignSide === 'buy' ? item.inputs.customSign : undefined)}
                                                </div>
                                                <div className="price-cell-container">
                                                    <button 
                                                        className={`btn-mini-star ${item.inputs.customSignSide === 'sell' ? 'active' : ''}`} 
                                                        onClick={() => handleQuickSignApply(item.id, 'sell')}
                                                        title="Assign Sign to Sell"
                                                    ><StarIcon /></button>
                                                    {formatHistoryPrice(item.inputs.sellPrice, item.inputs.customSignSide === 'sell' ? item.inputs.customSign : undefined)}
                                                </div>
                                                <div>{item.inputs.quantity}</div>
                                                <div className={item.results.netPL >= 0 ? 'gain' : 'loss'}>{formatCurrency(item.results.netPL)}</div>
                                                <div className="history-table-actions">
                                                     <button className="btn-icon" onClick={() => handleMoveHistoryItem(index, 'up')} disabled={index === 0} title="Move Up"><ChevronUpIcon /></button>
                                                     <button className="btn-icon" onClick={() => handleMoveHistoryItem(index, 'down')} disabled={index === history.length - 1} title="Move Down"><ChevronDownIcon /></button>
                                                     <button className="btn-icon btn-edit" onClick={() => handleOpenEditModal(item)} title="Edit"><EditIcon /></button>
                                                     <button className="btn-icon" onClick={() => handleReloadHistoryItem(item)} title="Reload"><RefreshCwIcon /></button>
                                                     <button className="btn-icon btn-delete" onClick={() => handleDeleteHistoryItem(item.id)} title="Delete"><TrashIcon /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             ) : (
                                <div className="empty-state"><h3>No History</h3><p>Your past calculations will appear here.</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Modal isOpen={isClearHistoryOpen} onClose={() => setClearHistoryOpen(false)} title="Confirm Clear History">
                <p>Delete all history? This cannot be undone.</p>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setClearHistoryOpen(false)}>Cancel</button>
                    <button className="btn btn-danger" onClick={handleClearHistory}>Clear History</button>
                </div>
            </Modal>
            <ImportModal isOpen={isImportOpen} onClose={() => setImportOpen(false)} onImport={handleImportData} calculate={calculate} />
            {editingHistoryItem && <EditHistoryModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} item={editingHistoryItem} onSave={handleSaveHistoryEdit} />}
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
