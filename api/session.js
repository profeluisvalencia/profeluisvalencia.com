// GET /api/session?session_id=cs_live_...
// Lo usa /bienvenido para saludar por su nombre. Solo lee Stripe (clave restringida de solo lectura).
const { nombreDeSesion, generoDeNombre, primerNombre, stripeGet } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const id = String((req.query && req.query.session_id) || '');
  const key = process.env.STRIPE_RESTRICTED_KEY;
  if (!key) return res.status(200).json({ ok: false, motivo: 'sin_llave' });
  if (!/^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(id)) return res.status(200).json({ ok: false, motivo: 'id' });
  try {
    const s = await stripeGet('/checkout/sessions/' + encodeURIComponent(id), key);
    if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') {
      return res.status(200).json({ ok: false, pendiente: true });
    }
    const nombre = nombreDeSesion(s);
    const primer = primerNombre(nombre);
    return res.status(200).json({
      ok: true,
      nombre,
      primer,
      genero: generoDeNombre(primer),
      correo: (s.customer_details && s.customer_details.email) || '',
    });
  } catch (e) {
    return res.status(200).json({ ok: false, motivo: String(e.message || '').slice(0, 40) });
  }
};
