function requireSyncKey(req, res, next) {
  const configured = process.env.SYNC_API_KEY;
  if (!configured) {
    return res.status(503).json({
      success: false,
      message: 'Remote sync is disabled. Set SYNC_API_KEY on the server.',
    });
  }

  const headerKey = req.headers['x-sync-key'];
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const provided = headerKey || bearer;

  if (!provided || provided !== configured) {
    return res.status(401).json({ success: false, message: 'Invalid sync key' });
  }

  req.syncUserId = process.env.SYNC_USER_ID || null;
  next();
}

module.exports = { requireSyncKey };
