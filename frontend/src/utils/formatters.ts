/**
 * Formateadores para campos específicos según los requerimientos de EsSalud
 */

/** Longitud de cada grupo del NIT: XXXX-XXXX-NIT-XXXXXXX */
const NIT_GRUPO = 4;
const NIT_GRUPO_FINAL = 7;
const NIT_DIGITOS = 15;

/** Deja solo los dígitos de un valor. */
export const soloDigitos = (value: string, maxLength?: number): string => {
  const digits = value.replace(/\D/g, "");
  return maxLength ? digits.slice(0, maxLength) : digits;
};

/**
 * Enmascara el NIT mientras se escribe, de izquierda a derecha.
 *
 * No rellena con ceros: si lo hiciera, al escribir "12" quedaría "0000-0000-NIT-12"
 * y los dígitos siguientes se irían al grupo equivocado. El completado con ceros
 * lo hace `completarNIT` al salir del campo.
 */
export const formatNIT = (value: string): string => {
  const digits = soloDigitos(value, NIT_DIGITOS);
  if (digits.length === 0) return "";
  if (digits.length <= NIT_GRUPO) return digits;
  if (digits.length <= NIT_GRUPO * 2) {
    return `${digits.slice(0, NIT_GRUPO)}-${digits.slice(NIT_GRUPO)}`;
  }
  return `${digits.slice(0, NIT_GRUPO)}-${digits.slice(
    NIT_GRUPO,
    NIT_GRUPO * 2
  )}-NIT-${digits.slice(NIT_GRUPO * 2)}`;
};

/**
 * Completa el NIT al formato XXXX-XXXX-NIT-XXXXXXX con ceros a la izquierda.
 *
 * Según el requerimiento del cliente, si se ingresan 7 dígitos o menos se toman
 * como el último grupo (12 -> 0000-0000-NIT-0000012). Con más de 7 dígitos se
 * reparten entre los tres grupos y se rellena lo que falte.
 */
export const completarNIT = (value: string): string => {
  const digits = soloDigitos(value, NIT_DIGITOS);
  if (digits.length === 0) return "";
  if (digits.length < NIT_GRUPO_FINAL) {
    return `0000-0000-NIT-${digits.padStart(NIT_GRUPO_FINAL, "0")}`;
  }
  return `${digits.slice(0, NIT_GRUPO).padStart(NIT_GRUPO, "0")}-${digits
    .slice(NIT_GRUPO, NIT_GRUPO * 2)
    .padStart(NIT_GRUPO, "0")}-NIT-${digits
    .slice(NIT_GRUPO * 2)
    .padStart(NIT_GRUPO_FINAL, "0")}`;
};

/**
 * Formatea el EXP SGD para que tenga exactamente 16 dígitos empezando con 0
 */
export const formatExpSGD = (value: string): string => {
  const digits = soloDigitos(value);

  if (digits.length === 0) return "";

  // Si no empieza con 0 se lo agrega, dejando espacio para los 16 dígitos.
  if (!digits.startsWith("0")) {
    return `0${digits}`.slice(0, 16);
  }

  return digits.slice(0, 16);
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
 * Deja solo los dígitos del número de resolución mientras se escribe, SIN
 * rellenar con ceros.
 *
 * Rellenar en cada pulsación rompe la escritura: al teclear el primer dígito el
 * campo pasa a "0001", ya tiene los 4 caracteres del `maxLength` y no deja
 * escribir el resto. El relleno se aplica al salir del campo, con
 * `formatNumeroResolucion`.
 */
export const soloDigitosNumeroResolucion = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 4);

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
 * Deja solo los dígitos de la nota de derivación mientras se escribe, SIN
 * rellenar con ceros (el relleno se hace al salir del campo, con
 * `formatNumeroNotaDerivacion`).
 */
export const soloDigitosNumeroNotaDerivacion = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 6);

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
 * Enmascara una fecha mientras se escribe en DD/MM/AAAA.
 *
 * El requerimiento del cliente es "en formato dd/mm/yyyy". Al teclear solo se
 * admiten digitos y las barras se colocan solas: "2512" -> "25/12".
 */
export const formatDateDMY = (value: string): string => {
  const digitos = soloDigitos(value, 8);
  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
};

/** Convierte "DD/MM/AAAA" en el "AAAA-MM-DD" que viaja a la base de datos. */
export const dateDMYToISO = (value: string): string => {
  const digitos = soloDigitos(value, 8);
  if (digitos.length !== 8) return "";
  const dia = digitos.slice(0, 2);
  const mes = digitos.slice(2, 4);
  const anio = digitos.slice(4);
  if (Number(dia) < 1 || Number(dia) > 31) return "";
  if (Number(mes) < 1 || Number(mes) > 12) return "";
  return `${anio}-${mes}-${dia}`;
};

/** Convierte el "AAAA-MM-DD" de la base de datos en "DD/MM/AAAA" para el campo. */
export const isoToDateDMY = (value: string): string =>
  value ? formatDateDMY(value) : "";

