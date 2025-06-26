const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendStockUpdateNotification = onDocumentUpdated("stocks/{stockId}", async (event) => {
  const stockData = event.data.after.data();
  const stockId = event.params.stockId;
  const percentageChange = stockData.percentageChange;

  const usersSnapshot = await admin.firestore().collection("users").get();
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const fcmToken = userDoc.data().fcmToken;

    if (!fcmToken) {
      console.log(` Nu există token pentru utilizatorul ${userId}`);
      continue;
    }

    const thresholdDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .collection("stockthreshold")
      .doc(stockId)
      .get();

    if (!thresholdDoc.exists) {
      console.log(` Nu există prag setat pentru ${userId} - ${stockId}`);
      continue;
    }

    const threshold = thresholdDoc.data().threshold || 0;

    if ((percentageChange >= threshold && percentageChange > 0) ||
        (percentageChange <= threshold && percentageChange < 0)) {

      const payload = {
        notification: {
          title: `Actualizare stock: ${stockId}`,
          body: `Stock-ul ${stockId} a depășit pragul: ${percentageChange}%`,
        }
      };

      //  Log final cu payload-ul înainte de trimitere
      console.log("Payload trimis la token:", fcmToken, JSON.stringify(payload));

      await admin.messaging().sendToDevice(fcmToken, payload);
      console.log(` Notificare trimisă la user ${userId} pentru stock ${stockId}`);
    }
  }

  return;
});
