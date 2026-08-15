// backend/src/utils/response.js

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const created = (res, data, message = 'Created successfully') =>
  success(res, data, message, 201);

const paginated = (res, data, pagination, message = 'Success') =>
  res.status(200).json({ success: true, message, data, pagination });

const error = (res, message = 'An error occurred', statusCode = 400, errors = null) =>
  res.status(statusCode).json({ success: false, message, ...(errors && { errors }) });

const notFound = (res, message = 'Resource not found') =>
  error(res, message, 404);

const forbidden = (res, message = 'Access denied') =>
  error(res, message, 403);

const unauthorized = (res, message = 'Unauthorized') =>
  error(res, message, 401);

const successResponse = (res, dataOrResult, message = 'Success', statusCode = 200) => {
  if (dataOrResult && dataOrResult.pagination) {
    return paginated(res, dataOrResult.data, dataOrResult.pagination, message);
  }
  return success(res, dataOrResult, message, statusCode);
};

module.exports = { success, created, paginated, error, notFound, forbidden, unauthorized, successResponse };
