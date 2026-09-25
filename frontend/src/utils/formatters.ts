/**
 * Formateadores para campos específicos según los requerimientos de EsSalud
 */

/**
 * Formatea el NIT según el patrón: XXXX-XXXX-NIT-XXXXXXX
 * Completa con ceros a la izquierda en la parte final
 */
export const formatNIT = (value: string): string => {
  // Remover todo lo que no sea número
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length === 0) return "";
  
  // Si es solo números, formatear como la parte final del NIT
  if (numbers.length <= 7) {
    const padded = numbers.padStart(7, "0");
    return `0000-0000-NIT-${padded}`;
  }
  
  // Si ya tiene más números, intentar formatear completo
  if (numbers.length <= 18) {
    const part1 = numbers.slice(0, 4).padStart(4, "0");
    const part2 = numbers.slice(4, 8).padStart(4, "0");
    const part3 = numbers.slice(8).padStart(7, "0");
    return `${part1}-${part2}-NIT-${part3}`;
  }
  
  return value; // Si es muy largo, devolver sin cambios
};

/**
 * Formatea el EXP SGD para que tenga exactamente 16 dígitos empezando con 0
 */
export const formatExpSGD = (value: string): string => {
  // Remover todo lo que no sea número
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length === 0) return "";
  
  // Limitar a 16 dígitos
  const limited = numbers.slice(0, 16);
  
  // Si no empieza con 0, agregarlo
  if (limited.length > 0 && !limited.startsWith("0")) {
    const withZero = "0" + limited;
    return withZero.slice(0, 16);
  }
  
  return limited;
};

/**
 * Formatea el RUC para que tenga exactamente 11 dígitos
 */
export const formatRUC = (value: string): string => {
  // Remover todo lo que no sea número
  const numbers = value.replace(/\D/g, "");
  
  // Limitar a 11 dígitos
  return numbers.slice(0, 11);
};

/**
 * Formatea el DNI/C.E. permitiendo alfanuméricos
 */
export const formatDNI = (value: string): string => {
  // Permitir letras, números y algunos caracteres especiales
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
  
  // Limitar a 10 caracteres
  return cleaned.slice(0, 10).toUpperCase();
};

/**
 * Formatea el número de resolución para que tenga 4 dígitos con ceros a la izquierda
 */
export const formatNumeroResolucion = (value: string): string => {
  // Remover todo lo que no sea número
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length === 0) return "";
  
  // Limitar a 4 dígitos y agregar ceros a la izquierda
  const limited = numbers.slice(0, 4);
  return limited.padStart(4, "0");
};

/**
 * Formatea el número de nota de derivación para que tenga 6 dígitos con ceros a la izquierda
 */
export const formatNumeroNotaDerivacion = (value: string): string => {
  // Remover todo lo que no sea número
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length === 0) return "";
  
  // Limitar a 6 dígitos y agregar ceros a la izquierda
  const limited = numbers.slice(0, 6);
  return limited.padStart(6, "0");
};

/**
 * Formatea una fecha para mostrarla en formato DD/MM/YYYY
 */
export const formatDisplayDate = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return "";
  
  return dateObj.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Formatea una fecha para el input de tipo date (YYYY-MM-DD)
 */
export const formatInputDate = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return "";
  
  return dateObj.toISOString().split("T")[0];
};

/**
 * Valida si un formato es correcto
 */
export const validators = {
  nit: (value: string): boolean => {
    return /^\d{4}-\d{4}-NIT-\d{7}$/.test(value);
  },
  
  expSGD: (value: string): boolean => {
    return /^0\d{15}$/.test(value);
  },
  
  ruc: (value: string): boolean => {
    return /^\d{11}$/.test(value);
  },
  
  dniCE: (value: string): boolean => {
    return /^[A-Z0-9]{5,10}$/.test(value);
  },
  
  numeroResolucion: (value: string): boolean => {
    return /^\d{4}$/.test(value);
  },
  
  numeroNotaDerivacion: (value: string): boolean => {
    return /^\d{6}$/.test(value);
  },
};