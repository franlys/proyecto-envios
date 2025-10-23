// backend/src/models/TrackingGenerator.js
import { db } from '../config/firebase.js';

/**
 * Genera números de tracking únicos
 * Formato: TR-2024-XXXXX
 */
class TrackingGenerator {
  
  /**
   * Genera un nuevo tracking number
   * @returns {Promise<string>} Tracking number único
   */
  static async generate() {
    const year = new Date().getFullYear();
    const counterRef = db.collection('_counters').doc('tracking');
    
    try {
      // Usar transacción para evitar duplicados
      const newNumber = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let currentNumber = 1;
        
        if (counterDoc.exists) {
          const data = counterDoc.data();
          // Si cambió el año, reiniciar contador
          if (data.year !== year) {
            currentNumber = 1;
            transaction.set(counterRef, { year, number: 1 });
          } else {
            currentNumber = (data.number || 0) + 1;
            transaction.update(counterRef, { number: currentNumber });
          }
        } else {
          // Crear contador si no existe
          transaction.set(counterRef, { year, number: 1 });
        }
        
        // Formato: TR-2024-00001
        const paddedNumber = String(currentNumber).padStart(5, '0');
        return `TR-${year}-${paddedNumber}`;
      });
      
      return newNumber;
      
    } catch (error) {
      console.error('Error generando tracking:', error);
      throw new Error('No se pudo generar tracking number');
    }
  }
  
  /**
   * Valida formato de tracking
   * @param {string} tracking 
   * @returns {boolean}
   */
  static validate(tracking) {
    const regex = /^TR-\d{4}-\d{5}$/;
    return regex.test(tracking);
  }
}

export default TrackingGenerator;