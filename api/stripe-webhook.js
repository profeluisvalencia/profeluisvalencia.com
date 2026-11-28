// POST /api/stripe-webhook  (destino de Stripe, evento checkout.session.completed)
// Verifica la firma de Stripe y pasa nombre, teléfono y correo del comprador a FunnelChat.
const crypto = require('crypto');
const { ESTRATEGA_LINKS, nombreDeSesion, primerNombre, generoDeNombre, telefonoMx } = require('./_lib');

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    req.on('data', c => partes.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });
}

function firmaValida(raw, header, secreto) {
  if (!header || !secreto) return false;
  const items = String(header).split(',').map(x => x.split('='));
  const t = (items.find(([k]) => k === 't') || [])[1];
  const firmas = items.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !firmas.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const esperada = crypto.createHmac('sha256', secreto).update(t + '.' + raw.toString('utf8')).digest('hex');
  return firmas.some(f => {
    const a = Buffer.from(f, 'hex'), b = Buffer.from(esperada, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Método no permitido');
  const raw = await leerCuerpo(req);
  if (!firmaValida(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) {
    return res.status(400).send('Firma inválida');
  }
  let ev;
  try { ev = JSON.parse(raw.toString('utf8')); } catch (e) { return res.status(400).send('JSON inválido'); }

  if (ev.type !== 'checkout.session.completed') return res.status(200).json({ ignorado: ev.type });
  const s = ev.data && ev.data.object || {};
  if (s.payment_status !== 'paid') return res.status(200).json({ ignorado: 'no pagado' });
  if (ESTRATEGA_LINKS.length && !ESTRATEGA_LINKS.includes(s.payment_link)) {
    return res.status(200).json({ ignorado: 'otro producto' });
  }

  const cd = s.customer_details || {};
  const nombre = nombreDeSesion(s);
  const primer = primerNombre(nombre);
  const datos = {
    telefono: telefonoMx(cd.phone),
    nombre,
    primer_nombre: primer,
    genero: generoDeNombre(primer),
    correo: cd.email || '',
    producto: 'Estratega PH 2027',
    metodo: 'tarjeta_stripe',
    monto: (s.amount_total || 0) / 100,
    moneda: String(s.currency || '').toUpperCase(),
    sesion: s.id,
  };

  const url = process.env.FUNNELCHAT_WEBHOOK_URL;
  if (!url || !datos.telefono) {
    console.log('Venta Stripe sin envío a FunnelChat', { tieneUrl: !!url, tieneTelefono: !!datos.telefono, sesion: s.id });
    return res.status(200).json({ ok: false, motivo: !url ? 'sin url' : 'sin telefono' });
  }
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
    if (!r.ok) throw new Error('FunnelChat ' + r.status);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.log('Error enviando a FunnelChat', e.message, s.id);
    return res.status(500).send('Reintentar');  // Stripe reintenta solo
  }
};

module.exports.config = { api: { bodyParser: false } };
