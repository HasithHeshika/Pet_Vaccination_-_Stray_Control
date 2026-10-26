// Animal incident report types and urgency levels (must match Backend/models/StrayReport.js)
export const INCIDENT_TYPES = [
  {
    value: 'violence',
    label: 'Violence or abuse',
    hint: 'An animal being beaten, harmed, tortured or cruelly treated',
    defaultUrgency: 'urgent'
  },
  {
    value: 'sick_injured',
    label: 'Sick or injured in public',
    hint: 'An animal that is ill, injured or in distress in a public place',
    defaultUrgency: 'urgent'
  },
  {
    value: 'stray',
    label: 'Stray animal',
    hint: 'A stray or abandoned animal that needs attention',
    defaultUrgency: 'normal'
  },
  {
    value: 'other',
    label: 'Other incident',
    hint: 'Any other incident involving an animal',
    defaultUrgency: 'normal'
  }
];

export const URGENCY_LEVELS = [
  { value: 'emergency', label: 'Emergency', hint: 'Life in danger right now' },
  { value: 'urgent', label: 'Urgent', hint: 'Needs attention today' },
  { value: 'normal', label: 'Normal', hint: 'Can be handled in the coming days' }
];

export const incidentTypeLabel = (report) => {
  if (report?.incidentType === 'other' && report.otherIncidentType) {
    return `Other: ${report.otherIncidentType}`;
  }
  return INCIDENT_TYPES.find((type) => type.value === (report?.incidentType || 'stray'))?.label || 'Animal incident';
};

export const urgencyLabel = (urgency) =>
  URGENCY_LEVELS.find((level) => level.value === urgency)?.label || 'Normal';

export const mapLink = (coordinates) =>
  coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)
    ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
    : '';
