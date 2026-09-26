/**
 * Mascara del NIT (XXXX-XXXX-NIT-XXXXXXX).
 *
 * Se separa del componente porque `react-refresh` exige que un archivo de
 * componente solo exporte componentes.
 *
 * El usuario teclea solo digitos: los guiones y el texto "NIT" los pone la
 * mascara y nunca se pueden escribir ni borrar.
 *
 * Las fechas no estan aqui: usan el input type="date" nativo, que ya trae
 * calendario y entrega el valor en ISO, que es lo que espera el backend.
 */

export const NIT_GRUPO_A = 4;
export const NIT_GRUPO_B = 4;
const NIT_GRUPO_C = 7;

/** 4 + 4 + 7 digitos. */
const NIT_DIGITOS = NIT_GRUPO_A + NIT_GRUPO_B + NIT_GRUPO_C;

/** Plantilla visible del NIT: los "_" son los digitos que se teclean. */
export const NIT_PLANTILLA = `${"_".repeat(NIT_GRUPO_A)}-${"_".repeat(
  NIT_GRUPO_B
)}-NIT-${"_".repeat(NIT_GRUPO_C)}`;

/**
 * El anio que se pone solo en el NIT. Se lee en cada llamada, y no como
 * constante al cargar el modulo, para que el valor no envejezca en una sesion
 * larga o en una pestana abierta que cruza el cambio de ano.
 */
export const anioActualNIT = (): string => String(new Date().getFullYear());

/**
 * Une los tres grupos en el texto del NIT, rellenando cada uno con ceros a la
 * izquierda hasta su ancho definitivo.
 *
 * El relleno es POR GRUPO y nunca sobre el numero completo: si se rellenara el
 * total, lo tecleado se correria hacia la derecha. Con 454520261 el resultado
 * correcto es 4545-2026-NIT-0000001 y no 0000-0045-NIT-4520261.
 */
const componerNIT = (a: string, b: string, c: string): string => {
  if (!a && !b && !c) return "";
  const A = a.slice(0, NIT_GRUPO_A).padStart(NIT_GRUPO_A, "0");
  const B = b.slice(0, NIT_GRUPO_B).padStart(NIT_GRUPO_B, "0");
  const C = c.slice(0, NIT_GRUPO_C).padStart(NIT_GRUPO_C, "0");
  return `${A}-${B}-NIT-${C}`;
};

/**
 * Texto enmascarado mientras se teclea. Los grupos ya completos se rellenan
 * con ceros a la izquierda para que el campo mantenga siempre su ancho.
 */
export const enmascararNIT = (crudo: string): string => {
  const d = crudo.replace(/\D/g, "").slice(0, NIT_DIGITOS);
  if (d.length === 0) return "";
  const a = d.slice(0, NIT_GRUPO_A);
  const b = d.slice(NIT_GRUPO_A, NIT_GRUPO_A + NIT_GRUPO_B);
  const c = d.slice(NIT_GRUPO_A + NIT_GRUPO_B);

  let texto = a;
  if (d.length > NIT_GRUPO_A) {
    texto += `-${b.length === NIT_GRUPO_B ? b.padStart(NIT_GRUPO_B, "0") : b}`;
  }
  if (d.length > NIT_GRUPO_A + NIT_GRUPO_B) {
    texto += `-NIT-${c.length === NIT_GRUPO_C ? c.padStart(NIT_GRUPO_C, "0") : c}`;
  }
  return texto;
};

/**
 * Completa el NIT al salir del campo.
 *
 * Hay dos reglas del cliente y se distinguen por cuantos digitos se teclearon:
 *  - "En las 7 X restantes, yo ingreso solo: 740 -> 0000740". Con 3 digitos o
 *    menos, lo tecleado va al ULTIMO grupo.
 *  - "454520261 -> 4545-2026-NIT-0000001". Desde el 4to digito, que es el
 *    primero de los 4 obligatorios, los digitos se reparten desde la izquierda:
 *    4 del primer grupo, 4 del anio y el resto al final.
 *
 * El anio se completa solo con el anio actual si aun no se tecleo. Si el NIT ya
 * venia de la base de datos, su anio se respeta porque el control no lo vuelve
 * a imponer sobre un valor completo.
 */
export const completarNITEnmascarado = (value: string, anio = anioActualNIT()): string => {
  const d = (value || "").replace(/\D/g, "").slice(0, NIT_DIGITOS);
  if (d.length === 0) return "";

  if (d.length < NIT_GRUPO_A) return componerNIT("", "", d);

  const a = d.slice(0, NIT_GRUPO_A);
  const b = d.slice(NIT_GRUPO_A, NIT_GRUPO_A + NIT_GRUPO_B);
  const c = d.slice(NIT_GRUPO_A + NIT_GRUPO_B);
  return componerNIT(a, b.length === 0 ? anio : b, c);
};
