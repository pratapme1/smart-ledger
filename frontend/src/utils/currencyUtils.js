// src/utils/currencyUtils.js
export const getCurrencySymbol = (currencyCode) => {
    const currencySymbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      INR: '₹',
      KRW: '₩',
      BRL: 'R$',
      THB: '฿',
      RUB: '₽',
      CAD: 'C$',
      AUD: 'A$',
      MXN: 'Mex$',
      SGD: 'S$',
      // Add more as needed
    };
  
    return currencySymbols[currencyCode] || '$'; // Default to $ if not found
  };