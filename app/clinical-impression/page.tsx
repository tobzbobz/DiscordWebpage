import ChatStrip from '../components/ChatStrip';
"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { validateAllSections, getSectionDisplayName } from '../utils/validation'
import { handleAddPatient as addPatientService, handleSubmitEPRF as submitEPRFService, getCurrentPatientLetter } from '../utils/eprfService'
import ConfirmationModal, { ValidationErrorModal, SuccessModal } from '../components/ConfirmationModal'
import TransferModal from '../components/TransferModal'
import PatientManagementModal from '../components/PatientManagementModal'
import ManageCollaboratorsModal from '../components/ManageCollaboratorsModal'
import ConnectionStatus from '../components/ConnectionStatus'
import PresenceIndicator from '../components/PresenceIndicator'
import { getCurrentUser, clearCurrentUser } from '../utils/userService'
import ChatStrip from '../components/ChatStrip';
import { checkEPRFAccess, checkCanTransferPatient, PermissionLevel, canManageCollaborators } from '../utils/apiClient'

export const runtime = 'edge'

export default function ClinicalImpressionPage() {
    // ...existing code...
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
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showPatientManagementModal, setShowPatientManagementModal] = useState(false)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [validationErrorsData, setValidationErrorsData] = useState<{[section: string]: string[]}>({})
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

  const [formData, setFormData] = useState({
    primaryClinicalImpression: '',
    secondaryClinicalImpression: '',
    clinicalImpressionNotes: ''
  })

  const [showPrimaryDropdown, setShowPrimaryDropdown] = useState(false)
  const [showSecondaryDropdown, setShowSecondaryDropdown] = useState(false)
  const [primarySearchQuery, setPrimarySearchQuery] = useState('')
  const [secondarySearchQuery, setSecondarySearchQuery] = useState('')
  const [listSearchQuery, setListSearchQuery] = useState('')
  const [showListModal, setShowListModal] = useState(false)
  const [listField, setListField] = useState<'primary' | 'secondary'>('primary')

  const primaryInputRef = useRef<HTMLInputElement>(null)
  const secondaryInputRef = useRef<HTMLInputElement>(null)

  // Complete clinical impressions list from screenshots
  const clinicalImpressions = [
    'Abdominal aortic aneurysm',
    'Abdominal distension',
    'Abdominal mass',
    'Abdominal pain - cause unknown',
    'Abdominal pain (ACC & MED)',
    'Abdominal pain in pregnancy',
    'Abnormal behaviour',
    'Abnormal gait',
    'Abnormal involuntary movement',
    'Abnormal vision',
    'Abrasion',
    'Abrasion of abdominal wall (ACC)',
    'Abrasion of ankle (ACC)',
    'Abrasion of back (ACC)',
    'Abrasion of buttock (ACC)',
    'Abrasion of chest wall (ACC)',
    'Abrasion of face (ACC)',
    'Abrasion of finger (ACC)',
    'Abrasion of flank (ACC)',
    'Abrasion of foot (ACC)',
    'Abrasion of forearm area (ACC)',
    'Abrasion of hand (ACC)',
    'Abrasion of head &or neck (ACC)',
    'Abrasion of hip (ACC)',
    'Abrasion of knee (ACC)',
    'Abrasion of lower leg (ACC)',
    'Abrasion of multiple fingers (ACC)',
    'Abrasion of scalp (ACC)',
    'Abrasion of shoulder (ACC)',
    'Abrasion of thigh (ACC)',
    'Abrasion of toe(s) (ACC)',
    'Abrasion of trunk (ACC)',
    'Abrasion of upper arm (ACC)',
    'Abscess',
    'Abscess of ankle',
    'Abscess of back except buttock',
    'Abscess of buttock',
    'Abscess of chest wall',
    'Abscess of ear',
    'Abscess of elbow',
    'Abscess of eye',
    'Abscess of face',
    'Abscess of finger(s)',
    'Abscess of flank',
    'Abscess of foot',
    'Abscess of forearm',
    'Abscess of groin',
    'Abscess of hand',
    'Abscess of hip',
    'Abscess of jaw',
    'Abscess of knee',
    'Abscess of lip',
    'Abscess of lower leg',
    'Abscess of neck',
    'Abscess of nose',
    'Abscess of shoulder',
    'Abscess of thigh',
    'Abscess of toe',
    'Abscess of tongue',
    'Abscess of upper arm',
    'Abscess of wrist',
    'Accidental poisoning by drug (ACC)',
    'Accidental poisoning by substance other than drug (ACC)',
    'Accidental removal of catheter',
    'Acute confusion',
    'Acute drug intoxication',
    'Acute low back pain',
    'Acute myocardial infarction of anterior wall',
    'Acute myocardial infarction of anterolateral wall',
    'Acute myocardial infarction of inferior wall',
    'Acute myocardial infarction of inferolateral wall',
    'Acute myocardial infarction of inferoposterior wall',
    'Acute myocardial infarction of septum',
    'Acute pain',
    'Acute pelvic pain (ACC and MED)',
    'Adverse reaction to drug',
    'Agitated state',
    'Alcohol abuse',
    'Alcohol intoxication',
    'Allergic contact dermatitis',
    'Allergic reaction to drug (ACC)',
    'Allergic reaction to food (ACC)',
    'Allergy',
    'Altered sensation',
    'Amnesia',
    'Amputation',
    'Amputation of ear (ACC)',
    'Amputation of finger (ACC)',
    'Amputation of foot (ACC)',
    'Amputation of hand (ACC)',
    'Amputation of limb (ACC)',
    'Amputation of thumb (ACC)',
    'Amputation of toe (ACC)',
    'Anaphylaxis',
    'Angina',
    'Angio-oedema',
    'Animal bite',
    'Antepartum haemorrhage',
    'Anterior chest wall pain (ACC & MED)',
    'Anxiety',
    'Aphasia',
    'Apnoea',
    'Appendicitis',
    'Arthritis',
    'Asphyxiation',
    'Aspiration of food (ACC)',
    'Aspiration pneumonia (ACC & MED)',
    'Assault (ACC)',
    'Asthma',
    'At risk for falls',
    'At risk for suicide',
    'Atrial fibrillation',
    'Atrial flutter',
    'Atrial tachycardia',
    'Atypical chest pain',
    'Avulsion',
    'Avulsion of eye (ACC)',
    'Avulsion of scalp (ACC)',
    'Biliary colic',
    'Bladder pain',
    'Blocked catheter',
    'Bradycardia',
    'Breathing painful',
    'Breathing problem of unknown cause',
    'Breech presentation',
    'Bronchiectasis',
    'Burn <10% (ACC)',
    'Burn >90% (ACC)',
    'Burn 10-19% (ACC)',
    'Burn 20-29% (ACC)',
    'Burn 30-39% (ACC)',
    'Burn 40-49% (ACC)',
    'Burn 50-59% (ACC)',
    'Burn 60-69% (ACC)',
    'Burn 70-79% (ACC)',
    'Burn 80-89% (ACC)',
    'Cardiac arrest',
    'Cardiac chest pain',
    'Cardiac dysrhythmia',
    'Cardiogenic pulmonary oedema',
    'Cardiogenic shock',
    'Child at risk (ACC)',
    'Chronic arthritis',
    'Chronic back pain',
    'Chronic constipation',
    'Chronic low back pain',
    'Chronic obstructive pulmonary disease',
    'Chronic pain',
    'Collapse',
    'Collapse - cause unknown',
    'Complication occurring during labour and delivery',
    'Complication of catheter',
    'Complication of haemodialysis',
    'Complication of urinary catheter',
    'Congestive heart failure',
    'Constipation',
    'Contusion of abdominal wall (ACC)',
    'Contusion of ankle (ACC)',
    'Contusion of back (ACC)',
    'Contusion of breast (ACC)',
    'Contusion of buttock (ACC)',
    'Contusion of cheek (ACC)',
    'Contusion of chest (ACC)',
    'Contusion of chin (ACC)',
    'Contusion of clavicular area (ACC)',
    'Contusion of coccyx (ACC)',
    'Contusion of ear (ACC)',
    'Contusion of elbow (ACC)',
    'Contusion of elbow &or forearm (ACC)',
    'Contusion of eye socket (black eye) (ACC)',
    'Contusion of face (ACC)',
    'Contusion of finger (ACC)',
    'Contusion of flank (ACC)',
    'Contusion of foot (ACC)',
    'Contusion of forearm (ACC)',
    'Contusion of forehead (ACC)',
    'Contusion of genitals (ACC)',
    'Contusion of groin (ACC)',
    'Contusion of heel (ACC)',
    'Contusion of hip (ACC)',
    'Contusion of jaw (ACC)',
    'Contusion of knee (ACC)',
    'Contusion of lip (ACC)',
    'Contusion of lower back (ACC)',
    'Contusion of lower leg (ACC)',
    'Contusion of mouth (ACC)',
    'Contusion of multiple fingers (ACC)',
    'Contusion of multiple sites (ACC - describe in notes)',
    'Contusion of neck (ACC)',
    'Contusion of nose (ACC)',
    'Contusion of pelvic region (ACC)',
    'Contusion of scalp (ACC)',
    'Contusion of shoulder region (ACC)',
    'Contusion of thigh (ACC)',
    'Contusion of throat (ACC)',
    'Contusion of toe(s) (ACC)',
    'Contusion of upper arm (ACC)',
    'Contusion of wrist (ACC)',
    'Contusion of wrist &or hand (ACC)',
    'Cramp',
    'Crush injury of ankle &or foot excluding toe(s) (ACC)',
    'Crush injury of elbow &or forearm (ACC)',
    'Crush injury of hand excluding finger(s) (ACC)',
    'Crush injury of head &or neck (ACC)',
    'Crush injury of hip &or thigh (ACC)',
    'Crush injury of knee &or lower leg (ACC)',
    'Crush injury of shoulder &or upper arm (ACC)',
    'Crush injury of toe(s) (ACC)',
    'Crush injury of trunk (ACC)',
    'Crush injury of wrist &or hand (ACC)',
    'Deceased',
    'Decreased mobility',
    'Degloving injury of finger (ACC)',
    'Degloving injury of hand (ACC)',
    'Degloving injury of multiple fingers (ACC)',
    'Dehydration',
    'Dementia',
    'Dermatitis',
    'Diarrhoea',
    'Diarrhoea and vomiting',
    'Difficulty passing urine',
    'Difficulty swallowing',
    'Dislocated ankle (ACC)',
    'Dislocated elbow (ACC)',
    'Dislocated finger or thumb (ACC)',
    'Dislocated hip (ACC)',
    'Dislocated patella (ACC)',
    'Dislocated shoulder (ACC)',
    'Dislocated wrist (ACC)',
    'Dislocation',
    'Dislocations sprains and strains involving head with neck (ACC)',
    'Disorder of implantable defibrillator',
    'DKA - Diabetic ketoacidosis',
    'Drug withdrawal',
    'Dysarthria',
    'Dysphasia',
    'Dysuria',
    'Ear problem',
    'Ectopic pregnancy',
    'End of Life Care',
    'Epigastric pain',
    'Epistaxis',
    'Exacerbation of CORD',
    'Explosion (ACC)',
    'Fall (ACC)',
    'Fall minor injury',
    'Fall without injury',
    'Flank pain',
    'Foreign body in anus &or rectum (ACC)',
    'Foreign body in bladder &or urethra (ACC)',
    'Foreign body in ear (ACC)',
    'Foreign body in mouth &or oesophagus &or stomach (ACC)',
    'Foreign body in nose (ACC)',
    'Foreign body in pharynx &or larynx (ACC)',
    'Foreign body in vulva &or vagina (ACC)',
    'Foreign body on external eye (ACC)',
    'Fracture',
    'Fracture of ankle (ACC)',
    'Fracture of clavicle (ACC)',
    'Fracture of face bones (ACC)',
    'Fracture of finger(s) (ACC)',
    'Fracture of foot (ACC)',
    'Fracture of humerus (ACC)',
    'Fracture of knee (ACC)',
    'Fracture of neck of femur (ACC)',
    'Fracture of patella (ACC)',
    'Fracture of pelvis (ACC)',
    'Fracture of radius &or ulna (ACC)',
    'Fracture of ribs (ACC)',
    'Fracture of scapula (ACC)',
    'Fracture of shaft of femur (ACC)',
    'Fracture of skull (ACC)',
    'Fracture of sternum (ACC)',
    'Fracture of tibia &or fibula (ACC)',
    'Fracture of toe(s) (ACC)',
    'Fracture of wrist &or hand (ACC)',
    'Fractures involving multiple body regions (ACC)',
    'Fractures of multiple limbs (ACC)',
    'Frostbite of face (ACC)',
    'Frostbite of foot (ACC)',
    'Frostbite of hand (ACC)',
    'Gallstone',
    'Gangrene of foot',
    'Gangrene of hand',
    'Gastrointestinal bleeding',
    'Generalised aches and pains (ACC & MED)',
    'Generally unwell',
    'Haematemesis',
    'Haematoma (ACC)',
    'Haematuria',
    'Haematuria ; Blood in urine',
    'Haemoptysis',
    'Haemorrhage',
    'Haemothorax',
    'Hallucinations',
    'Hanging',
    'Hanging strangulation or suffocation of unknown intent (ACC)',
    'Headache',
    'Hearing problem',
    'Heat stroke (ACC & MED)',
    'Hernia',
    'Hernia of abdominal wall',
    'Hip pain',
    'Hyperemesis of pregnancy',
    'Hyperglycaemia',
    'Hyperkalaemia',
    'Hyperthermia',
    'Hyperventilation',
    'Hypoglycaemia',
    'Hypothermia',
    'Hypovolaemia',
    'Hypovolaemic shock (ACC & MED)',
    'Hypoxia',
    'ILI - Influenza-like illness',
    'Illness of unknown cause',
    'Incisional hernia',
    'Infected face',
    'Infected hand',
    'Infection after injection infusion transfusion or vaccination',
    'Infection of ear',
    'Infection of nail(s)',
    'Infection of obstetric surgical wound',
    'Infection of peritoneal dialysis catheter',
    'Inguinal hernia',
    'Insect sting (ACC)',
    'Intentional hanging (ACC)',
    'Intentional Poisoning',
    'Intentional poisoning by drug (ACC)',
    'Intentional poisoning by substance other than drug (ACC)',
    'Joint pain',
    'Joint swelling (ACC & MED)',
    'Labour',
    'Laceration',
    'Laceration of abdomen (ACC)',
    'Laceration of ankle (ACC)',
    'Laceration of back (ACC)',
    'Laceration of breast (ACC)',
    'Laceration of buttock (ACC)',
    'Laceration of calf (ACC)',
    'Laceration of cheek (ACC)',
    'Laceration of chest wall (ACC)',
    'Laceration of ear region (ACC)',
    'Laceration of elbow (ACC)',
    'Laceration of eye (ACC)',
    'Laceration of eye region (ACC)',
    'Laceration of eyebrow (ACC)',
    'Laceration of eyelid (ACC)',
    'Laceration of finger (ACC)',
    'Laceration of foot (ACC)',
    'Laceration of forearm (ACC)',
    'Laceration of forehead (ACC)',
    'Laceration of genitalia (ACC)',
    'Laceration of hand (ACC)',
    'Laceration of head (ACC)',
    'Laceration of head and neck (ACC)',
    'Laceration of hip (ACC)',
    'Laceration of knee (ACC)',
    'Laceration of lip (ACC)',
    'Laceration of lower leg (ACC)',
    'Laceration of neck (ACC)',
    'Laceration of nose (ACC)',
    'Laceration of shin (ACC)',
    'Laceration of shoulder (ACC)',
    'Laceration of thigh (ACC)',
    'Laceration of thumb (ACC)',
    'Laceration of toe (ACC)',
    'Laceration of upper arm (ACC)',
    'Laceration of upper limb (ACC)',
    'Laceration of wrist (ACC)',
    'Leaking abdominal aortic aneurysm',
    'Left bundle branch block',
    'Left flank pain',
    'Left hemiparesis',
    'Left iliac fossa pain',
    'Left lower quadrant pain',
    'Left pneumothorax',
    'Left sided abdominal pain',
    'Left upper quadrant pain',
    'Lethargy',
    'Lightheadedness',
    'Low back pain',
    'Major trauma involving multiple body regions',
    'Malaise',
    'Measles',
    'Melaena',
    'Meningococcaemia',
    'Meningococcal infectious disease',
    'Mental health problem',
    'Migraine',
    'Miscarriage',
    'Mobitz type 1 heart block',
    'Mobitz type 2 heart block',
    'Muscle pain (ACC & MED)',
    'Musculoskeletal pain',
    'Myocardial ischaemia',
    'NAI - Non-accidental injury (ACC)',
    'Nausea',
    'Nausea and vomiting',
    'Neck pain',
    'No abnormality detected',
    'Non-cardiac chest pain',
    'Other injury (ACC - describe in notes)',
    'Other abrasion &or friction burn (ACC - describe in notes)',
    'Other illness or medical condition (describe in notes)',
    'Pain',
    'Palliative care',
    'Palpitations',
    'Paralysis (ACC)',
    'Paraplegia',
    'Pericarditis',
    'Peripheral ischaemia',
    'Peripheral oedema',
    'Pharyngitis ; Sore throat',
    'Photophobia',
    'Pleuritic pain',
    'Pneumonia',
    'Pneumothorax',
    'Post-ictal state',
    'Postoperative wound infection',
    'Postpartum haemorrhage',
    'Pregnancy problem',
    'Premature delivery',
    'Premature labour',
    'Presentation for social reasons',
    'Priapism',
    'Pulmonary embolism',
    'PV bleeding/Vaginal Bleeding',
    'Quadriplegia',
    'Renal Colic',
    'Respiratory arrest',
    'Respiratory tract infection',
    'Retained placenta',
    'Right bundle branch block',
    'Right flank pain',
    'Right Heart Failure',
    'Right hemiparesis',
    'Right iliac fossa pain',
    'Right lower quadrant pain',
    'Right pneumothorax',
    'Right sided abdominal pain',
    'Right upper quadrant pain',
    'Rotavirus',
    'Rupture of abdominal aortic aneurysm',
    'Rupture of achilles tendon (ACC)',
    'Sciatica',
    'Self inflicted lacerations to wrist',
    'Sepsis (ACC & MED)',
    'Sexual abuse (ACC)',
    'Sexual assault (ACC)',
    'Shock (ACC & MED)',
    'Shortness of breath',
    'Skin tear',
    'Smoke Inhalation',
    'Spinal cord injury',
    'Sprain of ankle &or foot (ACC)',
    'Sprain of elbow &or forearm (ACC)',
    'Sprain of finger (ACC)',
    'Sprain of hip (ACC)',
    'Sprain of knee (ACC)',
    'Sprain of lumbar back (ACC)',
    'Sprain of shoulder (ACC)',
    'Sprain of thumb',
    'Sprain of wrist &or hand (ACC)',
    'ST elevation myocardial infarction',
    'Stab wound',
    'Status epilepticus',
    'Substance abuse (ACC)',
    'SUDI - Sudden unexpected death of an infant',
    'Suicidal',
    'Sunburn (ACC)',
    'Superficial abrasion (ACC)',
    'Superficial bruising (ACC)',
    'Supraventricular tachycardia',
    'Suspected victim of child abuse',
    'Swollen eye(s) (ACC)',
    'Tachycardia',
    'Tachypnoea',
    'Third degree heart block',
    'Thoracic back pain',
    'Toothache',
    'Transient ischaemic attack',
    'Traumatic brain injury',
    'Traumatic cervical spine pain (ACC)',
    'Traumatic haemothorax (ACC)',
    'Traumatic pneumothorax (ACC)',
    'Undifferentiated illness',
    'Unintentional Poisoning',
    'Urinary Tract Infection',
    'Urticaria',
    'Vaginal bleeding',
    'Varicose veins of the leg with rupture (ACC & MED)',
    'Ventricular fibrillation',
    'Ventricular tachycardia',
    'Visual difficulty',
    'Weakness present',
    'Wound of ankle (ACC)',
    'Wound of buttock (ACC)',
    'Wound of chest (ACC)',
    'Wound of ear (ACC)',
    'Wound of face (ACC)',
    'Wound of finger(s) (ACC)',
    'Wound of forearm (ACC)',
    'Wound of hand (ACC)',
    'Wound of hip &or thigh (ACC)',
    'Wound of knee (ACC)',
    'Wound of lip (ACC)',
    'Wound of lower abdomen (ACC)',
    'Wound of mouth (ACC)',
    'Wound of neck (ACC)',
    'Wound of nose (ACC)',
    'Wound of scalp (ACC)',
    'Wound of upper abdomen (ACC)',
    'Wound of upper arm (ACC)',
    'Wounds of multiple areas (ACC)'
  ]

  // Load saved data on mount
  useEffect(() => {
    if (incidentId) {
      const saved = localStorage.getItem(`clinical_impression_${incidentId}`)
      if (saved) {
        try {
          setFormData(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse saved data:', e)
        }
      }
    }
  }, [incidentId])

  // Save data whenever it changes
  useEffect(() => {
    if (incidentId) {
      localStorage.setItem(`clinical_impression_${incidentId}`, JSON.stringify(formData))
    }
  }, [formData, incidentId])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.form-row')) {
        setShowPrimaryDropdown(false)
        setShowSecondaryDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleLogout = () => {
    clearCurrentUser()
    router.replace('/')
  }

  const handleHome = () => {
    const params = new URLSearchParams({ fleetId })
    router.push(`/dashboard?${params}`)
  }

  // Admin Panel removed from clinical-impression page

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
    navigateTo('past-medical-history')
  }

  const handleNext = () => {
    const params = new URLSearchParams({ id: incidentId, fleetId })
    router.push(`/disposition?${params}`)
  }

  const handleSubmitEPRF = () => {
    const result = validateAllSections(incidentId)
    setIncompleteSections(result.incompleteSections)
    
    if (result.isValid) {
      setShowSubmitModal(true)
    } else {
      setValidationErrorsData(result.fieldErrors)
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
        setValidationErrorsData(result.validationResult.fieldErrors)
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

  // Load patient letter on mount
  useEffect(() => {
    if (incidentId) {
      setPatientLetter(getCurrentPatientLetter(incidentId))
    }
  }, [incidentId])

  const hasFieldError = (field: string) => {
    return incompleteSections.includes('clinical-impression') && (
      (field === 'primaryClinicalImpression' && !formData.primaryClinicalImpression)
    )
  }

  const handlePrimarySearch = () => {
    setPrimarySearchQuery(formData.primaryClinicalImpression)
    setShowPrimaryDropdown(true)
    setShowSecondaryDropdown(false)
  }

  const handleSecondarySearch = () => {
    setSecondarySearchQuery(formData.secondaryClinicalImpression)
    setShowSecondaryDropdown(true)
    setShowPrimaryDropdown(false)
  }

  const openList = (field: 'primary' | 'secondary') => {
    setListField(field)
    setListSearchQuery('')
    setShowListModal(true)
    setShowPrimaryDropdown(false)
    setShowSecondaryDropdown(false)
  }

  const selectPrimaryImpression = (impression: string) => {
    setFormData(prev => ({ ...prev, primaryClinicalImpression: impression }))
    setShowPrimaryDropdown(false)
  }

  const selectSecondaryImpression = (impression: string) => {
    setFormData(prev => ({ ...prev, secondaryClinicalImpression: impression }))
    setShowSecondaryDropdown(false)
  }

  const selectFromList = (impression: string) => {
    if (listField === 'primary') {
      setFormData(prev => ({ ...prev, primaryClinicalImpression: impression }))
    } else {
      setFormData(prev => ({ ...prev, secondaryClinicalImpression: impression }))
    }
    setShowListModal(false)
  }

  const filteredPrimaryImpressions = clinicalImpressions.filter(imp =>
    imp.toLowerCase().includes(primarySearchQuery.toLowerCase())
  )

  const filteredSecondaryImpressions = clinicalImpressions.filter(imp =>
    imp.toLowerCase().includes(secondarySearchQuery.toLowerCase())
  )

  const filteredListImpressions = clinicalImpressions.filter(imp =>
    imp.toLowerCase().includes(listSearchQuery.toLowerCase())
  )

  return (
    <div className="eprf-dashboard incident-page">
      <style jsx>{`
        .form-container {
          padding: 20px;
        }
        
        .form-row {
            margin-bottom: 20px;
            position: relative;
            display: flex;
            align-items: flex-start;
            border: 2.5px solid #7a9cc0;
            border-radius: 6px;
            background: #f8fafc;
            padding: 18px 16px;
          }
        }
        
        .field-label {
           min-width: 220px;
           color: #1a3a5c;
           font-size: 14px;
           font-weight: bold;
           margin-bottom: 0;
           margin-right: 10px;
           display: flex;
           align-items: center;
        }
        
        .field-label.required::after {
          content: ' *';
          color: #cc0000;
        }
        
        .input-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .text-input {
          flex: 1;
          padding: 10px 15px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          font-size: 14px;
          background: white;
        }
        
        .text-input:focus {
          outline: none;
          border-color: #5a8ab8;
        }
        
        .action-btn {
          padding: 10px 25px;
          background: linear-gradient(to bottom, #5a7a9c, #4a6a8c);
          color: white;
          border: 1px solid #3a5a7c;
          border-radius: 3px;
          cursor: pointer;
          font-size: 14px;
          min-width: 80px;
        }
        
        .action-btn:hover {
          background: linear-gradient(to bottom, #6a8aac, #5a7a9c);
        }
        
        .notes-textarea {
          width: 100%;
          min-height: 120px;
          padding: 12px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          background: white;
        }
        
        .notes-textarea:focus {
          outline: none;
          border-color: #5a8ab8;
        }
        
        .dropdown-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 160px;
          max-height: 350px;
          overflow-y: auto;
          background: #6a8aac;
          border: 1px solid #3a5a7c;
          z-index: 100;
          margin-top: 2px;
        }
        
        .dropdown-item {
          padding: 8px 12px;
          cursor: pointer;
          color: white;
          font-size: 14px;
          border-bottom: 1px solid #5a7a9c;
        }
        
        .dropdown-item:nth-child(odd) {
          background: #7a9abc;
        }
        
        .dropdown-item:nth-child(even) {
          background: #6a8aac;
        }
        
        .dropdown-item:hover {
          background: #8aaacc;
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
          min-width: 500px;
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .modal-header {
          padding: 15px;
          background: linear-gradient(to bottom, #4a6a8c, #3a5a7c);
          color: white;
          font-weight: bold;
          text-align: center;
        }
        
        .modal-search {
          padding: 15px;
          border-bottom: 1px solid #3a5a7c;
        }
        
        .search-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #3a5a7c;
          border-radius: 3px;
          font-size: 14px;
        }
        
        .modal-list {
          flex: 1;
          overflow-y: auto;
          max-height: 400px;
        }
        
        .list-item {
          padding: 10px 15px;
          cursor: pointer;
          color: white;
          font-size: 14px;
          border-bottom: 1px solid #5a7a9c;
        }
        
        .list-item:nth-child(odd) {
          background: #7a9abc;
        }
        
        .list-item:nth-child(even) {
          background: #6a8aac;
        }
        
        .list-item:hover {
          background: #8aaacc;
        }
        
        .modal-footer {
          padding: 15px;
          display: flex;
          justify-content: center;
          background: linear-gradient(to bottom, #4a6a8c, #3a5a7c);
        }
        
        .cancel-btn {
          padding: 10px 30px;
          background: linear-gradient(to bottom, #c0c0c0, #a0a0a0);
          color: #333;
          border: 1px solid #808080;
          border-radius: 3px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .cancel-btn:hover {
          background: linear-gradient(to bottom, #d0d0d0, #b0b0b0);
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
        {canManageCollaborators(userPermission) && (
          <button className="nav-btn" onClick={() => setShowCollaboratorsModal(true)}>Manage Collaborators</button>
        )}
        {/* Admin Panel button removed from clinical-impression page */}
        <button className="nav-btn" onClick={handleLogout}>Logout</button>
        {incidentId && patientLetter && (
          <PresenceIndicator 
            incidentId={incidentId}
            patientLetter={patientLetter}
            userDiscordId={getCurrentUser()?.discordId || ''}
            userCallsign={getCurrentUser()?.callsign || ''}
            pageName="clinical-impression"
          />
        )}
        <div className="page-counter">
          <span className="patient-letter">{patientLetter}</span>
          <span className="page-indicator">1 of 1</span>
        </div>
      </div>

      <div className="incident-layout">
        <aside className="sidebar">
          <button className={`sidebar-btn${incompleteSections.includes('incident') ? ' incomplete' : ''}`} onClick={() => navigateTo('incident')}>Incident Information</button>
          <button className={`sidebar-btn${incompleteSections.includes('patient-info') ? ' incomplete' : ''}`} onClick={() => navigateTo('patient-info')}>Patient Information</button>
          <button className={`sidebar-btn${incompleteSections.includes('primary-survey') ? ' incomplete' : ''}`} onClick={() => navigateTo('primary-survey')}>Primary Survey</button>
          <button className={`sidebar-btn${incompleteSections.includes('vital-obs') ? ' incomplete' : ''}`} onClick={() => navigateTo('vital-obs')}>Vital Obs / Treat</button>
          <button className={`sidebar-btn${incompleteSections.includes('hx-complaint') ? ' incomplete' : ''}`} onClick={() => navigateTo('hx-complaint')}>Hx Complaint</button>
          <button className={`sidebar-btn${incompleteSections.includes('past-medical-history') ? ' incomplete' : ''}`} onClick={() => navigateTo('past-medical-history')}>Past Medical History</button>
          <button className={`sidebar-btn active${incompleteSections.includes('clinical-impression') ? ' incomplete' : ''}`}>Clinical Impression</button>
          <button className={`sidebar-btn${incompleteSections.includes('disposition') ? ' incomplete' : ''}`} onClick={() => navigateTo('disposition')}>Disposition</button>
          <button className="sidebar-btn" onClick={() => navigateTo('media')}>Media</button>
        </aside>

        <main className="incident-content">
          <div className="form-container">
            {/* Primary Clinical Impression */}
              <div className="form-row">
                <label className={`field-label required ${hasFieldError('primaryClinicalImpression') ? 'validation-error-label' : ''}`}>Primary Clinical Impression</label>
                <div className="input-row" style={{ flex: 1 }}>
                  <input
                    ref={primaryInputRef}
                    type="text"
                    className={`text-input ${hasFieldError('primaryClinicalImpression') ? 'validation-error' : ''}`}
                    value={formData.primaryClinicalImpression}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, primaryClinicalImpression: e.target.value }))
                      setShowPrimaryDropdown(false)
                    }}
                    onClick={() => {
                      setShowPrimaryDropdown(false)
                      setShowSecondaryDropdown(false)
                    }}
                  />
                  <button className="action-btn" onClick={handlePrimarySearch}>Search</button>
                  <button className="action-btn" onClick={() => openList('primary')}>List</button>
                </div>
                {showPrimaryDropdown && filteredPrimaryImpressions.length > 0 && (
                  <div className="dropdown-list">
                    {filteredPrimaryImpressions.slice(0, 20).map((impression, index) => (
                      <div
                        key={index}
                        className="dropdown-item"
                        onClick={() => selectPrimaryImpression(impression)}
                      >
                        {impression}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            {/* Secondary Clinical Impression */}
              <div className="form-row">
                <label className="field-label">Secondary Clinical Impression</label>
                <div className="input-row" style={{ flex: 1 }}>
                  <input
                    ref={secondaryInputRef}
                    type="text"
                    className="text-input"
                    value={formData.secondaryClinicalImpression}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, secondaryClinicalImpression: e.target.value }))
                      setShowSecondaryDropdown(false)
                    }}
                    onClick={() => {
                      setShowPrimaryDropdown(false)
                      setShowSecondaryDropdown(false)
                    }}
                  />
                  <button className="action-btn" onClick={handleSecondarySearch}>Search</button>
                  <button className="action-btn" onClick={() => openList('secondary')}>List</button>
                </div>
                {showSecondaryDropdown && filteredSecondaryImpressions.length > 0 && (
                  <div className="dropdown-list">
                    {filteredSecondaryImpressions.slice(0, 20).map((impression, index) => (
                      <div
                        key={index}
                        className="dropdown-item"
                        onClick={() => selectSecondaryImpression(impression)}
                      >
                        {impression}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            {/* Clinical Impression Notes */}
              <div className="form-row">
                <label className="field-label">Clinical Impression Notes</label>
                <div style={{ flex: 1 }}>
                  <textarea
                    className="notes-textarea"
                    value={formData.clinicalImpressionNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, clinicalImpressionNotes: e.target.value }))}
                    onClick={() => {
                      setShowPrimaryDropdown(false)
                      setShowSecondaryDropdown(false)
                    }}
                  />
                </div>
              </div>
          </div>
        </main>
      </div>

      <div className="eprf-footer incident-footer">
        <ConnectionStatus />
        <div className="footer-left">
          <button className="footer-btn green" onClick={handleAddPatientClick}>Add Patient</button>
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

      {/* List Modal with Search */}
      {showListModal && (
        <div className="modal-overlay" onClick={() => setShowListModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {listField === 'primary' ? 'Primary' : 'Secondary'} Clinical Impression
            </div>
            <div className="modal-search">
              <input
                type="text"
                className="search-input"
                placeholder="Search..."
                value={listSearchQuery}
                onChange={(e) => setListSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-list">
              {filteredListImpressions.map((impression, index) => (
                <div
                  key={index}
                  className="list-item"
                  onClick={() => selectFromList(impression)}
                >
                  {impression}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowListModal(false)}>Cancel</button>
              <button className="ok-btn" onClick={() => setShowListModal(false)} style={{
                padding: '10px 30px',
                background: 'linear-gradient(to bottom, #5a7a9c, #4a6a8c)',
                color: 'white',
                border: '1px solid #3a5a7c',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '14px',
                marginLeft: '10px'
              }}>OK</button>
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
        errors={validationErrorsData}
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
          router.push(`/clinical-impression?${params}`)
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
      {currentUser && showChat && (
        <ChatStrip
          incidentId={incidentId}
          discordId={currentUser.discordId}
          callsign={currentUser.callsign}
          patientLetter={patientLetter}
          collaborators={collaborators}
        />
      )}
      {showChat && (
        <div className="fixed inset-0 z-40 bg-black/30 cursor-pointer" onClick={() => setShowChat(false)} />
      )}
    </div>
  )
}
