const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, deleteDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration matches your src/store/firebase.ts
const firebaseConfig = {
  apiKey: 'AIzaSyCpiEyKmEYJYHCWL2tFjdFOqCxQyonsChk',
  authDomain: 'move-app-47c98.firebaseapp.com',
  projectId: 'move-app-47c98',
  storageBucket: 'move-app-47c98.firebasestorage.app',
  messagingSenderId: '864533264091',
  appId: '1:864533264091:web:fb8341971acdc840f97efe',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data to be uploaded
const dataFilePath = path.join(__dirname, 'data.json');
// Set the target sync key here
const targetSyncKey = 'eastside-housing-456';

async function uploadData() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      console.error(`Data file not found at ${dataFilePath}`);
      process.exit(1);
    }

    const rawData = fs.readFileSync(dataFilePath, 'utf8');
    const properties = JSON.parse(rawData);

    console.log(`Starting upload to syncKey: ${targetSyncKey}...`);
    let count = 0;

    for (const property of properties) {
      // You can auto-generate the ID or use the one from JSON
      const id = property.id || doc(collection(db, 'sync', targetSyncKey, 'reviews')).id;
      
      const reviewDoc = {
        id: id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: {
          'default-address': property.address || '',
          field_rent: property.rent || 0,
          field_type: property.type || '',
          field_neighborhood: property.neighborhood || '',
          field_status: property.status || '',
          field_zillow: property.zillowLink || '',
          field_redfin: property.redfinLink || '',
          'default-rating': property.rating || null,
          field_gas_stove: property.hasGasStove || false,
          field_ac: property.hasAC || false,
          field_visited: property.visited || false,
        }
      };

      if (property.lat !== undefined && property.lng !== undefined) {
        reviewDoc.lat = property.lat;
        reviewDoc.lng = property.lng;
      }

      // Push to Firestore
      await setDoc(doc(db, 'sync', targetSyncKey, 'reviews', id), reviewDoc);
      console.log(`Uploaded property: ${property.address} (ID: ${id})`);
      count++;
    }
    
    console.log(`Successfully uploaded ${count} properties.`);

    // 2. Upload Field Settings so the app knows how to display these fields!
    console.log(`Uploading field settings...`);
    const fieldSettings = [
      { id: 'default-address', key: 'Address', type: 'single-line', isCore: true, isDefault: true, order: 1, isVisible: true },
      { id: 'field_rent', key: 'Rent', type: 'dollar', isCore: false, isDefault: true, order: 2, isVisible: true },
      { id: 'field_type', key: 'Type', type: 'label', isCore: false, isDefault: true, order: 3, isVisible: true },
      { id: 'field_neighborhood', key: 'Neighborhood', type: 'label', isCore: false, isDefault: true, order: 4, isVisible: true },
      { id: 'field_status', key: 'Status', type: 'label', isCore: false, isDefault: true, order: 5, isVisible: true },
      { id: 'field_zillow', key: 'Zillow', type: 'link', isCore: false, isDefault: true, order: 6, isVisible: false },
      { id: 'field_redfin', key: 'Redfin', type: 'link', isCore: false, isDefault: true, order: 7, isVisible: false },
      { id: 'default-rating', key: 'Rating', type: 'score', isCore: false, isDefault: true, order: 8, scoreMin: 1, scoreMax: 5, isVisible: true },
      { id: 'field_gas_stove', key: 'Has Gas Stove', type: 'boolean', isCore: false, isDefault: true, order: 9, isVisible: true },
      { id: 'field_ac', key: 'Has AC', type: 'boolean', isCore: false, isDefault: true, order: 10, isVisible: true },
      { id: 'field_visited', key: 'Visited', type: 'boolean', isCore: false, isDefault: true, order: 11, isVisible: true },
    ];

    // Cleanup: delete any stale/unwanted field settings (app defaults + old custom ones)
    const fieldsToDelete = [
      // Old incorrectly-named custom fields
      'field_address',
      'field_rating',
      // App's built-in defaults we don't want
      'default-price',
      'default-sqft',
      'default-bedrooms',
      'default-bathrooms',
      'default-link',
      'default-pictures',
    ];
    for (const id of fieldsToDelete) {
      try {
        await deleteDoc(doc(db, 'sync', targetSyncKey, 'fieldSettings', id));
      } catch (e) {
        // ignore — field may not exist
      }
    }

    let fieldCount = 0;
    for (const setting of fieldSettings) {
      await setDoc(doc(db, 'sync', targetSyncKey, 'fieldSettings', setting.id), setting);
      fieldCount++;
    }
    console.log(`Successfully uploaded ${fieldCount} field settings.`);

    process.exit(0);
  } catch (error) {
    console.error('Error uploading data:', error);
    process.exit(1);
  }
}

uploadData();
