// Skrypt do pełnego resetu Firestore (usuwa sesje, snapshoty, zamówienia i zeruje magazyn)
// Uruchom: node resetFirestore.js

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function deleteCollection(collName) {
  const snap = await db.collection(collName).get();
  const batchSize = snap.size;
  if (batchSize === 0) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Usunięto ${batchSize} dokumentów z kolekcji ${collName}`);
}

async function resetWarehouse() {
  const snap = await db.collection("warehouse").get();
  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { quantity: 0, history: [] });
  });
  await batch.commit();
  console.log("Zresetowano stany magazynowe do 0.");
}

async function main() {
  await deleteCollection("dailySessions");
  await deleteCollection("dailyWarehouseReports");
  await deleteCollection("orders");
  await resetWarehouse();
  console.log("RESET FIRESTORE ZAKOŃCZONY.");
}

main().catch(console.error);
