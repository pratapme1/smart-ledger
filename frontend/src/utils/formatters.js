/**
 * Format a number as currency (INR by default)
 */
export const formatCurrency = (amount, currency = 'INR') => {
  if (typeof amount !== 'number') {
    amount = Number(amount) || 0;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format a date string to locale date
 */
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format a percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (typeof value !== 'number') {
    value = Number(value) || 0;
  }
  return `${value.toFixed(decimals)}%`;
}; 