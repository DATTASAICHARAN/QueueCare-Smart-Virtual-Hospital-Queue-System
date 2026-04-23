/**
 * NotificationService.js
 * 
 * This service handles automated call and SMS notifications for CureQ.
 * For now, it provides a simulation layer that displays on-screen alerts.
 * 
 * TO ENABLE REAL CALLS:
 * 1. Install the 'twilio' npm package.
 * 2. Create a backend endpoint (e.g., Firebase Cloud Function) to call the Twilio SDK.
 * 3. Replace the 'console.log' calls below with a fetch() call to your backend.
 */

export const triggerCall = (type, data) => {
  const messages = {
    booking: `[AUTOMATED CALL] Hello ${data.patientName}, your appointment at ${data.hospitalName} with Dr. ${data.doctorName} for ${data.date} has been confirmed. Your token number is #${data.token}.`,
    reminder: `[REMINDER CALL] Hello ${data.patientName}, this is a reminder that your appointment at ${data.hospitalName} starts in exactly 5 minutes. Please be ready!`
  };

  const message = messages[type] || 'Automated notification from CureQ.';

  // --- Voice Synthesis Integration ---
  // We use the browser's native Web Speech API to provide an actual audible voice.
  if ('speechSynthesis' in window) {
    // Clean up the message for the voice (remove prefix like '[AUTOMATED CALL]')
    const voiceMsg = message.replace(/\[.*?\]\s*/, '');
    const utterance = new SpeechSynthesisUtterance(voiceMsg);
    utterance.pitch = 1.1; // Slightly higher pitch for a friendly tone
    utterance.rate = 0.95;  // Slightly slower for clarity
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    window.speechSynthesis.speak(utterance);
  }

  // Simulation: Log to console and send a CustomEvent for the UI Toast
  console.log("%c📞 " + message, "color: #0d9488; font-weight: bold; font-size: 14px;");
  
  // Custom event to be picked up by the UI (e.g., PatientDashboard)
  const event = new CustomEvent('cureq-notification', { detail: { type, message } });
  window.dispatchEvent(event);

  return true;
};
