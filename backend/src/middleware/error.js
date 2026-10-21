export function notFound(req, res) { res.status(404).json({ message: 'Route not found' }); }
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body contains invalid JSON' });
  if (err?.code === 11000) return res.status(409).json({ message: 'A record with this unique value already exists' });
  if (err?.name === 'ValidationError') return res.status(400).json({ message: 'Submitted data did not pass validation' });
  if (err?.message === 'Origin not allowed by CORS') return res.status(403).json({ message: 'Request origin is not allowed' });
  console.error(err);
  return res.status(err.status && err.status < 500 ? err.status : 500).json({ message: err.status && err.status < 500 ? err.message : 'Internal server error' });
}
