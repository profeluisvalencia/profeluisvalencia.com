// Utilidades compartidas (los archivos que empiezan con _ no son funciones públicas en Vercel)

const STRIPE_API = 'https://api.stripe.com/v1';

// Links de pago de Stripe que cuentan como compra de Estratega PH 2027
const ESTRATEGA_LINKS = (process.env.ESTRATEGA_PAYMENT_LINKS || 'plink_1UZBXgAOBQw0m1xIMpTopMz0')
  .split(',').map(s => s.trim()).filter(Boolean);

function quitarAcentos(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tituloNombre(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}

function nombreDeSesion(s) {
  const ci = s.collected_information || {};
  const cd = s.customer_details || {};
  const candidatos = [
    ci.individual_name,
    cd.individual_name,
    ci.name,
    cd.name,
  ];
  for (const c of candidatos) {
    if (c && String(c).trim().length > 1) return tituloNombre(c);
  }
  return '';
}

const FEMENINOS = new Set(('carmen dolores mercedes isabel raquel ruth beatriz ines lourdes pilar consuelo belen soledad esther ' +
  'miriam judith karen ingrid abigail nayeli itzel yaretzi xochitl citlali araceli nancy mary ivonne lizbeth maribel marisol ' +
  'rocio jazmin yazmin noemi irene nelly edith elizabeth sol flor luz paz mabel aurora estela azucena margarita rubi ' +
  'yolanda leticia gisel giselle janet janeth jaqueline jacqueline evelyn evelin miriam abril belem dulce anel arely ' +
  'aide aidee madai nohemi zoe chloe cloe nicole michelle denisse denise iris lupe lupita rosy wendy shirley ' +
  'beatris yuridia lilian liliana amairani amayrani jocelyn joselyn').split(/\s+/));

const MASCULINOS = new Set(('luis jose juan miguel angel jesus carlos jorge manuel david daniel rafael raul oscar hector victor ' +
  'ruben ivan adrian javier martin andres cesar julian joel saul abel noe efrain isaac israel samuel gabriel ismael josue ' +
  'moises emmanuel ulises felipe enrique jaime salvador esteban abraham aaron alan brian kevin axel omar edgar edwin ' +
  'guillermo benjamin cristian christian elias hugo uriel rey leonel marcos matias nicolas sebastian simon tomas vicente ' +
  'xavier agustin irving jonathan erick eric isai jair joaquin alfonso ramon rodolfo adolfo gerardo leonardo armando ' +
  'mauricio sergio rigoberto heriberto gilberto alberto roberto ricardo eduardo alejandro fernando francisco pedro pablo ' +
  'arturo antonio ignacio gustavo gonzalo hilario homero horacio jacinto julio mario marco octavio orlando osvaldo ' +
  'reynaldo rolando santiago teodoro valentin wilfrido apolinar baltazar crisoforo eliseo eusebio fidel genaro gregorio ' +
  'hermilo isidro lazaro lorenzo maximino nestor obed pascual porfirio raymundo raimundo refugio silvestre ' +
  'eleazar elier emiliano ezequiel fabian fausto feliciano filiberto german hernan humberto jeronimo lucio').split(/\s+/));

const AMBIGUOS = new Set('guadalupe rosario trinidad cruz rene yael ariel andrea'.split(/\s+/));
// "andrea" es casi siempre mujer en México, pero se deja aquí solo si se quiere neutral: la quitamos abajo
AMBIGUOS.delete('andrea');

const MASC_EN_A = new Set('luca joshua josua bautista garcia'.split(/\s+/));

// Devuelve 'f', 'm' o '' (no seguro)
function generoDeNombre(primer) {
  const n = quitarAcentos(primer).toLowerCase().replace(/[^a-z]/g, '');
  if (!n) return '';
  if (AMBIGUOS.has(n)) return '';
  if (FEMENINOS.has(n)) return 'f';
  if (MASCULINOS.has(n)) return 'm';
  if (MASC_EN_A.has(n)) return 'm';
  if (n.endsWith('a')) return 'f';
  if (n.endsWith('o')) return 'm';
  return '';
}

function primerNombre(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/);
  if (!partes[0]) return '';
  // "Ma." / "Ma" -> María
  if (/^ma\.?$/i.test(partes[0]) && partes[1]) return 'María';
  return partes[0];
}

// Teléfono de México
function telefonoMx(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (!d) return '';
  // Formato de WhatsApp en México que usa FunnelChat: 521 + 10 dígitos
  if (d.length === 10) d = '521' + d;
  else if (d.length === 12 && d.startsWith('52')) d = '521' + d.slice(2);
  return d;
}

async function stripeGet(path, key) {
  const r = await fetch(STRIPE_API + path, { headers: { Authorization: 'Bearer ' + key } });
  if (!r.ok) throw new Error('Stripe ' + r.status);
  return r.json();
}

module.exports = {
  ESTRATEGA_LINKS, nombreDeSesion, generoDeNombre, primerNombre, telefonoMx, stripeGet, tituloNombre,
};
