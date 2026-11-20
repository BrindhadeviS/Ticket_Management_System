const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.code === '23505') {
    const msg = String(err.constraint || "").includes("email")
      ? 'Email already exists'
      : 'This record already exists. Please try again.';
    return res.status(409).json({ message: msg });
  }
  if (err.code === '23503')
    return res.status(409).json({ message: 'Cannot complete: record is linked to other data' });
  if (err.code === '22P02' || err.code === '22P01')
    return res.status(400).json({ message: 'Invalid input value' });

  res.status(err.status || 500).json({ message: err.message || 'Server error' });
};

export default errorHandler;