/** Indica si el texto ya es una fecha completa y valida. */
export const esFechaDMYValida = (value: string): boolean =>
  dateDMYToISO(value) !== "";

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

/** Criterios de búsqueda admitidos, en el orden en que los pide el cliente. */
export type CriterioBusqueda =
  | "todos"
  | "nit"
  | "exp_sgd"
  | "dni_ce"
  | "asegurado_titular";

/**
 * Mínimo de caracteres por criterio antes de lanzar la búsqueda.
 *
 * Tres es el mínimo que aprovecha un índice de trigramas en PostgreSQL y
 * coincide con el mínimo que aplica el backend. Además evita que una o dos
 * teclas devuelvan el padrón completo.
 */
export const MIN_BUSQUEDA: Record<CriterioBusqueda, number> = {
  todos: 3,
  nit: 3,
  exp_sgd: 3,
  dni_ce: 3,
  asegurado_titular: 3,
};

/** Largo máximo admitido en el buscador, para acotar el patrón de búsqueda. */
export const MAX_BUSQUEDA: Record<CriterioBusqueda, number> = {
  todos: 50,
  nit: 19,
  exp_sgd: 16,
  dni_ce: 10,
  asegurado_titular: 50,
};

/**
 * Normaliza lo que se escribe en el buscador.
 *
 * A diferencia de los campos de registro, aquí no se rellenan ceros: la búsqueda
 * es en tiempo real y el backend tolera los formatos parciales, así que se envía
 * exactamente lo que el usuario ha tecleado.
 */
export const normalizarBusqueda = (
  criterio: CriterioBusqueda,
  value: string
): string => {
  const maximo = MAX_BUSQUEDA[criterio];
  switch (criterio) {
    case "nit":
      return formatNIT(value);
    case "exp_sgd":
      return soloDigitos(value, 16);
    case "dni_ce":
      return value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase();
    case "asegurado_titular":
      return value.replace(/\s+/g, " ").slice(0, maximo);
    default:
      return value.replace(/\s+/g, " ").slice(0, maximo);
  }
};

/** Texto a enviar al backend: vacío si aún no alcanza para discriminar. */
export const terminoBusqueda = (
  criterio: CriterioBusqueda,
  value: string
): string => {
  const normalizado = normalizarBusqueda(criterio, value).trim();
  return normalizado.length >= MIN_BUSQUEDA[criterio] ? normalizado : "";
};

/**
 * Nombre del parámetro de query que espera el backend para cada criterio.
 * "todos" no es un campo: va al parámetro `q`, que busca en los cuatro.
 */
export const PARAMETRO_BUSQUEDA: Record<CriterioBusqueda, string> = {
  todos: "q",
  nit: "nit",
  exp_sgd: "exp_sgd",
  dni_ce: "dni_ce",
  asegurado_titular: "asegurado_titular",
};

/**
 * Resalta la coincidencia conservando el formato original del texto.
 *
 * En NIT y EXP SGD el backend compara solo dígitos, así que la coincidencia se
 * localiza sobre la secuencia de dígitos y se proyecta luego sobre el texto
 * original: de ese modo "12" resalta en `0000-0000-NIT-0000012` sin perder los
 * guiones ni el literal "NIT".
 */
export const resaltar = (
  texto: string | null | undefined,
  criterio: CriterioBusqueda,
  termino: string
): { texto: string; coincide: boolean }[] | null => {
  if (!texto || !termino) return null;

  const esNumerico = criterio === "nit" || criterio === "exp_sgd";
  const needle = esNumerico ? soloDigitos(termino) : termino;
  if (!needle) return null;

  if (!esNumerico) {
    const indice = texto.toLowerCase().indexOf(needle.toLowerCase());
    if (indice < 0) return null;
    return [
      { texto: texto.slice(0, indice), coincide: false },
      { texto: texto.slice(indice, indice + needle.length), coincide: true },
      { texto: texto.slice(indice + needle.length), coincide: false },
    ];
  }

  // Posiciones de cada dígito dentro del texto original.
  const posiciones: number[] = [];
  for (let i = 0; i < texto.length; i += 1) {
    if (texto[i] >= "0" && texto[i] <= "9") posiciones.push(i);
  }
  const digitos = posiciones.map((i) => texto[i]).join("");
  const indice = digitos.indexOf(needle);
  if (indice < 0) return null;

  const marcados = new Set(
    posiciones.slice(indice, indice + needle.length)
  );

  const tramos: { texto: string; coincide: boolean }[] = [];
  let buffer = "";
  let coincide = false;
  for (let i = 0; i < texto.length; i += 1) {
    const actual = marcados.has(i);
    if (actual !== coincide && buffer) {
      tramos.push({ texto: buffer, coincide });
      buffer = "";
    }
    coincide = actual;
    buffer += texto[i];
  }
  if (buffer) tramos.push({ texto: buffer, coincide });

  return tramos;
};