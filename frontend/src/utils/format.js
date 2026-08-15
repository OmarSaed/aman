import { format } from 'date-fns';

export const formatCurrency = (value, currency = 'USD', rate = 1) => {
  if (value == null) return '';
  const converted = Number(value) * Number(rate);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(converted);
  } catch (e) {
    // Fallback if currency code is invalid
    return `${currency} ${converted.toLocaleString()}`;
  }
};

export const formatDate = (dateString, formatStr = 'PP') => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), formatStr);
  } catch (error) {
    return dateString;
  }
};
