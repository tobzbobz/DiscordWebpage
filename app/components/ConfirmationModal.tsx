'use client'

import { useState } from 'react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'success' | 'info'
  isLoading?: boolean
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const getTypeColor = () => {
    switch (type) {
      case 'success': return '#28a745'
      case 'warning': return '#ffc107'
      case 'info': return '#17a2b8'
      default: return '#ffc107'
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          padding: 0;
          max-width: 450px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .modal-header {
          background: ${getTypeColor()};
          padding: 20px 25px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .modal-body {
          padding: 25px;
        }

        .modal-message {
          font-size: 15px;
          color: #444;
          line-height: 1.6;
          margin: 0;
          white-space: pre-line;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 25px;
          border-top: 1px solid #e0e0e0;
          background: #f8f9fa;
        }

        .modal-btn {
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .modal-btn-cancel {
          background: #e0e0e0;
          color: #333;
        }

        .modal-btn-cancel:hover:not(:disabled) {
          background: #d0d0d0;
        }

        .modal-btn-confirm {
          background: #0066cc;
          color: white;
        }

        .modal-btn-confirm:hover:not(:disabled) {
          background: #0052a3;
        }

        .modal-btn-confirm.warning {
          background: #dc3545;
        }

        .modal-btn-confirm.warning:hover:not(:disabled) {
          background: #c82333;
        }

        .modal-btn-confirm.success {
          background: #28a745;
        }

        .modal-btn-confirm.success:hover:not(:disabled) {
          background: #1e7e34;
        }

        .loading-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon">
            {type === 'warning' && '⚠️'}
            {type === 'success' && '✅'}
            {type === 'info' && 'ℹ️'}
          </div>
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button 
            className="modal-btn modal-btn-cancel" 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            className={`modal-btn modal-btn-confirm ${type}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <span className="loading-spinner"></span>}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Validation Error Modal Component
interface ValidationErrorModalProps {
  isOpen: boolean
  onClose: () => void
  errors: { [section: string]: string[] }
  getSectionDisplayName: (section: string) => string
}

export function ValidationErrorModal({
  isOpen,
  onClose,
  errors,
  getSectionDisplayName
}: ValidationErrorModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          padding: 0;
          max-width: 550px;
          width: 90%;
          max-height: 80vh;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          background: #dc3545;
          padding: 20px 25px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-icon {
          font-size: 28px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .modal-body {
          padding: 20px 25px;
          overflow-y: auto;
          flex: 1;
        }

        .modal-intro {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
        }

        .error-section {
          margin-bottom: 20px;
        }

        .error-section-title {
          font-size: 15px;
          font-weight: 600;
          color: #1a3a5c;
          margin-bottom: 8px;
          padding-bottom: 5px;
          border-bottom: 2px solid #e0e0e0;
        }

        .error-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .error-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          font-size: 14px;
          color: #c0392b;
        }

        .error-bullet {
          color: #dc3545;
          font-size: 10px;
        }

        .modal-footer {
          display: flex;
          justify-content: center;
          padding: 20px 25px;
          border-top: 1px solid #e0e0e0;
          background: #f8f9fa;
        }

        .modal-btn-ok {
          padding: 12px 40px;
          font-size: 15px;
          font-weight: 600;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-ok:hover {
          background: #0052a3;
        }
      `}</style>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-icon">❌</span>
          <h3 className="modal-title">Cannot Submit ePRF</h3>
        </div>
        <div className="modal-body">
          <p className="modal-intro">
            Please complete all required fields before submitting. The following sections have missing information:
          </p>
          {Object.entries(errors).map(([section, fieldErrors]) => (
            <div key={section} className="error-section">
              <div className="error-section-title">{getSectionDisplayName(section)}</div>
              <ul className="error-list">
                {fieldErrors.map((error, index) => (
                  <li key={index} className="error-item">
                    <span className="error-bullet">●</span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="modal-btn-ok" onClick={onClose}>
            OK, I'll fix these
          </button>
        </div>
      </div>
    </div>
  )
}

// Success Modal Component
interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  message
}: SuccessModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          padding: 0;
          max-width: 450px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          text-align: center;
        }

        .modal-header {
          background: #28a745;
          padding: 30px 25px;
        }

        .modal-icon {
          font-size: 60px;
          display: block;
          margin-bottom: 10px;
        }

        .modal-title {
          font-size: 22px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .modal-body {
          padding: 25px;
        }

        .modal-message {
          font-size: 15px;
          color: #444;
          line-height: 1.6;
          margin: 0;
          white-space: pre-line;
        }

        .modal-footer {
          display: flex;
          justify-content: center;
          padding: 20px 25px;
          border-top: 1px solid #e0e0e0;
          background: #f8f9fa;
        }

        .modal-btn-ok {
          padding: 12px 50px;
          font-size: 15px;
          font-weight: 600;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-ok:hover {
          background: #1e7e34;
        }
      `}</style>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-icon">✓</span>
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn-ok" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
