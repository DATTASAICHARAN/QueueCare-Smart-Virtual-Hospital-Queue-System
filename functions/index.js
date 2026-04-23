const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();

// Hardcoding env var fallback for Twilio in testing, ideally set securely in Functions Config
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || functions.config().twilio?.sid;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || functions.config().twilio?.token;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || functions.config().twilio?.phone_number;

let twilioClient = null;
if (twilioAccountSid && twilioAuthToken) {
  twilioClient = twilio(twilioAccountSid, twilioAuthToken);
}

// Scheduled function runs every minute
exports.appointmentReminder = functions.pubsub.schedule("every 1 minutes").onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();
  const db = admin.firestore();

  // Find all appointments that are pending and haven't had a reminder sent yet
  const snapshot = await db.collection("appointments")
    .where("status", "in", ["pending", "in-progress"])
    .where("reminderSent", "!=", true)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const batch = db.batch();
  const promises = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    // Assuming projectedTime is a valid ISO string. Convert it to milliseconds.
    const projectedTime = new Date(data.projectedTime).getTime();
    const timeDiffMs = projectedTime - Date.now();
    const timeDiffMinutes = timeDiffMs / 60000;

    // If appointment is roughly within 5 minutes (ignoring past appointments for now)
    if (timeDiffMinutes <= 5 && timeDiffMinutes >= -5) {
      // 1. Mark reminder as sent
      batch.update(doc.ref, { reminderSent: true });

      // 2. Prepare Twilio SMS
      const patientPhone = data.patientData?.phone; // Assuming patientData has phone, otherwise fallback
      if (twilioClient && patientPhone) {
        const messagePromise = twilioClient.messages.create({
          body: `Your appointment with ${data.doctorName} is in 5 minutes! Token number ${data.token}.`,
          from: twilioPhoneNumber,
          to: patientPhone,
        }).catch(err => console.error("Twilio error:", err));
        
        promises.push(messagePromise);
      } else {
        console.warn(`Twilio not configured or missing phone number for patient ${data.patientId}`);
      }
    }
  });

  await Promise.all(promises);
  await batch.commit();

  return null;
});
