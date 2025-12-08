"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { validateAllSections, getSectionDisplayName } from '../utils/validation'
import { handleAddPatient as addPatientService, handleSubmitEPRF as submitEPRFService, getCurrentPatientLetter } from '../utils/eprfService'
import ConfirmationModal, { ValidationErrorModal, SuccessModal } from '../components/ConfirmationModal'
import TransferModal from '../components/TransferModal'
import PatientManagementModal from '../components/PatientManagementModal'
import ManageCollaboratorsModal from '../components/ManageCollaboratorsModal'
import ConnectionStatus from '../components/ConnectionStatus'
import PresenceIndicator from '../components/PresenceIndicator'
import { getCurrentUser, clearCurrentUser } from '../utils/userService'
import ChatWidget from '../components/ChatWidget'
import { isAdmin, checkEPRFAccess, checkCanTransferPatient, PermissionLevel, canManageCollaborators } from '../utils/apiClient'

export const runtime = 'edge'

interface DrawnLine {
  points: { x: number; y: number }[]
  label: string
  labelPosition: { x: number; y: number }
}

export default function PastMedicalHistoryPage() {
  // Drawing and canvas states
  // Drawing state declarations are at the top of the function
  const [drawnLines, setDrawnLines] = useState<DrawnLine[]>([]);
  const [history, setHistory] = useState<DrawnLine[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<{ x: number; y: number }[]>([]);
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showChat, setShowChat] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<{ discordId: string; callsign: string } | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser({ discordId: user.discordId, callsign: user.callsign });
    }
  }, []);
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''

  const [incompleteSections, setIncompleteSections] = useState<string[]>([])
  const [patientLetter, setPatientLetter] = useState('A')

  // Modal states
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showPatientManagementModal, setShowPatientManagementModal] = useState(false)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[section: string]: string[]}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' })
  const [userPermission, setUserPermission] = useState<PermissionLevel | null>(null)
  const [canTransfer, setCanTransfer] = useState(false)

  // Check user permission for this ePRF
  useEffect(() => {
    async function checkPermission() {
      const user = getCurrentUser()
      if (incidentId && user) {
        const access = await checkEPRFAccess(incidentId, user.discordId)
        setUserPermission(access.permission)
        
        // Check if user can transfer the current patient
        const transferAllowed = await checkCanTransferPatient(incidentId, patientLetter, user.discordId)
        setCanTransfer(transferAllowed)
      }
    }
    checkPermission()
  }, [incidentId, patientLetter])

  const [currentPage, setCurrentPage] = useState(1)
  const [formData, setFormData] = useState({
    pastMedicalHistory: '',
    medications: '',
    allergies: '',
    lastOralIntake: '',
    lastOralIntakeTime: ''
  })

  const [showTimePicker, setShowTimePicker] = useState(false)
  const [pickerHour, setPickerHour] = useState(12)
  const [pickerMinute, setPickerMinute] = useState(0)

  // Canvas state for page 2
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedInjury, setSelectedInjury] = useState('Abrasion')
  // Drawing state declarations are at the top of the function

  const injuryTypes = [
    'Abrasion', 'Amputation/degloving',
    'Burn', 'Contusion',
    'Dislocation', 'Foreign Body',
    'Fracture-Closed', 'Fracture-Open',
    'Haemorrhage', 'Laceration',
    'Numbness', 'Pain',
    'Rash', 'Swelling',
    'Tenderness', 'Weakness'
  ]

  // Load patient letter on mount
  useEffect(() => {
    if (incidentId) {
      setPatientLetter(getCurrentPatientLetter(incidentId))
    }
  }, [incidentId])

  // Load saved data on mount
  useEffect(() => {
    if (incidentId) {
      const saved = localStorage.getItem(`past_medical_history_${incidentId}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setFormData(parsed.formData || parsed)
          if (parsed.drawnLines) {
            setDrawnLines(parsed.drawnLines)
            setHistory([[], ...parsed.drawnLines.map((_: DrawnLine, i: number) => parsed.drawnLines.slice(0, i + 1))])
            setHistoryIndex(parsed.drawnLines.length)
          }
        } catch (e) {
          console.error('Failed to parse saved data:', e)
        }
      }
    }
  }, [incidentId])

  // Save data whenever it changes
  useEffect(() => {
    if (incidentId) {
      localStorage.setItem(`past_medical_history_${incidentId}`, JSON.stringify({
        formData,
        drawnLines
      }))
    }
  }, [formData, drawnLines, incidentId])

  const handleLogout = () => {
    clearCurrentUser()
    router.replace('/')
  }

  const handleHome = () => {
    const params = new URLSearchParams({ fleetId })
    router.push(`/dashboard?${params}`)
  }

  const handleAdminPanel = () => {
    const user = getCurrentUser()
    if (user && isAdmin(user.discordId)) {
      router.push('/admin')
    }
  }

  const handleTransferClick = () => {
    setShowTransferModal(true)
  }

  const handleTransferComplete = (targetUser: any) => {
    const { transferAllPatients } = require('../utils/eprfHistoryService')
    transferAllPatients(incidentId, targetUser.discordId, targetUser.callsign)
    
    setShowTransferModal(false)
    setSuccessMessage({
      title: 'ePRF Transferred',
      message: `The ePRF has been transferred to ${targetUser.callsign}. You will be redirected to the dashboard.`
    })
    setShowSuccessModal(true)
    setTimeout(() => {
      handleHome()
    }, 2000)
  }

  const navigateTo = (section: string) => {
    const params = new URLSearchParams({ id: incidentId, fleetId })
    if (section === 'incident') router.push(`/incident?${params}`)
    else if (section === 'patient-info') router.push(`/patient-info?${params}`)
    else if (section === 'primary-survey') router.push(`/primary-survey?${params}`)
    else if (section === 'vital-obs') router.push(`/vital-obs?${params}`)
    else if (section === 'hx-complaint') router.push(`/hx-complaint?${params}`)
    else if (section === 'past-medical-history') router.push(`/past-medical-history?${params}`)
    else if (section === 'clinical-impression') router.push(`/clinical-impression?${params}`)
    else if (section === 'disposition') router.push(`/disposition?${params}`)
    else if (section === 'media') router.push(`/media?${params}`)
  }

  const handlePrevious = () => {
    if (currentPage === 2) {
      setCurrentPage(1)
    } else {
      navigateTo('hx-complaint')
    }
  }

  const handleNext = () => {
    if (currentPage === 1) {
      setCurrentPage(2)
    } else {
      const params = new URLSearchParams({ id: incidentId, fleetId })
      router.push(`/clinical-impression?${params}`)
    }
  }

  const handleSubmitEPRF = () => {
    const result = validateAllSections(incidentId)
    setIncompleteSections(result.incompleteSections)
    
    if (result.isValid) {
      setShowSubmitModal(true)
    } else {
      setValidationErrors(result.fieldErrors)
      setShowValidationErrorModal(true)
    }
  }

  const confirmSubmitEPRF = async () => {
    setIsSubmitting(true)
    try {
      const result = await submitEPRFService(incidentId, fleetId)
      
      if (result.success) {
        setShowSubmitModal(false)
        setSuccessMessage({
          title: 'ePRF Submitted Successfully!',
          message: `The ePRF for Patient ${patientLetter} has been submitted.\n\nA PDF copy has been downloaded to your device and the record has been saved.`
        })
        setShowSuccessModal(true)
      } else if (result.validationResult) {
        setShowSubmitModal(false)
        setValidationErrors(result.validationResult.fieldErrors)
        setIncompleteSections(result.validationResult.incompleteSections)
        setShowValidationErrorModal(true)
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('An error occurred while submitting. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddPatientClick = () => {
    setShowAddPatientModal(true)
  }

  const confirmAddPatient = async () => {
    setIsSubmitting(true)
    try {
      const result = await addPatientService(incidentId)
      
      if (result.success) {
        setShowAddPatientModal(false)
        setPatientLetter(result.newLetter)
        setSuccessMessage({
          title: 'Patient Added Successfully!',
          message: `Patient ${patientLetter} has been saved.\n\nYou are now working on Patient ${result.newLetter}.\n\nThe form has been cleared for the new patient.`
        })
        setShowSuccessModal(true)
        
        setTimeout(() => {
          const params = new URLSearchParams({ id: incidentId, fleetId })
          router.push(`/patient-info?${params}`)
        }, 2000)
      } else {
        alert(result.error || 'Failed to add patient')
      }
    } catch (error) {
      console.error('Add patient error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasFieldError = (field: string) => {
    return incompleteSections.includes('past-medical-history') && (
      (field === 'pastMedicalHistory' && !formData.pastMedicalHistory) ||
      (field === 'medications' && !formData.medications) ||
      (field === 'allergies' && !formData.allergies) ||
      (field === 'lastOralIntake' && !formData.lastOralIntake)
    )
  }

  const handleRadioChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const openTimePicker = () => {
    const now = new Date()
    setPickerHour(now.getHours())
    setPickerMinute(now.getMinutes())
    setShowTimePicker(true)
  }

  const handleSetTimeNow = () => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    setFormData(prev => ({ ...prev, lastOralIntakeTime: `${hours}:${minutes}` }))
  }

  const handleSetTime = () => {
    const formatted = `${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`
    setFormData(prev => ({ ...prev, lastOralIntakeTime: formatted }))
    setShowTimePicker(false)
  }

  // Canvas drawing functions
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(canvas.width / 2 + canvasOffset.x, canvas.height / 2 + canvasOffset.y)
    ctx.scale(zoom, zoom)

    // Draw body figure (simple SVG-like path)
    ctx.strokeStyle = '#d4b896'
    ctx.fillStyle = '#f5dcc4'
    ctx.lineWidth = 2

    // Head
    ctx.beginPath()
    ctx.ellipse(0, -180, 25, 30, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Neck
    ctx.beginPath()
    ctx.moveTo(-10, -150)
    ctx.lineTo(-10, -135)
    ctx.lineTo(10, -135)
    ctx.lineTo(10, -150)
    ctx.fill()
    ctx.stroke()

    // Torso
    ctx.beginPath()
    ctx.moveTo(-35, -135)
    ctx.lineTo(-40, -50)
    ctx.lineTo(-35, 30)
    ctx.lineTo(-20, 50)
    ctx.lineTo(20, 50)
    ctx.lineTo(35, 30)
    ctx.lineTo(40, -50)
    ctx.lineTo(35, -135)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Left arm
    ctx.beginPath()
    ctx.moveTo(-35, -130)
    ctx.lineTo(-55, -120)
    ctx.lineTo(-70, -70)
    ctx.lineTo(-75, 0)
    ctx.lineTo(-70, 50)
    ctx.lineTo(-60, 55)
    ctx.lineTo(-55, 50)
    ctx.lineTo(-50, 0)
    ctx.lineTo(-45, -60)
    ctx.lineTo(-40, -110)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Right arm
    ctx.beginPath()
    ctx.moveTo(35, -130)
    ctx.lineTo(55, -120)
    ctx.lineTo(70, -70)
    ctx.lineTo(75, 0)
    ctx.lineTo(70, 50)
    ctx.lineTo(60, 55)
    ctx.lineTo(55, 50)
    ctx.lineTo(50, 0)
    ctx.lineTo(45, -60)
    ctx.lineTo(40, -110)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Left leg
    ctx.beginPath()
    ctx.moveTo(-20, 50)
    ctx.lineTo(-25, 100)
    ctx.lineTo(-25, 180)
    ctx.lineTo(-30, 210)
    ctx.lineTo(-15, 215)
    ctx.lineTo(-10, 210)
    ctx.lineTo(-10, 180)
    ctx.lineTo(-5, 100)
    ctx.lineTo(-5, 50)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Right leg
    ctx.beginPath()
    ctx.moveTo(20, 50)
    ctx.lineTo(25, 100)
    ctx.lineTo(25, 180)
    ctx.lineTo(30, 210)
    ctx.lineTo(15, 215)
    ctx.lineTo(10, 210)
    ctx.lineTo(10, 180)
    ctx.lineTo(5, 100)
    ctx.lineTo(5, 50)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.restore()

    // Draw all saved lines
    drawnLines.forEach(line => {
      if (line.points.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = '#cc0000'
        ctx.lineWidth = 2
        ctx.moveTo(line.points[0].x, line.points[0].y)
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y)
        }
        ctx.stroke()

        // Draw label at start of line with no background
        ctx.font = 'bold 11px Segoe UI, Tahoma, sans-serif'
        ctx.letterSpacing = '1px'
        const labelX = line.labelPosition.x + 5
        const labelY = line.labelPosition.y - 5
        
        // Draw text with slight shadow for readability
        ctx.fillStyle = '#660000'
        ctx.fillText(line.label, labelX + 1, labelY + 1)
        ctx.fillStyle = '#cc0000'
        ctx.fillText(line.label, labelX, labelY)
      }
    })

    // Draw current line being drawn
    if (currentLine.length >= 1) {
      // Draw label immediately at the first click point
      ctx.font = 'bold 11px Segoe UI, Tahoma, sans-serif'
      ctx.letterSpacing = '1px'
      const labelX = currentLine[0].x + 5
      const labelY = currentLine[0].y - 5
      
      // Draw text with slight shadow for readability
      ctx.fillStyle = '#660000'
      ctx.fillText(selectedInjury, labelX + 1, labelY + 1)
      ctx.fillStyle = '#cc0000'
      ctx.fillText(selectedInjury, labelX, labelY)
      
      // Draw the line if there are more points
      if (currentLine.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = '#cc0000'
        ctx.lineWidth = 2
        ctx.moveTo(currentLine[0].x, currentLine[0].y)
        for (let i = 1; i < currentLine.length; i++) {
          ctx.lineTo(currentLine[i].x, currentLine[i].y)
        }
        ctx.stroke()
      }
    }
  }, [canvasOffset, zoom, drawnLines, currentLine, selectedInjury])

  useEffect(() => {
    if (currentPage === 2) {
      drawCanvas()
    }
  }, [currentPage, drawCanvas])

  // Keyboard navigation and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentPage !== 2) return
      
      // Handle Ctrl key combinations
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault()
            handleUndo()
            break
          case 'y':
            e.preventDefault()
            handleRedo()
            break
          case 'enter':
            e.preventDefault()
            handleClear()
            break
          case ' ':
            e.preventDefault()
            handleCenter()
            break
        }
        return
      }
      
      // Zoom shortcuts (no modifier needed)
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        handleZoomIn()
        return
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        handleZoomOut()
        return
      }
      
      // Arrow key navigation (without Ctrl)
      const step = 20
      switch (e.key) {
        case 'ArrowUp':
          setCanvasOffset(prev => ({ ...prev, y: prev.y - step }))
          break
        case 'ArrowDown':
          setCanvasOffset(prev => ({ ...prev, y: prev.y + step }))
          break
        case 'ArrowLeft':
          setCanvasOffset(prev => ({ ...prev, x: prev.x - step }))
          break
        case 'ArrowRight':
          setCanvasOffset(prev => ({ ...prev, x: prev.x + step }))
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, historyIndex, history])

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    setIsSubmitting(true)
    submitEPRFService(incidentId, fleetId)
      .then(result => {
        if (result.success) {
          setShowSubmitModal(false)
          router.push('/dashboard')
        } else if (result.validationResult) {
          setShowSubmitModal(false)
          setValidationErrors(result.validationResult.fieldErrors)
          setIncompleteSections(result.validationResult.incompleteSections)
          setShowValidationErrorModal(true)
        }
      })
      .catch(error => {
        console.error('Submit error:', error)
        alert('An error occurred while submitting. Please try again.')
      })
      .finally(() => {
        setIsSubmitting(false)
      })
      // Drawing logic removed: 'newLine' is not defined in this scope
    }
    setIsDrawing(false)
    setCurrentLine([])
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5))
  const handleMoveUp = () => setCanvasOffset(prev => ({ ...prev, y: prev.y - 30 }))
  const handleMoveDown = () => setCanvasOffset(prev => ({ ...prev, y: prev.y + 30 }))
  const handleMoveLeft = () => setCanvasOffset(prev => ({ ...prev, x: prev.x - 30 }))
  const handleMoveRight = () => setCanvasOffset(prev => ({ ...prev, x: prev.x + 30 }))
  const handleCenter = () => setCanvasOffset({ x: 0, y: 0 })
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      setDrawnLines(history[historyIndex - 1])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      setDrawnLines(history[historyIndex + 1])
    }
  }

  const handleClear = () => {
    setDrawnLines([])
    setHistory([[]])
    setHistoryIndex(0)
  }

  return (
    <div className="eprf-dashboard incident-page">
      <style jsx>{`
        .form-row {
          display: flex;
          gap: 30px;
          margin-bottom: 20px;
          align-items: flex-start;
        }
        
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .field-label {
          color: #1a3a5c;
          font-size: 14px;
          font-weight: 500;
        }
        
        .field-label.required::after {
          content: '*';
          color: #cc0000;
          margin-left: 2px;
        }
        
        .radio-group {
          display: flex;
          gap: 40px;
          align-items: center;
        }
        
        .radio-option {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1a3a5c;
          font-size: 14px;
          cursor: pointer;
        }
        
        .radio-option input[type="radio"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .time-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .time-label-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .now-btn {
          padding: 4px 16px;
          background: linear-gradient(to bottom, #c0c0c0, #a0a0a0);
          border: 1px solid #808080;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          color: #333;
        }
        
        .now-btn:hover {
          background: linear-gradient(to bottom, #d0d0d0, #b0b0b0);
        }
        
        .time-input {
          width: 200px;
          padding: 8px 12px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          font-size: 14px;
          background: linear-gradient(to bottom, #c8d8e8, #a8c0d8);
          cursor: pointer;
        }
        
        .time-input:focus {
          outline: none;
          border-color: #5a8ab8;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal {
          background: #5a7ca5;
          border: 2px solid #2d4a6c;
          border-radius: 5px;
          padding: 20px;
          min-width: 300px;
        }
        
        .modal-title {
          color: white;
          font-size: 16px;
          margin-bottom: 15px;
          text-align: center;
        }
        
        .picker-row {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 15px;
        }
        
        .picker-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        
        .picker-label {
          color: white;
          font-size: 12px;
        }
        
        .picker-input {
          width: 60px;
          padding: 8px;
          text-align: center;
          font-size: 16px;
          border: 1px solid #2d4a6c;
          border-radius: 3px;
        }
        
        .modal-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        
        .modal-btn {
          padding: 8px 20px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .modal-btn.ok {
          background: linear-gradient(to bottom, #4a9c4a, #3a8c3a);
          color: white;
          border: 1px solid #2a6c2a;
        }
        
        .modal-btn.cancel {
          background: linear-gradient(to bottom, #c0c0c0, #a0a0a0);
          color: #333;
          border: 1px solid #808080;
        }

        /* Page 2 Canvas styles */
        .canvas-container {
          display: flex;
          gap: 20px;
          height: calc(100vh - 200px);
        }

        .canvas-left {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .canvas-toolbar {
           display: flex;
           gap: 20px;
           padding: 12px 20px;
           background: linear-gradient(to bottom, #4a6a8c, #3a5a7c);
           border-radius: 5px;
           align-items: center;
           justify-content: center;
           flex-wrap: nowrap;
        }

        .toolbar-btn {
          width: 32px;
          height: 32px;
          background: linear-gradient(to bottom, #5a7a9c, #4a6a8c);
          border: 1px solid #2d4a6c;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .toolbar-btn:hover {
          background: linear-gradient(to bottom, #6a8aac, #5a7a9c);
        }



        .canvas-wrapper {
          flex: 1;
          background: white;
          border-radius: 5px;
          overflow: hidden;
          position: relative;
        }

        .body-canvas {
          width: 100%;
          height: 100%;
          cursor: crosshair;
        }

        .navigation-toolbar {
          display: flex;
          gap: 8px;
          padding: 8px 12px;
          background: linear-gradient(to bottom, #4a6a8c, #3a5a7c);
          border-radius: 5px;
          justify-content: space-evenly;
        }

        .nav-arrow-btn {
          width: 36px;
          height: 36px;
          background: linear-gradient(to bottom, #5a7a9c, #4a6a8c);
          border: 1px solid #2d4a6c;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .nav-arrow-btn:hover {
          background: linear-gradient(to bottom, #6a8aac, #5a7a9c);
        }

        .injury-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          flex: 1;
        }

        .injury-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 15px;
          background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
          border: 1px solid #c0c0c0;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          color: #333;
        }

        .injury-option:hover {
          background: linear-gradient(to bottom, #e8e8e8, #d8d8d8);
        }

        .injury-option.selected {
          background: linear-gradient(to bottom, #6a8aac, #5a7a9c);
          color: white;
          border-color: #3a5a7c;
        }

        .injury-option input[type="radio"] {
          width: 16px;
          height: 16px;
        }
      `}</style>

      <div className="eprf-nav">
        <button className="nav-btn" onClick={handleHome}>Home</button>
        <button className="nav-btn" onClick={() => setShowPatientManagementModal(true)}>Manage Patients</button>
        <button className="nav-btn" onClick={() => setShowValidationErrorModal(true)}>History</button>
        <button className="nav-btn chat-btn" onClick={() => setShowChat(!showChat)} title="Chat" style={{ position: 'relative' }}>
          Chat
          {chatUnreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: 12,
              height: 12,
              background: 'red',
              borderRadius: '50%',
              display: 'inline-block',
              border: '2px solid white',
              zIndex: 2
            }}></span>
          )}
        </button>
        <button className="nav-btn" onClick={handleAdminPanel}>Admin Panel</button>
        <button className="nav-btn" onClick={handleLogout}>Logout</button>
        {incidentId && patientLetter && (
          <PresenceIndicator 
            incidentId={incidentId}
            patientLetter={patientLetter}
            userDiscordId={getCurrentUser()?.discordId || ''}
            userCallsign={getCurrentUser()?.callsign || ''}
            pageName="past-medical-history"
          />
        )}
        <div className="page-counter">
          <span className="patient-letter">{patientLetter}</span>
          <span className="page-indicator">{currentPage} of 2</span>
        </div>
      </div>

      <div className="incident-layout">
        <aside className="sidebar">
          <button className={`sidebar-btn${incompleteSections.includes('incident') ? ' incomplete' : ''}`} onClick={() => navigateTo('incident')}>Incident Information</button>
          <button className={`sidebar-btn${incompleteSections.includes('patient-info') ? ' incomplete' : ''}`} onClick={() => navigateTo('patient-info')}>Patient Information</button>
          <button className={`sidebar-btn${incompleteSections.includes('primary-survey') ? ' incomplete' : ''}`} onClick={() => navigateTo('primary-survey')}>Primary Survey</button>
          <button className={`sidebar-btn${incompleteSections.includes('vital-obs') ? ' incomplete' : ''}`} onClick={() => navigateTo('vital-obs')}>Vital Obs / Treat</button>
          <button className={`sidebar-btn${incompleteSections.includes('hx-complaint') ? ' incomplete' : ''}`} onClick={() => navigateTo('hx-complaint')}>Hx Complaint</button>
          <button className={`sidebar-btn active${incompleteSections.includes('past-medical-history') ? ' incomplete' : ''}`}>Past Medical History</button>
          <button className={`sidebar-btn${incompleteSections.includes('clinical-impression') ? ' incomplete' : ''}`} onClick={() => navigateTo('clinical-impression')}>Clinical Impression</button>
          <button className={`sidebar-btn${incompleteSections.includes('disposition') ? ' incomplete' : ''}`} onClick={() => navigateTo('disposition')}>Disposition</button>
          <button className="sidebar-btn" onClick={() => navigateTo('media')}>Media</button>
        </aside>

        <main className="incident-content">
          {currentPage === 1 && (
            <>
          {/* Past medical history */}
          <div className="form-row" style={{ marginBottom: '25px' }}>
            <div className="form-field">
              <label className={`field-label required ${hasFieldError('pastMedicalHistory') ? 'validation-error-label' : ''}`}>Past medical history</label>
              <div className={`radio-group ${hasFieldError('pastMedicalHistory') ? 'validation-error-radio' : ''}`}>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="pastMedicalHistory"
                    value="None"
                    checked={formData.pastMedicalHistory === 'None'}
                    onChange={(e) => handleRadioChange('pastMedicalHistory', e.target.value)}
                  />
                  None
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="pastMedicalHistory"
                    value="Unknown"
                    checked={formData.pastMedicalHistory === 'Unknown'}
                    onChange={(e) => handleRadioChange('pastMedicalHistory', e.target.value)}
                  />
                  Unknown
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="pastMedicalHistory"
                    value="Referral letter"
                    checked={formData.pastMedicalHistory === 'Referral letter'}
                    onChange={(e) => handleRadioChange('pastMedicalHistory', e.target.value)}
                  />
                  Referral letter
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="pastMedicalHistory"
                    value="Other"
                    checked={formData.pastMedicalHistory === 'Other'}
                    onChange={(e) => handleRadioChange('pastMedicalHistory', e.target.value)}
                  />
                  Other
                </label>
              </div>
            </div>
          </div>

          {/* Medications */}
          <div className="form-row" style={{ marginBottom: '25px' }}>
            <div className="form-field">
              <label className={`field-label required ${hasFieldError('medications') ? 'validation-error-label' : ''}`}>Medications</label>
              <div className={`radio-group ${hasFieldError('medications') ? 'validation-error-radio' : ''}`}>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="medications"
                    value="None"
                    checked={formData.medications === 'None'}
                    onChange={(e) => handleRadioChange('medications', e.target.value)}
                  />
                  None
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="medications"
                    value="Unknown"
                    checked={formData.medications === 'Unknown'}
                    onChange={(e) => handleRadioChange('medications', e.target.value)}
                  />
                  Unknown
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="medications"
                    value="Medication"
                    checked={formData.medications === 'Medication'}
                    onChange={(e) => handleRadioChange('medications', e.target.value)}
                  />
                  Medication
                </label>
              </div>
            </div>
          </div>

          {/* Allergies */}
          <div className="form-row" style={{ marginBottom: '25px' }}>
            <div className="form-field">
              <label className={`field-label required ${hasFieldError('allergies') ? 'validation-error-label' : ''}`}>Allergies</label>
              <div className={`radio-group ${hasFieldError('allergies') ? 'validation-error-radio' : ''}`}>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="allergies"
                    value="NKA"
                    checked={formData.allergies === 'NKA'}
                    onChange={(e) => handleRadioChange('allergies', e.target.value)}
                  />
                  NKA
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="allergies"
                    value="Unknown"
                    checked={formData.allergies === 'Unknown'}
                    onChange={(e) => handleRadioChange('allergies', e.target.value)}
                  />
                  Unknown
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="allergies"
                    value="Allergies"
                    checked={formData.allergies === 'Allergies'}
                    onChange={(e) => handleRadioChange('allergies', e.target.value)}
                  />
                  Allergies
                </label>
              </div>
            </div>
          </div>

          {/* Last oral intake */}
          <div className="form-row" style={{ marginBottom: '25px' }}>
            <div className="form-field">
              <label className={`field-label required ${hasFieldError('lastOralIntake') ? 'validation-error-label' : ''}`}>Last oral intake</label>
              <div className={`radio-group ${hasFieldError('lastOralIntake') ? 'validation-error-radio' : ''}`} style={{ alignItems: 'center' }}>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="lastOralIntake"
                    value="Unknown"
                    checked={formData.lastOralIntake === 'Unknown'}
                    onChange={(e) => handleRadioChange('lastOralIntake', e.target.value)}
                  />
                  Unknown
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="lastOralIntake"
                    value="Other"
                    checked={formData.lastOralIntake === 'Other'}
                    onChange={(e) => handleRadioChange('lastOralIntake', e.target.value)}
                  />
                  Other
                </label>
                <label className="radio-option" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="radio"
                    name="lastOralIntake"
                    value="Filled"
                    checked={formData.lastOralIntake === 'Filled'}
                    onChange={(e) => handleRadioChange('lastOralIntake', e.target.value)}
                  />
                  Filled
                </label>
                {formData.lastOralIntake === 'Filled' && (
                  <div className="time-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '15px' }}>
                    <label className="field-label" style={{ marginBottom: 0 }}>Time:</label>
                    <input
                      type="text"
                      className="time-input"
                      value={formData.lastOralIntakeTime}
                      onClick={openTimePicker}
                      readOnly
                      placeholder=""
                      style={{ width: '80px' }}
                    />
                    <button className="now-btn" onClick={handleSetTimeNow}>Now</button>
                  </div>
                )}
              </div>
            </div>
          </div>
            </>
          )}

          {currentPage === 2 && (
            <div className="canvas-container">
              <div className="canvas-left">
                <div className="canvas-toolbar">
                  <button className="toolbar-btn" onClick={handleZoomIn} title="Zoom In">🔍+</button>
                  <button className="toolbar-btn" onClick={handleZoomOut} title="Zoom Out">🔍-</button>
                  <button className="toolbar-btn" onClick={handleUndo} title="Undo">↩</button>
                  <button className="toolbar-btn" onClick={handleRedo} title="Redo">↪</button>
                  <button className="toolbar-btn" onClick={handleClear} title="Clear">🔄</button>
                </div>

                <div className="canvas-wrapper">
                  <canvas
                    ref={canvasRef}
                    className="body-canvas"
                    width={400}
                    height={500}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  />
                </div>

                <div className="navigation-toolbar">
                  <button className="nav-arrow-btn" onClick={handleMoveUp} title="Move Up">⬆</button>
                  <button className="nav-arrow-btn" onClick={handleMoveDown} title="Move Down">⬇</button>
                  <button className="nav-arrow-btn" onClick={handleCenter} title="Center">⬜</button>
                  <button className="nav-arrow-btn" onClick={handleMoveLeft} title="Move Left">⬅</button>
                  <button className="nav-arrow-btn" onClick={handleMoveRight} title="Move Right">➡</button>
                </div>
              </div>

              <div className="injury-list">
                {injuryTypes.map((injury) => (
                  <label
                    key={injury}
                    className={`injury-option ${selectedInjury === injury ? 'selected' : ''}`}
                    onClick={() => setSelectedInjury(injury)}
                  >
                    <input
                      type="radio"
                      name="injury"
                      value={injury}
                      checked={selectedInjury === injury}
                      onChange={() => setSelectedInjury(injury)}
                    />
                    {injury}
                  </label>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <div className="eprf-footer incident-footer">
        <ConnectionStatus />
        <div className="footer-left">
          <button className="footer-btn discovery" onClick={handleAddPatientClick}>Add Patient</button>
          <button 
            className={`footer-btn green ${!canTransfer ? 'disabled' : ''}`} 
            onClick={handleTransferClick}
            disabled={!canTransfer}
            title={!canTransfer ? 'Only the incident owner or patient owner can transfer' : ''}
          >
            Transfer Patient
          </button>
          <button className="footer-btn green" onClick={handleSubmitEPRF}>Submit ePRF</button>
        </div>
        <div className="footer-right">
          <button className="footer-btn orange" onClick={handlePrevious}>{"< Previous"}</button>
          <button className="footer-btn orange" onClick={handleNext}>{"Next >"}</button>
        </div>
      </div>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <div className="modal-overlay" onClick={() => setShowTimePicker(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Select Time</div>
            <div className="picker-row">
              <div className="picker-column">
                <label className="picker-label">Hour</label>
                <input
                  type="number"
                  className="picker-input"
                  min="0"
                  max="23"
                  value={pickerHour}
                  onChange={(e) => setPickerHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                />
              </div>
              <div className="picker-column">
                <label className="picker-label">Minute</label>
                <input
                  type="number"
                  className="picker-input"
                  min="0"
                  max="59"
                  value={pickerMinute}
                  onChange={(e) => setPickerMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                />
              </div>
            </div>
            <div className="modal-buttons">
              <button className="modal-btn ok" onClick={handleSetTime}>OK</button>
              <button className="modal-btn cancel" onClick={() => setShowTimePicker(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        onConfirm={confirmAddPatient}
        title="Add New Patient"
        message={`Are you sure you want to save Patient ${patientLetter} and start a new patient record?\n\nThis will:\n• Save all current patient data\n• Create a new patient record (Patient ${String.fromCharCode(patientLetter.charCodeAt(0) + 1)})\n• Clear the form for the new patient`}
        confirmText="Yes, Add Patient"
        cancelText="Cancel"
        type="info"
        isLoading={isSubmitting}
      />

      <ConfirmationModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={confirmSubmitEPRF}
        title="Submit ePRF"
        message={`Are you sure you want to submit the ePRF for Patient ${patientLetter}?\n\nThis will:\n• Generate a PDF copy for your records\n• Submit the data to the server`}
        confirmText="Yes, Submit ePRF"
        cancelText="Cancel"
        type="success"
        isLoading={isSubmitting}
      />

      <ValidationErrorModal
        isOpen={showValidationErrorModal}
        onClose={() => setShowValidationErrorModal(false)}
        errors={validationErrors}
        getSectionDisplayName={getSectionDisplayName}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successMessage.title}
        message={successMessage.message}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransferComplete={handleTransferComplete}
        incidentId={incidentId}
        patientLetter={patientLetter}
      />

      <PatientManagementModal
        isOpen={showPatientManagementModal}
        onClose={() => setShowPatientManagementModal(false)}
        incidentId={incidentId}
        fleetId={fleetId}
        onPatientSwitch={(letter) => {
          setPatientLetter(letter)
          const params = new URLSearchParams({ id: incidentId, fleetId })
          router.push(`/past-medical-history?${params}`)
        }}
        onPatientAdded={(newLetter, previousLetter) => {
          setPatientLetter(newLetter)
          setSuccessMessage({
            title: 'Patient Added Successfully!',
            message: `Patient ${previousLetter} has been saved.\n\nYou are now working on Patient ${newLetter}.\n\nThe form has been cleared for the new patient.`
          })
          setShowSuccessModal(true)
          setTimeout(() => {
            const params = new URLSearchParams({ id: incidentId, fleetId })
            router.push(`/patient-info?${params}`)
          }, 2000)
        }}
      />

      <ManageCollaboratorsModal
        isOpen={showCollaboratorsModal}
        onClose={() => setShowCollaboratorsModal(false)}
        incidentId={incidentId}
        currentUserPermission={userPermission || 'view'}
      />
      {/* Chat Widget */}
      {currentUser && (
        <ChatWidget
          incidentId={incidentId}
          discordId={currentUser.discordId}
          callsign={currentUser.callsign}
          patientLetter={patientLetter}
          onUnreadChange={setChatUnreadCount}
          isOpen={showChat}
        />
      )}
    </div>
  );
